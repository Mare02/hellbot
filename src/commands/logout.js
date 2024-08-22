const messages = require('../utils/messages');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'logout',
  description: "Logs the bot out.",
  perm: ADMIN,
  async execute(message) {
    await message.channel.send(messages.system.logout);
    process.exit();
  },
};
