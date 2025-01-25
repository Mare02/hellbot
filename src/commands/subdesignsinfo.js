const fs = require('fs');
const path = require('path');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'subdesignsinfo',
  description: 'Get information about design submissions.',
  perm: MODERATOR,
  slash: true,
  async execute(interaction) {
    try {
      const mediaPath = path.join(process.cwd(), 'media');
      const submissionsPath = path.join(mediaPath, 'submissions');

      // Check if submissions directory exists
      if (!fs.existsSync(submissionsPath)) {
        return interaction.reply({ content: 'No design submissions found yet.' });
      }

      // Get all user directories
      const userDirs = fs.readdirSync(submissionsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      if (userDirs.length === 0) {
        return interaction.reply({ content: 'No users have submitted designs yet.' });
      }

      // Collect statistics
      let totalSubmissions = 0;
      const userStats = [];

      for (const username of userDirs) {
        const metadataPath = path.join(submissionsPath, username, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          totalSubmissions += metadata.length;
          // Get userId from the first submission in metadata (they should all be from same user)
          const userId = metadata[0]?.userId || 'Unknown';
          userStats.push({ username, submissions: metadata.length, userId });
        }
      }

      // Create an embed for better formatting
      const embed = {
        color: 0x0099ff,
        title: '📊 Subscriber Designs Statistics',
        fields: [
          {
            name: 'Total Submissions',
            value: `${totalSubmissions}`,
            inline: false
          },
          {
            name: 'Participants',
            value: userStats.map(user => `• ${user.username} (ID: ${user.userId})`).join('\n'),
            inline: false
          }
        ],
        timestamp: new Date(),
        footer: {
          text: 'Design Submissions Info'
        }
      };

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Command execution error:', error);
      return interaction.reply({
        content: 'An error occurred while fetching design submission information.'
      });
    }
  },
};