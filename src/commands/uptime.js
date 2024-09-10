const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'uptime',
  description: 'Displays the bot uptime.',
  slash: true,
  async execute(interaction, args) {
    try {
      const uptime = process.uptime();
      const uptimeDays = Math.floor(uptime / 86400);
      const uptimeHours = Math.floor((uptime % 86400) / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const uptimeSeconds = Math.floor(uptime % 60);
      const uptimeString = [
        uptimeDays > 0 && `${uptimeDays}d`,
        uptimeHours > 0 && `${uptimeHours}h`,
        uptimeMinutes > 0 && `${uptimeMinutes}m`,
        uptimeSeconds > 0 && `${uptimeSeconds}s`,
      ].filter(Boolean).join(', ');

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Uptime 🕛' })
        .setTitle(uptimeString)
        .setColor(config.embedColor)
        .setThumbnail();

      if(!args){
        interaction.reply({ embeds: [embed] });
      } else {
        interaction.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      if(!args){
        interaction.reply(error.message);
      } else {
        interaction.channel.send(error.message);
      }
    }
  },
};
