const { PermissionFlagsBits } = require('discord.js');

const permissionNames = Object.keys(PermissionFlagsBits).filter((name) => Number.isNaN(Number(name)));
const permissionNameSet = new Set(permissionNames);
const permissionToolNames = ['create_server_role', 'edit_server_role', 'edit_server_channel_permissions'];
const permissionNamesPrompt = `<discord-permission-names>
Tools that take Discord permission names accept only these exact values: ${permissionNames.join(', ')}.
</discord-permission-names>`;

module.exports = { permissionNames, permissionNameSet, permissionToolNames, permissionNamesPrompt };
