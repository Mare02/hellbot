const { EmbedBuilder } = require('discord.js');
const { getInstance } = require('../client');
const config = require('../utils/config');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'syslog',
  perm: ADMIN,
  description: 'Sends a message to the logs channel.',
  async execute(message, args,  logMessage) {
    if (message.channel.guild.id !== config.homeServerId) return;

    try {
      const client = getInstance();

      const server = await client.guilds.fetch(config.homeServerId);
      const logsChannel = await server.channels.fetch(config.logChannelId);

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
