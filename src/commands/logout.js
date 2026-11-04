const { PermissionFlagsBits } = require('discord.js');

const LOGOUT_MESSAGE = 'Hellbot is logging off.';

module.exports = {
  name: 'logout',
  description: "Logs the bot out.",
  perm: PermissionFlagsBits.Administrator,
  async execute(message) {
    await message.channel.send(LOGOUT_MESSAGE);
    process.exit();
  },
};
