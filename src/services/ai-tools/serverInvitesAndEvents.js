const {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const eventEntityTypes = {
  stage: GuildScheduledEventEntityType.StageInstance,
  voice: GuildScheduledEventEntityType.Voice,
  external: GuildScheduledEventEntityType.External,
};

const inviteTools = [
  {
    type: 'function',
    function: {
      name: 'get_server_invites',
      description: 'List active invites for the configured Hellbot server. Requires Manage Server permission for the bot.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_server_invite',
      description: 'Create a Discord invite for a text, announcement, forum, voice, or stage channel. Only create an invite when explicitly requested.',
      parameters: {
        type: 'object',
        properties: {
          channel_id: { type: 'string', description: 'Exact channel ID for the invite landing channel.' },
          max_age_seconds: { type: 'integer', minimum: 0, maximum: 604800, description: 'Invite lifetime in seconds; 0 means never expires. Defaults to 86400.' },
          max_uses: { type: 'integer', minimum: 0, maximum: 100, description: 'Maximum uses; 0 means unlimited. Defaults to 0.' },
          temporary: { type: 'boolean', description: 'Whether invitees are temporarily members until they receive a role.' },
        },
        required: ['channel_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_server_invite',
      description: 'Revoke an active server invite by its exact code. This cannot be undone. Only revoke when explicitly requested.',
      parameters: {
        type: 'object',
        properties: { code: { type: 'string', minLength: 2, maxLength: 32, description: 'Invite code, not the full URL.' } },
        required: ['code'],
        additionalProperties: false,
      },
    },
  },
];

const scheduledEventTools = [
  {
    type: 'function',
    function: {
      name: 'get_server_scheduled_events',
      description: 'List scheduled events in the configured Hellbot server.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_server_scheduled_event',
      description: 'Create a guild-only scheduled Discord event. Use entity_type external with a location, or voice/stage with a compatible channel ID. Start time must be in the future.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          start_time: { type: 'string', description: 'ISO 8601 date/time in UTC, for example 2026-12-01T18:00:00Z.' },
          end_time: { type: 'string', description: 'Required for external events; ISO 8601 date/time later than start_time.' },
          entity_type: { type: 'string', enum: Object.keys(eventEntityTypes) },
          channel_id: { type: 'string', description: 'Required for voice and stage events; must match entity_type.' },
          location: { type: 'string', minLength: 1, maxLength: 100, description: 'Required for external events.' },
        },
        required: ['name', 'start_time', 'entity_type'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_server_scheduled_event',
      description: 'Edit a scheduled event by exact event ID. Provide only fields the owner asked to change. Use get_server_scheduled_events first and verify after editing.',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'Exact event ID.' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          start_time: { type: 'string', description: 'New ISO 8601 date/time in UTC.' },
          end_time: { type: 'string', description: 'New ISO 8601 date/time, or an empty string to clear it where Discord allows.' },
          channel_id: { type: 'string', description: 'New voice/stage channel ID.' },
          location: { type: 'string', minLength: 1, maxLength: 100, description: 'New external event location.' },
          status: { type: 'string', enum: ['scheduled', 'active', 'completed', 'canceled'] },
        },
        required: ['event_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_server_scheduled_event',
      description: 'Permanently delete a scheduled event by exact event ID. Only delete when explicitly requested.',
      parameters: {
        type: 'object',
        properties: { event_id: { type: 'string', description: 'Exact event ID from get_server_scheduled_events.' } },
        required: ['event_id'],
        additionalProperties: false,
      },
    },
  },
];

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function serializeInvite(invite) {
  return {
    code: invite.code,
    url: invite.url,
    channelId: invite.channelId,
    channelName: invite.channel?.name || null,
    inviterId: invite.inviterId || null,
    uses: invite.uses ?? 0,
    maxUses: invite.maxUses,
    maxAgeSeconds: invite.maxAge,
    temporary: invite.temporary,
    expiresAt: invite.expiresAt?.toISOString() || null,
  };
}

function serializeScheduledEvent(event) {
  return {
    id: event.id,
    name: event.name,
    description: event.description || null,
    status: GuildScheduledEventStatus[event.status] || event.status,
    entityType: GuildScheduledEventEntityType[event.entityType] || event.entityType,
    channelId: event.channelId || null,
    location: event.entityMetadata?.location || null,
    startAt: event.scheduledStartAt?.toISOString() || null,
    endAt: event.scheduledEndAt?.toISOString() || null,
    url: event.url,
  };
}

function parseDate(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be an ISO 8601 date/time string.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO 8601 date/time.`);
  return date;
}

function createServerInvitesAndEventsToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  async function requirePermission(permission, label) {
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(permission)) throw new Error(`The bot needs ${label} permission for this action.`);
    return botMember;
  }

  async function resolveEventLocation(entityType, channelId, location) {
    if (entityType === 'external') {
      if (typeof location !== 'string' || !location.trim() || location.length > 100) {
        throw new Error('External events need a location of 1 to 100 characters.');
      }
      if (channelId !== undefined) throw new Error('External events cannot specify a voice channel.');
      return { entityMetadata: { location: location.trim() } };
    }
    if (location !== undefined) throw new Error('Only external events use a location.');
    if (!isSnowflake(channelId)) throw new Error('Voice and stage events require a valid channel ID.');
    const eventChannel = await guild.channels.fetch(channelId);
    const expectedType = entityType === 'stage' ? ChannelType.GuildStageVoice : ChannelType.GuildVoice;
    if (!eventChannel || eventChannel.type !== expectedType) {
      throw new Error(`The event channel must be a ${entityType} channel in the configured server.`);
    }
    return { channel: eventChannel };
  }

  function serializeEventInput({ name, description, start_time: startTime, end_time: endTime, entity_type: entityType, channel_id: channelId, location }) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Event name must contain 1 to 100 characters.');
    if (description !== undefined && (typeof description !== 'string' || description.length > 1000)) throw new Error('Event description must be at most 1000 characters.');
    if (!Object.prototype.hasOwnProperty.call(eventEntityTypes, entityType)) throw new Error('entity_type must be stage, voice, or external.');
    const start = parseDate(startTime, 'start_time');
    if (start.getTime() <= Date.now()) throw new Error('Scheduled event start time must be in the future.');
    const changes = {
      name: name.trim(),
      scheduledStartTime: start,
      entityType: eventEntityTypes[entityType],
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      ...(description !== undefined ? { description } : {}),
    };
    if (endTime !== undefined) {
      const end = parseDate(endTime, 'end_time');
      if (end.getTime() <= start.getTime()) throw new Error('end_time must be later than start_time.');
      changes.scheduledEndTime = end;
    }
    if (entityType === 'external' && !changes.scheduledEndTime) throw new Error('External events require end_time.');
    return { changes, entityType, channelId, location };
  }

  const toolHandlers = {
    get_server_invites: async () => {
      ensureAccess();
      await requirePermission(PermissionFlagsBits.ManageGuild, 'Manage Server');
      const invites = await guild.invites.fetch();
      return { success: true, count: invites.size, invites: [...invites.values()].map(serializeInvite) };
    },

    create_server_invite: async ({ channel_id: channelId, max_age_seconds: maxAge = 86400, max_uses: maxUses = 0, temporary = false } = {}) => {
      ensureAccess();
      if (!isSnowflake(channelId)) throw new Error('Provide a valid channel ID.');
      if (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 604800) throw new Error('max_age_seconds must be from 0 to 604800.');
      if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 100) throw new Error('max_uses must be from 0 to 100.');
      if (typeof temporary !== 'boolean') throw new Error('temporary must be true or false.');
      const inviteChannel = await guild.channels.fetch(channelId);
      const inviteChannelTypes = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildVoice, ChannelType.GuildStageVoice];
      if (!inviteChannel || !inviteChannelTypes.includes(inviteChannel.type)) throw new Error('Select a text, announcement, voice, or stage channel in this server.');
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!inviteChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.CreateInstantInvite)) {
        throw new Error('The bot needs Create Invite permission in the selected channel.');
      }
      const invite = await inviteChannel.createInvite({
        maxAge,
        maxUses,
        temporary,
        unique: true,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verifiedInvite = await guild.invites.fetch(invite.code);
      if (!verifiedInvite) throw new Error('Invite was created, but Discord did not return it for verification.');
      return { success: true, invite: serializeInvite(verifiedInvite) };
    },

    delete_server_invite: async ({ code } = {}) => {
      ensureAccess();
      if (typeof code !== 'string' || !/^[\w-]{2,32}$/.test(code)) throw new Error('Provide a valid invite code.');
      await requirePermission(PermissionFlagsBits.ManageGuild, 'Manage Server');
      const invites = await guild.invites.fetch({ cache: false });
      if (!invites.has(code)) throw new Error('Invite not found in the configured server.');
      await guild.invites.delete(code, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedInvites = await guild.invites.fetch();
      if (verifiedInvites.has(code)) throw new Error('Invite deletion was requested, but Discord still returned it.');
      return { success: true, deleted: true, code };
    },

    get_server_scheduled_events: async () => {
      ensureAccess();
      await requirePermission(PermissionFlagsBits.ManageEvents, 'Manage Events');
      const events = await guild.scheduledEvents.fetch();
      return { success: true, count: events.size, events: [...events.values()].map(serializeScheduledEvent) };
    },

    create_server_scheduled_event: async (input = {}) => {
      ensureAccess();
      await requirePermission(PermissionFlagsBits.ManageEvents, 'Manage Events');
      const { changes, entityType, channelId, location } = serializeEventInput(input);
      Object.assign(changes, await resolveEventLocation(entityType, channelId, location));
      const created = await guild.scheduledEvents.create({
        ...changes,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verified = await guild.scheduledEvents.fetch({ guildScheduledEvent: created.id, force: true });
      if (!verified) throw new Error('Event was created, but Discord did not return it for verification.');
      return { success: true, event: serializeScheduledEvent(verified) };
    },

    edit_server_scheduled_event: async ({ event_id: eventId, ...requestedChanges } = {}) => {
      ensureAccess();
      if (!isSnowflake(eventId)) throw new Error('Provide a valid event ID.');
      await requirePermission(PermissionFlagsBits.ManageEvents, 'Manage Events');
      const target = await guild.scheduledEvents.fetch({ guildScheduledEvent: eventId, force: true });
      if (!target) throw new Error('Scheduled event not found in the configured server.');
      const changes = {};
      if (Object.hasOwn(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || !requestedChanges.name.trim() || requestedChanges.name.length > 100) throw new Error('Event name must contain 1 to 100 characters.');
        changes.name = requestedChanges.name.trim();
      }
      if (Object.hasOwn(requestedChanges, 'description')) {
        if (typeof requestedChanges.description !== 'string' || requestedChanges.description.length > 1000) throw new Error('Event description must be at most 1000 characters.');
        changes.description = requestedChanges.description;
      }
      if (Object.hasOwn(requestedChanges, 'start_time')) {
        const start = parseDate(requestedChanges.start_time, 'start_time');
        if (start.getTime() <= Date.now()) throw new Error('Scheduled event start time must be in the future.');
        changes.scheduledStartTime = start;
      }
      if (Object.hasOwn(requestedChanges, 'end_time')) {
        changes.scheduledEndTime = requestedChanges.end_time === '' ? null : parseDate(requestedChanges.end_time, 'end_time');
      }
      if (Object.hasOwn(changes, 'scheduledStartTime') || Object.hasOwn(changes, 'scheduledEndTime')) {
        const start = changes.scheduledStartTime || target.scheduledStartAt;
        const end = Object.hasOwn(changes, 'scheduledEndTime') ? changes.scheduledEndTime : target.scheduledEndAt;
        if (end && end <= start) throw new Error('end_time must be later than start_time.');
      }
      if (Object.hasOwn(requestedChanges, 'channel_id') || Object.hasOwn(requestedChanges, 'location')) {
        const entityType = target.entityType === GuildScheduledEventEntityType.External ? 'external'
          : target.entityType === GuildScheduledEventEntityType.StageInstance ? 'stage' : 'voice';
        Object.assign(changes, await resolveEventLocation(entityType, requestedChanges.channel_id, requestedChanges.location));
      }
      if (Object.hasOwn(requestedChanges, 'status')) {
        const statusMap = {
          scheduled: GuildScheduledEventStatus.Scheduled,
          active: GuildScheduledEventStatus.Active,
          completed: GuildScheduledEventStatus.Completed,
          canceled: GuildScheduledEventStatus.Canceled,
        };
        if (!Object.hasOwn(statusMap, requestedChanges.status)) throw new Error('status must be scheduled, active, completed, or canceled.');
        changes.status = statusMap[requestedChanges.status];
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one event field to edit.');
      const edited = await guild.scheduledEvents.edit(eventId, {
        ...changes,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verified = await guild.scheduledEvents.fetch({ guildScheduledEvent: eventId, force: true });
      if (!verified || verified.name !== edited.name) throw new Error('Event was edited, but Discord did not return the updated event.');
      return { success: true, event: serializeScheduledEvent(verified) };
    },

    delete_server_scheduled_event: async ({ event_id: eventId } = {}) => {
      ensureAccess();
      if (!isSnowflake(eventId)) throw new Error('Provide a valid event ID.');
      await requirePermission(PermissionFlagsBits.ManageEvents, 'Manage Events');
      const target = await guild.scheduledEvents.fetch({ guildScheduledEvent: eventId, force: true });
      if (!target) throw new Error('Scheduled event not found in the configured server.');
      const previousEvent = serializeScheduledEvent(target);
      await guild.scheduledEvents.delete(eventId);
      const verifiedEvents = await guild.scheduledEvents.fetch();
      if (verifiedEvents.has(eventId)) throw new Error('Event deletion was requested, but Discord still returned the event.');
      return { success: true, deleted: true, event: previousEvent };
    },
  };

  return { toolDefinitions: [...inviteTools, ...scheduledEventTools], toolHandlers };
}

module.exports = { createServerInvitesAndEventsToolSet };
