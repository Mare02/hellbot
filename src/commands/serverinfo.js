const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'serverinfo',
  description: 'Displays information about the server.',
  async execute(message) {
    const { guild } = message;

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`Server Information for ${guild.name}`)
      .addFields(
        { name: 'Server ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
        { name: 'Created At', value: `${guild.createdAt.toDateString()}`, inline: true },
        { name: 'Region', value: `${guild.preferredLocale}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true }
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    await message.channel.send({ embeds: [embed] });
  },
};
