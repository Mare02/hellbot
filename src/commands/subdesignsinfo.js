const fs = require('fs');
const path = require('path');

module.exports = {
  data: {
    name: 'subdesignsinfo',
    description: 'Get information about design submissions.',
  },
  async execute(interaction) {
    try {
      const mediaPath = path.join(process.cwd(), 'media');
      const submissionsPath = path.join(mediaPath, 'submissions');

      // Check if submissions directory exists
      if (!fs.existsSync(submissionsPath)) {
        return interaction.reply('No design submissions found yet.');
      }

      // Get all user directories
      const userDirs = fs.readdirSync(submissionsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      if (userDirs.length === 0) {
        return interaction.reply('No users have submitted designs yet.');
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

      let response = `📊 **Subscriber Designs Statistics**\n\n`;
      response += `Total Submissions: ${totalSubmissions}\n\n`;

      response += `**Participants:**\n`;
      userDirs.forEach(username => {
        const userStat = userStats.find(user => user.username === username);
        response += `• ${username} (ID: ${userStat?.userId})\n`;
      });

      return interaction.reply(response);
    } catch (error) {
      console.error('Command execution error:', error);
      return interaction.reply({ content: 'An error occurred while fetching design submission information.', ephemeral: true });
    }
  },
}; 