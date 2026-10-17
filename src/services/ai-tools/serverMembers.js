const { PermissionFlagsBits } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const searchMembersDefinition = {
  type: 'function',
  function: {
    name: 'search_server_members',
    description: 'Search members in the configured Hellbot server by username or server nickname. Use the returned user ID with get_server_member or edit_server_member.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 100, description: 'Text to match against member usernames and server nicknames.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum number of matching members. Defaults to 25.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
};

const getMemberDefinition = {
  type: 'function',
  function: {
    name: 'get_server_member',
    description: 'Get current account, server nickname, and assigned-role details for one member by exact Discord user ID.',
    parameters: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The exact Discord user ID returned by search_server_members.' },
      },
      required: ['user_id'],
      additionalProperties: false,
    },
  },
};

const editMemberDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_member',
    description: 'Change a member\'s server nickname and/or assigned roles in the configured Hellbot server. Only make changes explicitly requested by the user. Add/remove exact role IDs obtained from get_server_member or get_server_roles. After editing, call get_server_member to verify.',
    parameters: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The exact Discord user ID of the member to edit.' },
        nickname: { type: 'string', maxLength: 32, description: 'New server nickname. Use an empty string to clear the nickname.' },
        role_ids_to_add: { type: 'array', items: { type: 'string' }, uniqueItems: true, maxItems: 25, description: 'Exact role IDs to assign.' },
        role_ids_to_remove: { type: 'array', items: { type: 'string' }, uniqueItems: true, maxItems: 25, description: 'Exact role IDs to remove from the member.' },
      },
      required: ['user_id'],
      additionalProperties: false,
    },
  },
};

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function serializeMember(member) {
  return {
    userId: member.id,
    username: member.user.username,
    globalName: member.user.globalName,
    bot: member.user.bot,
    nickname: member.nickname,
    joinedAt: member.joinedAt?.toISOString() || null,
    communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() || null,
    roles: member.roles.cache
      .filter((role) => role.id !== member.guild.id)
      .map((role) => ({ id: role.id, name: role.name })),
  };
}

function createServerMemberToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  const toolHandlers = {
    search_server_members: async ({ query, limit = 25 } = {}) => {
      ensureAccess();
      if (typeof query !== 'string' || !query.trim() || query.length > 100
        || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Provide a search query of 1 to 100 characters and a limit from 1 to 100.');
      }
      const matches = await guild.members.search({ query: query.trim(), limit });
      return {
        success: true,
        count: matches.size,
        members: [...matches.values()].map(serializeMember),
      };
    },

    get_server_member: async ({ user_id: userId } = {}) => {
      ensureAccess();
      if (!isSnowflake(userId)) throw new Error('Provide a valid Discord user ID.');
      const member = await guild.members.fetch({ user: userId, force: true });
      if (!member) throw new Error('Member not found in the configured Hellbot server.');
      return { success: true, member: serializeMember(member) };
    },

    edit_server_member: async ({ user_id: userId, ...requestedChanges } = {}) => {
      ensureAccess();
      if (!isSnowflake(userId)) throw new Error('Provide a valid Discord user ID.');

      const hasNickname = Object.prototype.hasOwnProperty.call(requestedChanges, 'nickname');
      const roleIdsToAdd = requestedChanges.role_ids_to_add ?? [];
      const roleIdsToRemove = requestedChanges.role_ids_to_remove ?? [];
      if (hasNickname && (typeof requestedChanges.nickname !== 'string' || requestedChanges.nickname.length > 32)) {
        throw new Error('Server nickname must be a string of at most 32 characters.');
      }
      if (!Array.isArray(roleIdsToAdd) || !Array.isArray(roleIdsToRemove)
        || roleIdsToAdd.length > 25 || roleIdsToRemove.length > 25
        || [...roleIdsToAdd, ...roleIdsToRemove].some((roleId) => !isSnowflake(roleId))) {
        throw new Error('Provide up to 25 valid role IDs in each add/remove list.');
      }
      if (roleIdsToAdd.some((roleId) => roleIdsToRemove.includes(roleId))) {
        throw new Error('A role cannot be added and removed in the same request.');
      }
      const changesRoles = roleIdsToAdd.length > 0 || roleIdsToRemove.length > 0;
      if (!hasNickname && !changesRoles) throw new Error('Provide a nickname or at least one role change.');

      const botMember = guild.members.me || await guild.members.fetchMe();
      if (hasNickname && !botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        throw new Error('The bot needs Manage Nicknames permission to edit a server nickname.');
      }
      if (changesRoles && !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to assign or remove roles.');
      }

      const target = await guild.members.fetch({ user: userId, force: true });
      if (!target) throw new Error('Member not found in the configured Hellbot server.');
      if (!target.manageable) throw new Error('The bot cannot manage this member because of Discord role hierarchy or server ownership.');

      const rolesToAdd = [];
      const rolesToRemove = [];
      for (const roleId of roleIdsToAdd) {
        const role = await guild.roles.fetch(roleId);
        if (!role || role.id === guild.id || role.managed) throw new Error(`Role ${roleId} cannot be assigned.`);
        if (!role.editable) throw new Error(`The bot cannot assign role ${role.name}; check Manage Roles and role hierarchy.`);
        rolesToAdd.push(role);
      }
      for (const roleId of roleIdsToRemove) {
        const role = await guild.roles.fetch(roleId);
        if (!role || role.id === guild.id || role.managed) throw new Error(`Role ${roleId} cannot be removed.`);
        if (!role.editable) throw new Error(`The bot cannot remove role ${role.name}; check Manage Roles and role hierarchy.`);
        rolesToRemove.push(role);
      }

      const reason = `Requested by Hellbot owner ${user.id} through AI server tools`;
      if (changesRoles) {
        const finalRoleIds = new Set(target.roles.cache.keys());
        for (const role of rolesToAdd) finalRoleIds.add(role.id);
        for (const role of rolesToRemove) finalRoleIds.delete(role.id);
        await target.roles.set([...finalRoleIds], reason);
      }
      if (hasNickname) await target.edit({ nick: requestedChanges.nickname || null, reason });

      const verifiedMember = await guild.members.fetch({ user: userId, force: true });
      if (!verifiedMember) throw new Error('Member was edited, but Discord did not return it for verification.');
      return { success: true, member: serializeMember(verifiedMember) };
    },
  };

  return { toolDefinitions: [searchMembersDefinition, getMemberDefinition, editMemberDefinition], toolHandlers };
}

module.exports = { createServerMemberToolSet };
