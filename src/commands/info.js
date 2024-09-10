require('dotenv').config();
const config = require('../utils/config');
const { EmbedBuilder } = require('discord.js');
const { getInstance } = require('../client');

module.exports = {
  name: 'info',
  description: 'Get bot information.',
  slash: true,
  async execute(interaction, args) {
    const client = getInstance();
    const serverCount = client.guilds.cache.size;

    let user;
    if (!args) {
      user = interaction.user;
    } else {
      user = interaction.author;
    }

    const embed = new EmbedBuilder()
      .setTitle('Bot Information')
      .addFields(
        {
          name: 'Name',
          value: config.bot.name,
          inline: true,
        },
        { name: 'Description', value: config.bot.decription, inline: true },
        { name: 'Version', value: config.bot.version, inline: true },
        { name: 'Owner', value: config.owner.name, inline: true },
        { name: 'Environment', value: process.env.NODE_ENV, inline: true },
        { name: 'Commands prefix', value: `"${config.commandsPrefix}" or "/"`, inline: true },
        { name: 'AI model', value: config.currentAiModel, inline: true },
        { name: 'Servers count', value: serverCount.toString(), inline: true },
        { name: 'Invite link', value: `[Invite ${config.bot.name}](<${config.bot.inviteLink}>)`, inline: true },
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Requested by ${user.username}`, iconURL: user.displayAvatarURL() })
      .setColor(config.embedColor);

    interaction.reply({ embeds: [embed] });
  },
};
