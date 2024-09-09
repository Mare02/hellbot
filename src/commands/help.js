const { getCommandsList } = require('../utils/helpers');
const config = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show a list of commands and how to use them.',
  async execute(interaction) {
    try {
      const commandsList = getCommandsList({ show: 'base' });

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`**${config.bot.name}**'s Help Menu 📜`)
        .addFields(
          { name: '**Prefix:**', value: config.commandsPrefix, inline: true },
          {
            name: '**How to use the bot:**',
            value: `
              Start your message with the command prefix followed by the command name.
              Example: ${config.commandsPrefix}help
            `,
            inline: false
          },
          { name: '**Available Commands:**', value: `\n${commandsList}`, inline: false }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply(error.message);
    }
  },
};

