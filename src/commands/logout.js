const config = require('../utils/config');
const messages = require('../utils/messages');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'logout',
  description: "Logs the bot out.",
  perm: ADMIN,
  async execute(message, args) {
    if (message.author.id !== config.adminUserId) {
      await message.channel.send(messages.system.unauthorized);
      return;
    }
    await message.channel.send(messages.system.logout);
    process.exit();
  },
};
