const { AuditLogEvent, PermissionFlagsBits, SnowflakeUtil } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const auditEventTypes = Object.values(AuditLogEvent).filter((value) => typeof value === 'number');

const auditLogDefinition = {
  type: 'function',
  function: {
    name: 'get_server_audit_log',
    description: 'Read Discord audit log entries using native user, action-type, and entry-ID filters. Logs cover moderation and server changes, not voluntary member departures, and are retained for 45 days. Results are newest first, or oldest first when after is supplied. If pagination.mayHaveMore is true, continue with nextBefore or nextAfter and the same filters. Requires View Audit Log.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum recent audit entries to return. Defaults to 50.' },
        days: { type: 'integer', minimum: 1, maximum: 45, description: 'Only return entries from the last 1 to 45 days. Defaults to 7.' },
        user_id: { type: 'string', pattern: '^[0-9]{17,20}$', description: 'Only actions performed by this user or bot ID, not actions targeting that user.' },
        action_type: { type: 'integer', enum: auditEventTypes, description: 'Discord audit event number, for example ChannelUpdate = 11, MemberKick = 20, MemberBanAdd = 22, MemberRoleUpdate = 25, RoleUpdate = 31, MessageDelete = 72.' },
        before: { type: 'string', pattern: '^(0|[0-9]{17,20})$', description: 'Only entries with IDs less than this audit entry ID. Use pagination.nextBefore to continue toward older entries.' },
        after: { type: 'string', pattern: '^(0|[0-9]{17,20})$', description: 'Only entries with IDs greater than this audit entry ID. Use pagination.nextAfter to continue toward newer entries. Use "0" to start with the oldest retained entries.' },
      },
      additionalProperties: false,
    },
  },
};

const serverActivityDefinition = {
  type: 'function',
  function: {
    name: 'get_server_activity',
    description: 'Summarize current member count, recent joins among scanned current members, and recent audit-log activity. Discord does not expose voluntary leave history. Check memberScan.scanComplete before treating join counts as complete, and auditLog.pagination.mayHaveMore before treating audit counts as complete. Use get_server_audit_log to continue incomplete audit results.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 45, description: 'Activity period in days. Defaults to 7.' },
        member_scan_limit: { type: 'integer', minimum: 1000, maximum: 10000, description: 'Maximum current members to scan for join dates, rounded up to pages of 1000. Defaults to 5000.' },
      },
      additionalProperties: false,
    },
  },
};

function serializeAuditEntry(entry) {
  return {
    id: entry.id,
    action: AuditLogEvent[entry.action] || `Unknown (${entry.action})`,
    actionType: entry.actionType,
    targetId: entry.targetId || null,
    targetName: entry.target?.name || entry.target?.user?.username || null,
    executorId: entry.executorId || null,
    executorName: entry.executor?.tag || entry.executor?.username || null,
    reason: entry.reason || null,
    createdAt: entry.createdAt?.toISOString() || null,
    changes: entry.changes,
  };
}

function createServerAuditToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAuditAccess = async () => {
    assertAuthorizedServer(guild, user);
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      throw new Error('The bot needs View Audit Log permission to read server activity.');
    }
  };
  const fetchRecentAuditEntries = async (limit, days, filters = {}) => {
    const ascending = filters.after !== undefined;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const query = { limit, ...filters };
    if (ascending) {
      // Skip entries outside the days window without excluding its first millisecond.
      const cutoffCursor = SnowflakeUtil.generate({ timestamp: cutoff, increment: 0n, workerId: 0n, processId: 0n }) - 1n;
      if (BigInt(query.after) < cutoffCursor) query.after = cutoffCursor.toString();
    }
    const auditLogs = await guild.fetchAuditLogs(query);
    const fetchedEntries = [...auditLogs.entries.values()].sort((left, right) => {
      const comparison = BigInt(left.id) < BigInt(right.id) ? -1 : 1;
      return ascending ? comparison : -comparison;
    });
    const entries = fetchedEntries.filter((entry) => entry.createdTimestamp >= cutoff);
    // A full page may have successors; older pages cannot re-enter the days window.
    const mayHaveMore = fetchedEntries.length === limit && (ascending || entries.length === fetchedEntries.length);
    const nextCursor = mayHaveMore ? fetchedEntries[fetchedEntries.length - 1].id : null;
    return {
      entries,
      pagination: {
        order: ascending ? 'oldest_first' : 'newest_first',
        entriesFetched: fetchedEntries.length,
        mayHaveMore,
        nextBefore: ascending ? null : nextCursor,
        nextAfter: ascending ? nextCursor : null,
      },
    };
  };

  const toolHandlers = {
    get_server_audit_log: async ({ limit = 50, days = 7, user_id: userId, action_type: actionType, before, after } = {}) => {
      await ensureAuditAccess();
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Audit log limit must be from 1 to 100.');
      if (!Number.isInteger(days) || days < 1 || days > 45) throw new Error('Days must be from 1 to 45.');
      if (userId !== undefined && (typeof userId !== 'string' || !/^\d{17,20}$/.test(userId))) {
        throw new Error('Provide a valid Discord user ID.');
      }
      if (actionType !== undefined && !auditEventTypes.includes(actionType)) throw new Error('Provide a valid Discord audit event number.');
      for (const cursor of [before, after]) {
        if (cursor !== undefined && (typeof cursor !== 'string' || !/^(0|\d{17,20})$/.test(cursor))) {
          throw new Error('Audit log cursors must be entry IDs or "0".');
        }
      }
      const { entries, pagination } = await fetchRecentAuditEntries(limit, days, {
        ...(userId !== undefined ? { user: userId } : {}),
        ...(actionType !== undefined ? { type: actionType } : {}),
        ...(before !== undefined ? { before } : {}),
        ...(after !== undefined ? { after } : {}),
      });
      return { success: true, days, count: entries.length, entries: entries.map(serializeAuditEntry), pagination };
    },

    get_server_activity: async ({ days = 7, member_scan_limit: requestedScanLimit = 5000 } = {}) => {
      await ensureAuditAccess();
      if (!Number.isInteger(days) || days < 1 || days > 45) throw new Error('Days must be from 1 to 45.');
      if (!Number.isInteger(requestedScanLimit) || requestedScanLimit < 1000 || requestedScanLimit > 10000) {
        throw new Error('Member scan limit must be from 1000 to 10000.');
      }

      const pageSize = 1000;
      const scanLimit = Math.ceil(requestedScanLimit / pageSize) * pageSize;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const refreshedGuild = await guild.fetch(true);
      let after;
      let scannedCount = 0;
      let scanComplete = false;
      const recentJoins = [];
      let recentJoinCount = 0;

      while (scannedCount < scanLimit) {
        const page = await guild.members.list({ after, limit: Math.min(pageSize, scanLimit - scannedCount), cache: false });
        if (page.size === 0) {
          scanComplete = true;
          break;
        }
        scannedCount += page.size;
        for (const member of page.values()) {
          if (member.joinedTimestamp && member.joinedTimestamp >= cutoff) {
            recentJoinCount += 1;
            recentJoins.push({
              userId: member.id,
              username: member.user.username,
              joinedAt: member.joinedAt.toISOString(),
            });
          }
        }
        if (page.size < pageSize) {
          scanComplete = true;
          break;
        }
        after = page.last().id;
      }
      if (scannedCount >= refreshedGuild.memberCount) scanComplete = true;

      const { entries: auditEntries, pagination: auditPagination } = await fetchRecentAuditEntries(100, days);
      const auditCountsByAction = {};
      const removals = [];
      for (const entry of auditEntries) {
        const action = AuditLogEvent[entry.action] || `Unknown (${entry.action})`;
        auditCountsByAction[action] = (auditCountsByAction[action] || 0) + 1;
        if ([AuditLogEvent.MemberKick, AuditLogEvent.MemberPrune, AuditLogEvent.MemberBanAdd].includes(entry.action)) {
          removals.push(serializeAuditEntry(entry));
        }
      }

      return {
        success: true,
        periodDays: days,
        currentMemberCount: refreshedGuild.memberCount,
        recentJoinCount,
        recentJoins: recentJoins
          .sort((left, right) => Date.parse(right.joinedAt) - Date.parse(left.joinedAt))
          .slice(0, 100),
        recentJoinsTruncated: recentJoinCount > 100,
        memberScan: { scannedCount, requestedLimit: requestedScanLimit, scanComplete },
        auditLog: {
          entriesScanned: auditEntries.length,
          pagination: auditPagination,
          countsByAction: auditCountsByAction,
          removals,
          voluntaryLeavesAvailable: false,
        },
      };
    },
  };

  return { toolDefinitions: [auditLogDefinition, serverActivityDefinition], toolHandlers };
}

module.exports = { createServerAuditToolSet };
