const { UNLOCKED } = require('../utils/roles');
const { saveToEnv } = require('../utils/helpers');
const roles = require('../utils/roles');
const config = require('../utils/config');
const messages = require('../utils/messages');
require('dotenv').config();

module.exports = {
  name: 'syncserverstaff',
  description: 'Gets all server staff and saves them to env.',
  perm: UNLOCKED,
  async execute(message) {
    try {
      if (message.guild.id !== config.homeServerId) {
        message.channel.send(messages.system.ownerServerOnly);
        return;
      };

      const staffRoles = {
        unlocked: config.staffRoleIds.unlocked,
        headAdmin: config.staffRoleIds.headAdmin,
        admin: config.staffRoleIds.admin,
        headModerator: config.staffRoleIds.headModerator,
        moderator: config.staffRoleIds.moderator,
      };

      const members = await message.guild.members.fetch();

      const staff = members.filter(
        member => Object.values(staffRoles).some(roleId => member.roles.cache.has(roleId))
      ).map(m => ({
        id: m.user.id,
        username: m.user.username,
        role: (() => {
          if (m.roles.cache.has(staffRoles.unlocked)) {
            return roles.UNLOCKED;
          }
          else if (m.roles.cache.has(staffRoles.headAdmin) || m.roles.cache.has(staffRoles.admin)) {
            return roles.ADMIN;
          }
          else if (m.roles.cache.has(staffRoles.headModerator) || m.roles.cache.has(staffRoles.moderator)) {
            return roles.MODERATOR;
          }
        })(),
      }));

      let unlocked = staff.filter(m => m.role === roles.UNLOCKED);
      let admins = staff.filter(m => m.role === roles.ADMIN);
      let moderators = staff.filter(m => m.role === roles.MODERATOR);

      saveToEnv('UNLOCKED', unlocked.map(m => m.id).join(','));
      saveToEnv('ADMINS', admins.map(m => m.id).join(','));
      saveToEnv('MODERATORS', moderators.map(m => m.id).join(','));

      message.channel.send('Server staff synced!');

    } catch (error) {
      console.error(error);
      message.channel.send(error.message);
    }
  },
};
