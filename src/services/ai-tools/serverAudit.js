const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const auditLogDefinition = {
  type: 'function',
  function: {
    name: 'get_server_audit_log',
    description: 'Read recent Discord audit log entries from the configured Hellbot server. Discord audit logs cover moderation and server changes, not voluntary member departures. Requires the bot to have View Audit Log.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum recent audit entries to return. Defaults to 50.' },
        days: { type: 'integer', minimum: 1, maximum: 45, description: 'Only return entries from the last 1 to 45 days. Defaults to 7.' },
      },
      additionalProperties: false,
    },
  },
};

const serverActivityDefinition = {
  type: 'function',
  function: {
    name: 'get_server_activity',
    description: 'Summarize current member count, recent joins among scanned current members, and recent audit-log activity. Discord does not expose voluntary leave history. The member list scan is bounded; check memberScan.scanComplete before treating join counts as complete.',
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
  const fetchRecentAuditEntries = async (limit, days) => {
    const auditLogs = await guild.fetchAuditLogs({ limit });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return [...auditLogs.entries.values()].filter((entry) => entry.createdTimestamp >= cutoff);
  };

  const toolHandlers = {
    get_server_audit_log: async ({ limit = 50, days = 7 } = {}) => {
      await ensureAuditAccess();
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Audit log limit must be from 1 to 100.');
      if (!Number.isInteger(days) || days < 1 || days > 45) throw new Error('Days must be from 1 to 45.');
      const entries = await fetchRecentAuditEntries(limit, days);
      return { success: true, days, count: entries.length, entries: entries.map(serializeAuditEntry) };
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

      const auditEntries = await fetchRecentAuditEntries(100, days);
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
