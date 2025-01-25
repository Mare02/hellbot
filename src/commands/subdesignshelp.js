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
            name: '**Requirements:**',
            value: `
• Must include at least one image file (maximum 3 images)
• Must include either a blueprint URL or a blueprint ZIP file
• One submission per user is allowed
            `,
            inline: false
          },
          {
            name: '**Accepted File Types:**',
            value: `
• Images: .png, .jpg, .jpeg, .webp
• Blueprint: .zip file or a Sharing URL
            `,
            inline: false
          },
          {
            name: '**Example Usage:**',
            value: `
              **Prefix: / or ${config.commandsPrefix}:**
1. Type: submitdesign  [blueprint sharing url]
2. Attach your image(s) to the same message
3. Optionally attach a ZIP file if not using a URL
            `,
            inline: false
          },
        )
        .setFooter({ text: 'Contact staff or server owner if you need to update your submission' });

        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
      console.error(error);
      const errorMessage = 'An error occurred while showing the help menu.';
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  },
};