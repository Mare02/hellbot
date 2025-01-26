const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

module.exports = {
  name: 'subdesignshelp',
  description: 'Shows help information for submitting designs.',
  slash: true,
  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Design Submission Help 🎨')
        .addFields(
          {
            name: '**How to participate:**',
            value: `
1. Go to <#1332817934157873203> and create a submission ticket.
2. Submit your design in a form of a blueprint (zipped blueprint file or a Sharing Url) and a picture along with a name of your design.
3. Wait for the staff to review your submission.
            `,
            inline: false
          },
          {
            name: '**Requirements:**',
            value: `
• Must include at least one image file
• Must include either a blueprint Sharing URL or a blueprint ZIP file
• One submission per user is allowed
            `,
            inline: false
          },
          {
            name: '**Rules:**',
            value: `
• Your submission must be a fully complete and functional design.
• Submissions should represent one cohesive build. Avoid combining multiple non-complementary design categories.
• Designs with an offensive, sexual or vulgar thematic are not allowed.
            `,
            inline: false
          },
          {
            name: '\u200B',
            value: `If you have any questions or difficulties, please reach out to our staff.`,
            inline: false
          },
        );

        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
      console.error(error);
      const errorMessage = 'An error occurred while showing the help menu.';
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  },
};