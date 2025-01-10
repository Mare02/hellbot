const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { getMediaPath, getMediaFolders } = require('../utils/helpers');
const { commandsPrefix } = require('../utils/config');

const { ADMIN } = require('../utils/roles');
module.exports = {
  name: 'filestree',
  description: 'Shows a tree view of the media folder structure',
  perm: ADMIN,
  async execute(message, args) {
    try {
      const mediaPath = getMediaPath();
      const mediaFolders = getMediaFolders();

      if (!mediaFolders) {
        return message.reply('Media directory does not exist yet. No files have been uploaded.');
      }

      let treeString = '📁 media/\n';
      let totalFiles = 0;
      const stats = {
        images: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
        videos: { count: 0, size: 0 },
        documents: { count: 0, size: 0 }
      };

      // Process each media folder
      for (const folder of mediaFolders) {
        const folderPath = path.join(mediaPath, folder);
        const files = fs.readdirSync(folderPath);

        // Add folder to tree
        treeString += `├── 📁 ${folder}/ (${files.length} files)\n`;

        // Process files in folder
        files.forEach((file, index) => {
          const isLast = index === files.length - 1;
          const fileIcon = getFileIcon(folder);
          const filePath = path.join(folderPath, file);
          const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2); // Size in KB

          treeString += `│   ${isLast ? '└── ' : '├── '}${fileIcon} ${file} (${fileSize} KB)\n`;

          // Update statistics
          stats[folder].count++;
          stats[folder].size += parseFloat(fileSize);
          totalFiles++;
        });
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Media Folder Structure')
        .setDescription('```\n' + treeString + '```')
        .addFields(
          {
            name: 'Summary',
            value: `Total Files: ${totalFiles}\n` +
                  Object.entries(stats)
                    .filter(([_, data]) => data.count > 0)
                    .map(([folder, data]) =>
                      `${getFolderIcon(folder)} ${folder}: ${data.count} files (${data.size.toFixed(2)} KB)`
                    )
                    .join('\n'),
            inline: false
          }
        )
        .setFooter({ text: `Use ${commandsPrefix}listfiles for detailed file information` });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error showing media tree:', error);
      return message.reply('An error occurred while trying to show the media tree.');
    }
  },
};

// Helper functions for icons
function getFolderIcon(folder) {
  switch(folder) {
    case 'images': return '🖼️';
    case 'audio': return '🎵';
    case 'videos': return '🎥';
    case 'documents': return '📄';
    default: return '📁';
  }
}

function getFileIcon(folder) {
  switch(folder) {
    case 'images': return '🖼️';
    case 'audio': return '🎵';
    case 'videos': return '🎥';
    case 'documents': return '📄';
    default: return '📄';
  }
}