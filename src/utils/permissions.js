const { PermissionsBitField } = require('discord.js');
const config = require('./config');

const OWNER = 'owner';

const hasPermission = (requiredPermission, context) => {
  if (requiredPermission === OWNER) {
    const userId = context?.user?.id || context?.author?.id;
    return Boolean(userId && String(userId) === String(config.owner.id));
  }

  if (!context?.guild || !context.member) return false;

  // Interaction permissions and permissionsFor both include all member roles
  // and the invoking channel's overwrites, as calculated by Discord.js.
  const permissions = context.memberPermissions
    || context.channel?.permissionsFor(context.member);
  return Boolean(permissions && new PermissionsBitField(permissions).has(requiredPermission));
};

const outranksTarget = (invoker, target) => {
  if (!invoker || !target) return false;
  if (invoker.guild.ownerId === invoker.id) return true;
  return invoker.roles.highest.comparePositionTo(target.roles.highest) > 0;
};

module.exports = { OWNER, hasPermission, outranksTarget };
