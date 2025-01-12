const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'syslog',
  perm: MODERATOR,
  description: 'Sends a message to the logs channel.',
  async execute(message, args, logMessage, user, customFields) {
    try {
      const logsChannel = message.guild.channels.cache.find(channel => channel.name === 'activity-log');

      if (!logsChannel) {
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setDescription(logMessage || args.join(' '))
        .setAuthor({
          name: `${message.author.username} #${message.author.discriminator} (${message.guild.id})`,
          iconURL: message.author.displayAvatarURL(),
        });

      if (user) {
        embed.setThumbnail(user.displayAvatarURL());
      }

      if (Array.isArray(customFields)) {
        customFields.forEach(field => {
          embed.addFields({ name: field.name, value: field.value || 'No value provided', inline: true });
        });
      }

      await logsChannel.send({embeds: [embed]});
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
