const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'syslog',
  perm: MODERATOR,
  description: 'Sends a message to the logs channel.',
  async execute(message, args,  logMessage) {
    if (message.channel.guild.id !== config.homeServerId) return;

    try {
      const logsChannel = await message.guild.channels.fetch(config.logChannelId);

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setDescription(logMessage || args.join(' '));

      await logsChannel.send({embeds: [embed]});
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
