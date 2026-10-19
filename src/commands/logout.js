const { PermissionFlagsBits } = require('discord.js');
const messages = require('../utils/messages');

module.exports = {
  name: 'logout',
  description: "Logs the bot out.",
  perm: PermissionFlagsBits.Administrator,
  async execute(message) {
    await message.channel.send(messages.system.logout);
    process.exit();
  },
};
