const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./access');

const permissionNames = Object.keys(PermissionFlagsBits).filter((name) => Number.isNaN(Number(name)));
const permissionNameSet = new Set(permissionNames);

const createRoleDefinition = {
  type: 'function',
  function: {
    name: 'create_server_role',
    description: 'Create a role in the configured Hellbot server. Only create a role the user explicitly requested. Optional permission names grant server-wide permissions. After creation, call get_server_role to verify.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'New role name.' },
        color: { type: 'string', pattern: '^(#[0-9a-fA-F]{6}|[0-9a-fA-F]{6}|default)$', description: 'Optional six-digit hex color such as #fc9803, or "default".' },
        hoist: { type: 'boolean', description: 'Whether to display members with this role separately in the member list.' },
        mentionable: { type: 'boolean', description: 'Whether members can mention this role.' },
        permissions: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 53, description: 'Optional exact Discord permission names to grant. These are server-wide role permissions.' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
};

const listRolesDefinition = {
  type: 'function',
  function: {
    name: 'get_server_roles',
    description: 'List roles in the configured Hellbot server. Use this first to find a role ID before inspecting or editing a role.',
    parameters: {
      type: 'object',
      properties: {
        offset: { type: 'integer', minimum: 0, description: 'Number of roles to skip. Defaults to 0.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum roles to return. Defaults to 50.' },
      },
      additionalProperties: false,
    },
  },
};

const getRoleDefinition = {
  type: 'function',
  function: {
    name: 'get_server_role',
    description: 'Get the current details and permissions for one role in the configured Hellbot server by exact role ID.',
    parameters: {
      type: 'object',
      properties: {
        role_id: { type: 'string', description: 'The exact Discord role ID from get_server_roles.' },
      },
      required: ['role_id'],
      additionalProperties: false,
    },
  },
};

const editRoleDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_role',
    description: 'Edit a role in the configured Hellbot server by exact ID. Only make changes explicitly requested by the user. You may set its name, color, hoist, mentionable, and add or remove named permissions. Permission changes are server-wide. After editing, call get_server_role to verify the result.',
    parameters: {
      type: 'object',
      properties: {
        role_id: { type: 'string', description: 'The exact Discord role ID from get_server_roles.' },
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'New role name.' },
        color: { type: 'string', pattern: '^(#[0-9a-fA-F]{6}|[0-9a-fA-F]{6}|default)$', description: 'New hex color such as #fc9803, or "default" to remove the role color.' },
        hoist: { type: 'boolean', description: 'Whether to display members with this role separately in the member list.' },
        mentionable: { type: 'boolean', description: 'Whether members can mention this role.' },
        permissions_to_add: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 50, description: 'Exact Discord permission names to grant to this role. This changes server-wide role permissions.' },
        permissions_to_remove: { type: 'array', items: { type: 'string', enum: permissionNames }, uniqueItems: true, maxItems: 50, description: 'Exact Discord permission names to remove from this role. This changes server-wide role permissions.' },
      },
      required: ['role_id'],
      additionalProperties: false,
    },
  },
};

const deleteRoleDefinition = {
  type: 'function',
  function: {
    name: 'delete_server_role',
    description: 'Permanently delete a role from the configured Hellbot server. This removes it from every member and cannot be undone. Only delete when the owner explicitly requests deletion of that role.',
    parameters: {
      type: 'object',
      properties: {
        role_id: { type: 'string', description: 'The exact role ID from get_server_roles.' },
      },
      required: ['role_id'],
      additionalProperties: false,
    },
  },
};

function serializeRole(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.hexColor,
    position: role.position,
    hoist: role.hoist,
    mentionable: role.mentionable,
    managed: role.managed,
    editable: role.editable,
    permissions: role.permissions.toArray(),
  };
}

function createServerRoleToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  const toolHandlers = {
    create_server_role: async ({ name, color, hoist, mentionable, permissions = [] } = {}) => {
      ensureAccess();
      if (typeof name !== 'string' || !name.trim() || name.length > 100) {
        throw new Error('Role name must contain 1 to 100 characters.');
      }
      if (color !== undefined && (typeof color !== 'string' || !/^(#[0-9a-fA-F]{6}|[0-9a-fA-F]{6}|default)$/.test(color))) {
        throw new Error('Role color must be a six-digit hex value or "default".');
      }
      if (hoist !== undefined && typeof hoist !== 'boolean') throw new Error('hoist must be true or false.');
      if (mentionable !== undefined && typeof mentionable !== 'boolean') throw new Error('mentionable must be true or false.');
      if (!Array.isArray(permissions) || permissions.length > 53 || permissions.some((permission) => !permissionNameSet.has(permission))) {
        throw new Error('Use up to 53 valid Discord permission names.');
      }

      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to create a role.');
      }

      let permissionBits = 0n;
      for (const permission of permissions) permissionBits |= PermissionFlagsBits[permission];
      const createdRole = await guild.roles.create({
        name: name.trim(),
        ...(color !== undefined ? { color: color.toLowerCase() === 'default' ? 0 : color } : {}),
        ...(hoist !== undefined ? { hoist } : {}),
        ...(mentionable !== undefined ? { mentionable } : {}),
        ...(permissions.length ? { permissions: new PermissionsBitField(permissionBits) } : {}),
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verifiedRole = await guild.roles.fetch(createdRole.id, { force: true });
      if (!verifiedRole) throw new Error('Role was created, but Discord did not return it for verification.');
      return { success: true, role: serializeRole(verifiedRole) };
    },

    get_server_roles: async ({ offset = 0, limit = 50 } = {}) => {
      ensureAccess();
      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Use an offset of 0 or greater and a limit from 1 to 100.');
      }
      const roles = await guild.roles.fetch();
      const sortedRoles = [...roles.values()].sort((left, right) => right.position - left.position || left.id.localeCompare(right.id));
      return {
        success: true,
        total: sortedRoles.length,
        offset,
        roles: sortedRoles.slice(offset, offset + limit).map(serializeRole),
      };
    },

    get_server_role: async ({ role_id: roleId } = {}) => {
      ensureAccess();
      if (typeof roleId !== 'string' || !/^\d{17,20}$/.test(roleId)) throw new Error('Provide a valid Discord role ID.');
      const role = await guild.roles.fetch(roleId);
      if (!role) throw new Error('Role not found in the configured Hellbot server.');
      return { success: true, role: serializeRole(role) };
    },

    edit_server_role: async ({ role_id: roleId, ...requestedChanges } = {}) => {
      ensureAccess();
      if (typeof roleId !== 'string' || !/^\d{17,20}$/.test(roleId)) throw new Error('Provide a valid Discord role ID.');

      const changes = {};
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || !requestedChanges.name.trim() || requestedChanges.name.length > 100) {
          throw new Error('Role name must contain 1 to 100 characters.');
        }
        changes.name = requestedChanges.name.trim();
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'color')) {
        if (typeof requestedChanges.color !== 'string' || !/^(#[0-9a-fA-F]{6}|[0-9a-fA-F]{6}|default)$/.test(requestedChanges.color)) {
          throw new Error('Role color must be a six-digit hex value or "default".');
        }
        changes.color = requestedChanges.color.toLowerCase() === 'default' ? 0 : requestedChanges.color;
      }
      for (const field of ['hoist', 'mentionable']) {
        if (Object.prototype.hasOwnProperty.call(requestedChanges, field)) {
          if (typeof requestedChanges[field] !== 'boolean') throw new Error(`${field} must be true or false.`);
          changes[field] = requestedChanges[field];
        }
      }

      const permissionsToAdd = requestedChanges.permissions_to_add ?? [];
      const permissionsToRemove = requestedChanges.permissions_to_remove ?? [];
      if (!Array.isArray(permissionsToAdd) || !Array.isArray(permissionsToRemove)
        || permissionsToAdd.length > 50 || permissionsToRemove.length > 50
        || [...permissionsToAdd, ...permissionsToRemove].some((permission) => !permissionNameSet.has(permission))) {
        throw new Error('Use up to 50 valid Discord permission names per add/remove list.');
      }
      if (permissionsToAdd.some((permission) => permissionsToRemove.includes(permission))) {
        throw new Error('A permission cannot be added and removed in the same request.');
      }
      if (permissionsToAdd.length || permissionsToRemove.length) {
        const currentRole = await guild.roles.fetch(roleId);
        if (!currentRole) throw new Error('Role not found in the configured Hellbot server.');
        let finalBits = currentRole.permissions.bitfield;
        for (const permission of permissionsToAdd) finalBits |= PermissionFlagsBits[permission];
        for (const permission of permissionsToRemove) finalBits &= ~PermissionFlagsBits[permission];
        changes.permissions = new PermissionsBitField(finalBits);
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one role field or permission change.');

      const target = await guild.roles.fetch(roleId);
      if (!target) throw new Error('Role not found in the configured Hellbot server.');
      if (target.id === guild.id || target.managed) throw new Error('The everyone role and integration-managed roles cannot be edited with this tool.');
      if (!target.editable) throw new Error('The bot cannot manage this role. Check ManageRoles and the bot role hierarchy.');

      await target.edit(changes, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedRole = await guild.roles.fetch(roleId, { force: true });
      if (!verifiedRole) throw new Error('Role was edited, but Discord did not return it for verification.');
      return { success: true, role: serializeRole(verifiedRole) };
    },

    delete_server_role: async ({ role_id: roleId } = {}) => {
      ensureAccess();
      if (typeof roleId !== 'string' || !/^\d{17,20}$/.test(roleId)) throw new Error('Provide a valid Discord role ID.');
      const target = await guild.roles.fetch(roleId);
      if (!target) throw new Error('Role not found in the configured Hellbot server.');
      if (target.id === guild.id || target.managed) {
        throw new Error('The everyone role and integration-managed roles cannot be deleted with this tool.');
      }
      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error('The bot needs Manage Roles permission to delete a role.');
      }
      if (!target.editable) throw new Error('The bot cannot manage this role. Check Manage Roles and the bot role hierarchy.');
      const deletedRole = { id: target.id, name: target.name };
      await target.delete(`Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedRoles = await guild.roles.fetch();
      if (verifiedRoles.has(roleId)) throw new Error('Role deletion was requested, but Discord still returned the role.');
      return { success: true, deleted: true, role: deletedRole };
    },
  };

  return { toolDefinitions: [createRoleDefinition, listRolesDefinition, getRoleDefinition, editRoleDefinition, deleteRoleDefinition], toolHandlers };
}

module.exports = { createServerRoleToolSet };
