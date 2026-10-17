const { ChannelType, ChannelFlags, PermissionFlagsBits, Routes } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const scopes = ['active', 'archived_public', 'archived_private', 'joined_archived_private'];
const parentTypes = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);

const getThreadsDefinition = {
  type: 'function',
  function: {
    name: 'get_server_threads',
    description: 'Discover existing threads or forum/media posts under one parent channel in the configured Hellbot server. Active lists include only threads the bot can access. Private scopes work only in text channels; archived_private requires Manage Threads, while joined_archived_private lists only private threads the bot has joined. Use returned thread IDs with message tools. This never creates, joins, or unarchives a thread. Follow hasMore and nextOffset or nextBefore to continue.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'Exact parent text, announcement, forum, or media channel ID.' },
        scope: { type: 'string', enum: scopes, description: 'Defaults to active. Archived scopes are separate lists and never fall back to another scope.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum threads to return. Defaults to 50.' },
        offset: { type: 'integer', minimum: 0, description: 'Active scope only: skip this many threads in descending thread ID order. Defaults to 0. The list is refreshed each call and can change between pages.' },
        before: { type: 'string', description: 'Archived scopes only: copy nextBefore exactly. Use an ISO 8601 archive timestamp for archived_public/archived_private, or a thread ID for joined_archived_private.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const createThreadDefinition = {
  type: 'function',
  function: {
    name: 'create_server_thread',
    description: 'Create a thread in a text/announcement channel or a post in a forum channel. Only create what the owner explicitly requested. For an existing message, supply message_id; announcement channels require it. Standalone text threads default to public. Forum posts require content and may require tag_ids from get_server_channel. Use the returned thread ID with message tools. A successful result confirms creation; do not create it again.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', pattern: '^[0-9]{17,20}$', description: 'Parent text, announcement, or forum channel ID from get_server_channels.' },
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'Thread name or forum post title.' },
        message_id: { type: 'string', pattern: '^[0-9]{17,20}$', description: 'Optional source message in the parent text/announcement channel. Source-message threads are public.' },
        type: { type: 'string', enum: ['public', 'private'], description: 'Defaults to public. Private threads require a text channel and cannot use message_id.' },
        content: { type: 'string', minLength: 1, maxLength: 2000, description: 'Required initial message for a forum post. For text/announcement threads, send messages separately after creation.' },
        tag_ids: { type: 'array', items: { type: 'string', pattern: '^[0-9]{17,20}$' }, uniqueItems: true, maxItems: 5, description: 'Forum tags from get_server_channel. Omit for text/announcement threads.' },
        invitable: { type: 'boolean', description: 'Private threads only: whether non-moderators can invite other members.' },
        auto_archive_minutes: { type: 'integer', enum: [60, 1440, 4320, 10080], description: 'Optional inactivity duration before archiving. Defaults to the parent channel setting.' },
        slowmode_seconds: { type: 'integer', minimum: 0, maximum: 21600, description: 'Optional message slowmode in the new thread.' },
      },
      required: ['channel_id', 'name'],
      additionalProperties: false,
    },
  },
};

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function validateArchiveTimestamp(value) {
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  if (typeof value !== 'string' || !timestampPattern.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('before must be an ISO 8601 archive timestamp with a timezone for this scope.');
  }
  const datePart = value.slice(0, 10);
  if (new Date(`${datePart}T00:00:00.000Z`).toISOString().slice(0, 10) !== datePart) {
    throw new Error('before must contain a valid calendar date.');
  }
}

function serializeThread(thread) {
  const metadata = thread.thread_metadata || {
    archived: thread.archived,
    locked: thread.locked,
    create_timestamp: thread.createdAt?.toISOString(),
    archive_timestamp: thread.archivedAt?.toISOString(),
    auto_archive_duration: thread.autoArchiveDuration,
  };
  return {
    id: thread.id,
    name: thread.name,
    parentId: thread.parent_id ?? thread.parentId,
    type: ChannelType[thread.type] || thread.type,
    ownerId: thread.owner_id ?? thread.ownerId ?? null,
    archived: metadata.archived ?? null,
    locked: metadata.locked ?? null,
    createdAt: metadata.create_timestamp || null,
    archiveTimestamp: metadata.archive_timestamp || null,
    autoArchiveMinutes: metadata.auto_archive_duration ?? null,
    messageCount: thread.message_count ?? thread.messageCount ?? null,
    memberCount: thread.member_count ?? thread.memberCount ?? null,
    lastMessageId: thread.last_message_id ?? thread.lastMessageId ?? null,
    appliedTagIds: thread.applied_tags ?? thread.appliedTags ?? [],
  };
}

function createServerThreadToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const toolHandlers = {
    create_server_thread: async ({ channel_id: channelId, name, message_id: messageId, type = 'public', content, tag_ids: tagIds, invitable, auto_archive_minutes: autoArchiveMinutes, slowmode_seconds: slowmodeSeconds } = {}) => {
      assertAuthorizedServer(guild, user);
      if (!isSnowflake(channelId)) throw new Error('Provide a valid parent channel ID.');
      if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Thread name must contain 1 to 100 characters.');
      if (!['public', 'private'].includes(type)) throw new Error('type must be public or private.');
      if (messageId !== undefined && !isSnowflake(messageId)) throw new Error('Provide a valid source message ID.');
      if (content !== undefined && (typeof content !== 'string' || !content.trim() || content.length > 2000)) throw new Error('Forum content must contain 1 to 2000 characters.');
      if (tagIds !== undefined && (!Array.isArray(tagIds) || tagIds.length > 5 || tagIds.some((id) => !isSnowflake(id)) || new Set(tagIds).size !== tagIds.length)) throw new Error('Provide up to five unique forum tag IDs.');
      if (invitable !== undefined && typeof invitable !== 'boolean') throw new Error('invitable must be true or false.');
      if (autoArchiveMinutes !== undefined && ![60, 1440, 4320, 10080].includes(autoArchiveMinutes)) throw new Error('Use an auto-archive duration of 60, 1440, 4320, or 10080 minutes.');
      if (slowmodeSeconds !== undefined && (!Number.isInteger(slowmodeSeconds) || slowmodeSeconds < 0 || slowmodeSeconds > 21600)) throw new Error('Slowmode must be from 0 to 21600 seconds.');

      const parent = await guild.channels.fetch(channelId, { force: true });
      if (!parent || ![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(parent.type)) throw new Error('Select a text, announcement, or forum parent channel.');
      const isForum = parent.type === ChannelType.GuildForum;
      if (isForum) {
        if (!content) throw new Error('Forum posts require initial message content.');
        if (messageId !== undefined || type === 'private' || invitable !== undefined) throw new Error('Forum posts cannot use message_id, private type, or invitable.');
      } else {
        if (content !== undefined || tagIds !== undefined) throw new Error('content and tag_ids are only supported for forum posts. Send thread messages separately after creation.');
        if (type === 'private' && (parent.type !== ChannelType.GuildText || messageId !== undefined)) throw new Error('Private threads require a text channel and cannot be attached to a message.');
        if (invitable !== undefined && type !== 'private') throw new Error('invitable is only supported for private threads.');
        if (parent.type === ChannelType.GuildAnnouncement && !messageId) throw new Error('Announcement threads require a source message_id.');
      }

      const botMember = await guild.members.fetchMe({ force: true });
      const permissions = parent.permissionsFor(botMember);
      const createPermission = isForum ? PermissionFlagsBits.SendMessages
        : type === 'private' ? PermissionFlagsBits.CreatePrivateThreads : PermissionFlagsBits.CreatePublicThreads;
      if (!permissions?.has([PermissionFlagsBits.ViewChannel, createPermission])) throw new Error('The bot needs View Channel and the corresponding Send Messages or Create Threads permission in this parent.');
      if (isForum) {
        const tags = tagIds ?? [];
        if (parent.flags.has(ChannelFlags.RequireTag) && !tags.length) throw new Error('This forum requires at least one tag from get_server_channel.');
        for (const tagId of tags) {
          const tag = parent.availableTags.find((candidate) => candidate.id === tagId);
          if (!tag) throw new Error(`Tag ${tagId} does not belong to this forum.`);
          if (tag.moderated && !permissions.has(PermissionFlagsBits.ManageThreads)) throw new Error('The bot needs Manage Threads permission to apply a moderated forum tag.');
        }
      }

      const options = {
        name: name.trim(),
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
        ...(autoArchiveMinutes !== undefined ? { autoArchiveDuration: autoArchiveMinutes } : {}),
        ...(slowmodeSeconds !== undefined ? { rateLimitPerUser: slowmodeSeconds } : {}),
      };
      if (isForum) {
        options.message = { content, allowedMentions: { parse: [], repliedUser: false } };
        options.appliedTags = tagIds ?? [];
      } else if (messageId) {
        options.startMessage = messageId;
      } else {
        options.type = type === 'private' ? ChannelType.PrivateThread : ChannelType.PublicThread;
        if (invitable !== undefined) options.invitable = invitable;
      }
      const created = await parent.threads.create(options);
      // The creation response is authoritative; a failed read-back must not prompt duplicate creation.
      return { success: true, thread: serializeThread(created) };
    },

    get_server_threads: async ({ channel_id: channelId, scope = 'active', limit = 50, offset, before } = {}) => {
      assertAuthorizedServer(guild, user);
      if (!isSnowflake(channelId)) throw new Error('Provide a valid parent channel ID.');
      if (!scopes.includes(scope)) throw new Error(`scope must be one of: ${scopes.join(', ')}.`);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('limit must be an integer from 1 to 100.');
      if (offset !== undefined && (scope !== 'active' || !Number.isSafeInteger(offset) || offset < 0)) {
        throw new Error('offset must be a non-negative integer and is supported only for active threads.');
      }
      if (before !== undefined) {
        if (scope === 'active') throw new Error('before is supported only for archived threads; use offset for active threads.');
        if (scope === 'joined_archived_private') {
          if (!isSnowflake(before)) throw new Error('before must be a thread ID for joined_archived_private.');
        } else {
          validateArchiveTimestamp(before);
        }
      }

      const parent = await guild.channels.fetch(channelId, { force: true });
      if (!parent || parent.guildId !== guild.id || !parentTypes.has(parent.type)) {
        throw new Error('Parent must be a text, announcement, forum, or media channel in the configured Hellbot server.');
      }
      const isPrivateScope = scope === 'archived_private' || scope === 'joined_archived_private';
      if (isPrivateScope && parent.type !== ChannelType.GuildText) {
        throw new Error(`${scope} is unavailable: private threads are supported only in text channels.`);
      }
      const botMember = await guild.members.fetchMe({ force: true });
      const permissions = parent.permissionsFor(botMember);
      const requiredPermissions = [PermissionFlagsBits.ViewChannel];
      if (scope !== 'active') requiredPermissions.push(PermissionFlagsBits.ReadMessageHistory);
      if (scope === 'archived_private') requiredPermissions.push(PermissionFlagsBits.ManageThreads);
      if (!permissions?.has(requiredPermissions)) {
        const names = ['View Channel'];
        if (scope !== 'active') names.push('Read Message History');
        if (scope === 'archived_private') names.push('Manage Threads');
        throw new Error(`${scope} is inaccessible: the bot needs ${names.join(' and ')} in the parent channel.`);
      }

      if (scope === 'active') {
        const result = await guild.client.rest.get(Routes.guildActiveThreads(guild.id));
        const threads = result.threads.filter((thread) => thread.parent_id === channelId)
          .sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0));
        const start = offset ?? 0;
        const page = threads.slice(start, start + limit);
        const hasMore = start + page.length < threads.length;
        return {
          success: true, channelId, scope, count: page.length, threads: page.map(serializeThread), totalAccessible: threads.length,
          hasMore, nextOffset: hasMore ? start + page.length : null,
          coverage: 'Current active threads accessible to the bot; private threads may be excluded by membership or permissions. Refreshed each call, so pages can shift.',
        };
      }

      const route = scope === 'joined_archived_private'
        ? Routes.channelJoinedArchivedThreads(channelId)
        : Routes.channelThreads(channelId, scope === 'archived_private' ? 'private' : 'public');
      const query = new URLSearchParams({ limit: String(limit) });
      if (before !== undefined) query.set('before', before);
      let result;
      try {
        // Keep native archive timestamps intact for pagination, including sub-millisecond precision.
        result = await guild.client.rest.get(route, { query });
      } catch (error) {
        if (error.status === 403 || error.code === 50001 || error.code === 50013) {
          throw new Error(`${scope} is inaccessible to the bot in this parent channel. No alternate scope was fetched.`);
        }
        throw error;
      }
      const lastThread = result.threads.at(-1);
      const nextBefore = scope === 'joined_archived_private'
        ? lastThread?.id
        : lastThread?.thread_metadata?.archive_timestamp;
      if (result.has_more && (!nextBefore || nextBefore === before)) {
        throw new Error('Discord did not return a valid cursor for the remaining archived threads.');
      }
      return {
        success: true, channelId, scope, count: result.threads.length, threads: result.threads.map(serializeThread), hasMore: result.has_more,
        nextBefore: result.has_more ? nextBefore : null,
        coverage: scope === 'joined_archived_private' ? 'Archived private threads the bot has joined.' : 'Requested archived scope only.',
      };
    },
  };

  return { toolDefinitions: [getThreadsDefinition, createThreadDefinition], toolHandlers };
}

module.exports = { createServerThreadToolSet };
