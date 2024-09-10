const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'serverinfo',
  description: 'Displays information about the server.',
  slash: true,
  async execute(interaction, args) {
    const { guild } = interaction;

    let user;
    if (!args) {
      user = interaction.user;
    } else {
      user = interaction.author;
    }

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
      .setFooter({ text: `Requested by ${user.username}`, iconURL: user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },
};
