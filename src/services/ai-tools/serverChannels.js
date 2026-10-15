const { ChannelType, OverwriteType, PermissionFlagsBits } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const channelTypes = {
  text: ChannelType.GuildText,
  announcement: ChannelType.GuildAnnouncement,
  voice: ChannelType.GuildVoice,
  category: ChannelType.GuildCategory,
};
const permissionNames = Object.keys(PermissionFlagsBits).filter((name) => Number.isNaN(Number(name)));
const permissionNameSet = new Set(permissionNames);

const createChannelDefinition = {
  type: 'function',
  function: {
    name: 'create_server_channel',
    description: 'Create a text, announcement, voice, or category channel in the configured Hellbot server. Only create a channel explicitly requested by the user. Use get_server_channels to find a parent category ID. After creation, inspect the returned channel details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'New channel name.' },
        type: { type: 'string', enum: Object.keys(channelTypes), description: 'Channel type: text, announcement, voice, or category.' },
        parent_id: { type: 'string', description: 'Optional ID of a category to contain the new channel.' },
        topic: { type: 'string', maxLength: 1024, description: 'Optional topic for text or announcement channels.' },
        nsfw: { type: 'boolean', description: 'Whether the text or announcement channel is marked NSFW.' },
        slowmode_seconds: { type: 'integer', minimum: 0, maximum: 21600, description: 'Optional slowmode in seconds for text or announcement channels.' },
      },
      required: ['name', 'type'],
      additionalProperties: false,
    },
  },
};

const listChannelsDefinition = {
  type: 'function',
  function: {
    name: 'get_server_channels',
    description: 'List channels in the configured Hellbot server. Use this first to find a channel ID before inspecting or editing a channel. For large results, use offset to continue.',
    parameters: {
      type: 'object',
      properties: {
        offset: { type: 'integer', minimum: 0, description: 'Number of channels to skip. Defaults to 0.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum channels to return. Defaults to 50.' },
      },
      additionalProperties: false,
    },
  },
};

const getChannelDefinition = {
  type: 'function',
  function: {
    name: 'get_server_channel',
    description: 'Get the current details and permission overwrites for one channel in the configured Hellbot server by its exact channel ID. Use after editing to verify the saved state.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID from get_server_channels.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const editChannelDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_channel',
    description: 'Edit a channel in the configured Hellbot server by exact ID. Only change fields the user explicitly requested. Supported fields: name, topic, slowmode_seconds (0-21600), and nsfw. After a successful edit, call get_server_channel to independently verify the result.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID from get_server_channels.' },
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'New channel name.' },
        topic: { type: 'string', maxLength: 1024, description: 'New topic or description for a text channel.' },
        slowmode_seconds: { type: 'integer', minimum: 0, maximum: 21600, description: 'Text channel slowmode in seconds.' },
        nsfw: { type: 'boolean', description: 'Whether this channel is marked NSFW.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const editChannelPermissionsDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_channel_permissions',
    description: 'Set channel permission overwrites for one role or member. Use allow, deny, or inherit arrays with exact Discord permission names. For visibility, set ViewChannel to allow or deny. Unspecified permissions stay unchanged. Use get_server_channel to inspect overwrites and verify the result.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID.' },
        target_type: { type: 'string', enum: ['role', 'member'], description: 'Whether target_id identifies a server role or member.' },
        target_id: { type: 'string', description: 'The exact role or user ID to configure.' },
        allow: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 53, description: 'Permissions to explicitly allow for this target.' },
        deny: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 53, description: 'Permissions to explicitly deny for this target.' },
        inherit: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 53, description: 'Permissions to reset to inherit/default for this target.' },
      },
      required: ['channel_id', 'target_type', 'target_id'],
      additionalProperties: false,
    },
  },
};

const syncChannelPermissionsDefinition = {
  type: 'function',
  function: {
    name: 'sync_server_channel_permissions',
    description: 'Copy permission overwrites from a channel\'s parent category. This replaces that channel\'s current overwrites with the category\'s overwrites. Use get_server_channel to verify.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID to sync with its parent category.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const removeChannelOverwriteDefinition = {
  type: 'function',
  function: {
    name: 'remove_server_channel_permission_overwrite',
    description: 'Remove every channel-specific permission overwrite for one role or member, making permissions inherit from the server and parent category. Use get_server_channel to verify.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID.' },
        target_type: { type: 'string', enum: ['role', 'member'], description: 'Whether target_id identifies a server role or member.' },
        target_id: { type: 'string', description: 'The exact role or user ID whose overwrite should be removed.' },
      },
      required: ['channel_id', 'target_type', 'target_id'],
      additionalProperties: false,
    },
  },
};

function serializeChannel(channel) {
  const permissionOverwrites = channel.permissionOverwrites?.cache || [];
  return {
    id: channel.id,
    name: channel.name,
    type: ChannelType[channel.type] || channel.type,
    parentId: channel.parentId || null,
    position: channel.position,
    ...(typeof channel.topic === 'string' ? { topic: channel.topic } : {}),
    ...(typeof channel.rateLimitPerUser === 'number' ? { slowmodeSeconds: channel.rateLimitPerUser } : {}),
    ...(typeof channel.nsfw === 'boolean' ? { nsfw: channel.nsfw } : {}),
    permissionOverwrites: [...permissionOverwrites.values()].map((overwrite) => {
      const isRole = overwrite.type === OverwriteType.Role;
      const target = isRole
        ? channel.guild.roles.cache.get(overwrite.id)
        : channel.guild.members.cache.get(overwrite.id);
      return {
        targetId: overwrite.id,
        targetType: isRole ? 'role' : 'member',
        targetName: target ? (isRole ? target.name : target.user.username) : null,
        allow: overwrite.allow.toArray(),
        deny: overwrite.deny.toArray(),
      };
    }),
  };
}

function createServerChannelToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) {
    return { toolDefinitions: [], toolHandlers: {} };
  }

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  const toolHandlers = {
    create_server_channel: async ({ name, type, parent_id: parentId, topic, nsfw, slowmode_seconds: slowmodeSeconds } = {}) => {
      ensureAccess();
      if (typeof name !== 'string' || !name.trim() || name.length > 100) {
        throw new Error('Channel name must contain 1 to 100 characters.');
      }
      if (!Object.prototype.hasOwnProperty.call(channelTypes, type)) {
        throw new Error('Channel type must be text, announcement, voice, or category.');
      }
      if (parentId !== undefined && (typeof parentId !== 'string' || !/^\d{17,20}$/.test(parentId))) {
        throw new Error('Provide a valid parent category ID.');
      }
      const isTextChannel = type === 'text' || type === 'announcement';
      if (topic !== undefined && (!isTextChannel || typeof topic !== 'string' || topic.length > 1024)) {
        throw new Error('Topic can only be set on a text or announcement channel and must be at most 1024 characters.');
      }
      if (nsfw !== undefined && (!isTextChannel || typeof nsfw !== 'boolean')) {
        throw new Error('NSFW can only be set on a text or announcement channel.');
      }
      if (slowmodeSeconds !== undefined
        && (!isTextChannel || !Number.isInteger(slowmodeSeconds) || slowmodeSeconds < 0 || slowmodeSeconds > 21600)) {
        throw new Error('Slowmode can only be set on a text or announcement channel and must be 0 to 21600 seconds.');
      }
      if (type === 'category' && parentId) throw new Error('A category cannot be created inside another category.');

      let parent = null;
      if (parentId) {
        parent = await guild.channels.fetch(parentId);
        if (!parent || parent.type !== ChannelType.GuildCategory) throw new Error('Parent channel must be a category in the configured server.');
      }

      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('The bot needs Manage Channels permission to create a channel.');
      }

      const createdChannel = await guild.channels.create({
        name: name.trim(),
        type: channelTypes[type],
        ...(parent ? { parent } : {}),
        ...(topic !== undefined ? { topic } : {}),
        ...(nsfw !== undefined ? { nsfw } : {}),
        ...(slowmodeSeconds !== undefined ? { rateLimitPerUser: slowmodeSeconds } : {}),
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verifiedChannel = await guild.channels.fetch(createdChannel.id, { force: true });
      if (!verifiedChannel) throw new Error('Channel was created, but Discord did not return it for verification.');
      return { success: true, channel: serializeChannel(verifiedChannel) };
    },

    get_server_channels: async ({ offset = 0, limit = 50 } = {}) => {
      ensureAccess();
      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Use an offset of 0 or greater and a limit from 1 to 100.');
      }
      const channels = await guild.channels.fetch();
      const sortedChannels = [...channels.values()].sort((left, right) =>
        left.rawPosition - right.rawPosition || left.id.localeCompare(right.id)
      );
      return {
        success: true,
        total: sortedChannels.length,
        offset,
        channels: sortedChannels.slice(offset, offset + limit).map(serializeChannel),
      };
    },

    get_server_channel: async ({ channel_id: channelId } = {}) => {
      ensureAccess();
      if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) {
        throw new Error('Provide a valid Discord channel ID.');
      }
      const target = await guild.channels.fetch(channelId, { force: true });
      if (!target) throw new Error('Channel not found in the configured Hellbot server.');
      return { success: true, channel: serializeChannel(target) };
    },

    edit_server_channel_permissions: async ({ channel_id: channelId, target_type: targetType, target_id: targetId, allow = [], deny = [], inherit = [] } = {}) => {
      ensureAccess();
      if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) throw new Error('Provide a valid Discord channel ID.');
      if (targetType !== 'role' && targetType !== 'member') throw new Error('target_type must be role or member.');
      if (typeof targetId !== 'string' || !/^\d{17,20}$/.test(targetId)) throw new Error('Provide a valid role or member ID.');
      const permissionLists = [allow, deny, inherit];
      if (permissionLists.some((list) => !Array.isArray(list) || list.length > 53 || list.some((permission) => !permissionNameSet.has(permission)))) {
        throw new Error('Use valid Discord permission names, with up to 53 entries in each list.');
      }
      const allPermissions = permissionLists.flat();
      if (new Set(allPermissions).size !== allPermissions.length) {
        throw new Error('A permission can appear in only one of allow, deny, or inherit.');
      }
      if (allPermissions.length === 0) throw new Error('Provide at least one permission to allow, deny, or inherit.');

      const targetChannel = await guild.channels.fetch(channelId);
      if (!targetChannel) throw new Error('Channel not found in the configured Hellbot server.');
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to edit channel permission overwrites.');
      }

      let overwriteTarget;
      if (targetType === 'role') {
        overwriteTarget = await guild.roles.fetch(targetId);
        if (!overwriteTarget) throw new Error('Role not found in the configured Hellbot server.');
        if (overwriteTarget.id !== guild.id && !overwriteTarget.editable) {
          throw new Error('The bot cannot manage this role; check Manage Roles and role hierarchy.');
        }
      } else {
        overwriteTarget = await guild.members.fetch({ user: targetId, force: true });
        if (!overwriteTarget) throw new Error('Member not found in the configured Hellbot server.');
      }

      const overwrite = {};
      for (const permission of allow) overwrite[permission] = true;
      for (const permission of deny) overwrite[permission] = false;
      for (const permission of inherit) overwrite[permission] = null;
      await targetChannel.permissionOverwrites.edit(
        overwriteTarget,
        overwrite,
        { reason: `Requested by Hellbot owner ${user.id} through AI server tools` }
      );
      const verifiedChannel = await guild.channels.fetch(channelId, { force: true });
      if (!verifiedChannel) throw new Error('Channel permissions were edited, but Discord did not return the channel for verification.');
      return { success: true, channel: serializeChannel(verifiedChannel) };
    },

    remove_server_channel_permission_overwrite: async ({ channel_id: channelId, target_type: targetType, target_id: targetId } = {}) => {
      ensureAccess();
      if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) throw new Error('Provide a valid Discord channel ID.');
      if (targetType !== 'role' && targetType !== 'member') throw new Error('target_type must be role or member.');
      if (typeof targetId !== 'string' || !/^\d{17,20}$/.test(targetId)) throw new Error('Provide a valid role or member ID.');

      const targetChannel = await guild.channels.fetch(channelId);
      if (!targetChannel) throw new Error('Channel not found in the configured Hellbot server.');
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to remove channel permission overwrites.');
      }

      let overwriteTarget;
      if (targetType === 'role') {
        overwriteTarget = await guild.roles.fetch(targetId);
        if (!overwriteTarget) throw new Error('Role not found in the configured Hellbot server.');
        if (overwriteTarget.id !== guild.id && !overwriteTarget.editable) {
          throw new Error('The bot cannot manage this role; check Manage Roles and role hierarchy.');
        }
      } else {
        overwriteTarget = await guild.members.fetch({ user: targetId, force: true });
        if (!overwriteTarget) throw new Error('Member not found in the configured Hellbot server.');
      }

      await targetChannel.permissionOverwrites.delete(
        overwriteTarget,
        `Requested by Hellbot owner ${user.id} through AI server tools`
      );
      const verifiedChannel = await guild.channels.fetch(channelId, { force: true });
      if (!verifiedChannel) throw new Error('Channel overwrite was removed, but Discord did not return the channel for verification.');
      return { success: true, channel: serializeChannel(verifiedChannel) };
    },

    sync_server_channel_permissions: async ({ channel_id: channelId } = {}) => {
      ensureAccess();
      if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) throw new Error('Provide a valid Discord channel ID.');
      const targetChannel = await guild.channels.fetch(channelId);
      if (!targetChannel) throw new Error('Channel not found in the configured Hellbot server.');
      if (!targetChannel.parentId) throw new Error('Channel does not have a parent category to sync with.');
      const parent = await guild.channels.fetch(targetChannel.parentId);
      if (!parent || parent.type !== ChannelType.GuildCategory) throw new Error('Channel parent is not a valid category.');
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to sync channel permission overwrites.');
      }
      await targetChannel.lockPermissions();
      const verifiedChannel = await guild.channels.fetch(channelId, { force: true });
      if (!verifiedChannel) throw new Error('Channel permissions were synced, but Discord did not return the channel for verification.');
      return { success: true, channel: serializeChannel(verifiedChannel) };
    },

    edit_server_channel: async ({ channel_id: channelId, ...requestedChanges } = {}) => {
      ensureAccess();
      if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) {
        throw new Error('Provide a valid Discord channel ID.');
      }

      const changes = {};
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || !requestedChanges.name.trim() || requestedChanges.name.length > 100) {
          throw new Error('Channel name must contain 1 to 100 characters.');
        }
        changes.name = requestedChanges.name.trim();
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'topic')) {
        if (typeof requestedChanges.topic !== 'string' || requestedChanges.topic.length > 1024) {
          throw new Error('Channel topic must be a string of at most 1024 characters.');
        }
        changes.topic = requestedChanges.topic;
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'slowmode_seconds')) {
        const seconds = requestedChanges.slowmode_seconds;
        if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
          throw new Error('Slowmode must be an integer from 0 to 21600 seconds.');
        }
        changes.rateLimitPerUser = seconds;
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'nsfw')) {
        if (typeof requestedChanges.nsfw !== 'boolean') throw new Error('NSFW must be true or false.');
        changes.nsfw = requestedChanges.nsfw;
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one channel field to edit.');

      const target = await guild.channels.fetch(channelId);
      if (!target) throw new Error('Channel not found in the configured Hellbot server.');
      if (Object.prototype.hasOwnProperty.call(changes, 'topic') && !target.isTextBased()) {
        throw new Error('Only text channels support a topic.');
      }
      if (Object.prototype.hasOwnProperty.call(changes, 'rateLimitPerUser')
        && (target.type !== ChannelType.GuildText && target.type !== ChannelType.GuildAnnouncement)) {
        throw new Error('Slowmode can only be edited on text and announcement channels.');
      }

      await target.edit(changes, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedChannel = await guild.channels.fetch(channelId, { force: true });
      if (!verifiedChannel) throw new Error('Channel was edited, but Discord did not return it for verification.');
      return { success: true, channel: serializeChannel(verifiedChannel) };
    },
  };

  return {
    toolDefinitions: [
      createChannelDefinition,
      listChannelsDefinition,
      getChannelDefinition,
      editChannelDefinition,
      editChannelPermissionsDefinition,
      syncChannelPermissionsDefinition,
      removeChannelOverwriteDefinition,
    ],
    toolHandlers,
  };
}

module.exports = { createServerChannelToolSet };
