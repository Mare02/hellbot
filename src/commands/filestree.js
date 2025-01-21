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
      const stats = {};

      // First, get all unique top-level folders
      const topLevelFolders = new Set(mediaFolders.map(folder => 
        folder.includes('/') ? folder.split('/')[0] : folder
      ));

      // Initialize stats for each folder
      for (const folder of topLevelFolders) {
        stats[folder] = { count: 0, size: 0 };
      }

      // Process each top-level folder
      for (const topFolder of topLevelFolders) {
        const folderPath = path.join(mediaPath, topFolder);
        const folderIcon = getFolderIcon(topFolder);
        
        try {
          const contents = fs.readdirSync(folderPath, { withFileTypes: true });
          const subDirs = contents.filter(dirent => dirent.isDirectory());
          const files = contents.filter(dirent => dirent.isFile());

          treeString += `├── ${folderIcon} ${topFolder}/\n`;

          if (subDirs.length > 0) {
            // Handle folders with subdirectories
            for (const subDir of subDirs) {
              const subDirPath = path.join(folderPath, subDir.name);
              const subDirFiles = fs.readdirSync(subDirPath);

              treeString += `│   ├── 👤 ${subDir.name}/ (${subDirFiles.length} files)\n`;

              // Process files in subdirectory (limit to 3)
              const displayLimit = 3;
              subDirFiles.slice(0, displayLimit).forEach((file, index) => {
                const isLast = index === Math.min(subDirFiles.length - 1, displayLimit - 1);
                const filePath = path.join(subDirPath, file);
                const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
                const fileIcon = getFileIcon(path.extname(file).slice(1));

                treeString += `│   │   ${isLast && subDirFiles.length <= displayLimit ? '└── ' : '├── '}${fileIcon} ${file} (${fileSize} KB)\n`;

                stats[topFolder].count++;
                stats[topFolder].size += parseFloat(fileSize);
                totalFiles++;
              });

              if (subDirFiles.length > displayLimit) {
                treeString += `│   │   └── ... and ${subDirFiles.length - displayLimit} more files\n`;

                // Update statistics for remaining files
                const remainingFiles = subDirFiles.slice(displayLimit);
                remainingFiles.forEach(file => {
                  const filePath = path.join(subDirPath, file);
                  const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
                  stats[topFolder].count++;
                  stats[topFolder].size += parseFloat(fileSize);
                  totalFiles++;
                });
              }
            }
          }

          // Handle files in the root of this folder
          if (files.length > 0) {
            const displayLimit = 5;
            files.slice(0, displayLimit).forEach((file, index) => {
              const isLast = index === Math.min(files.length - 1, displayLimit - 1);
              const filePath = path.join(folderPath, file.name);
              const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
              const fileIcon = getFileIcon(path.extname(file.name).slice(1));

              treeString += `│   ${isLast && files.length <= displayLimit ? '└── ' : '├── '}${fileIcon} ${file.name} (${fileSize} KB)\n`;

              stats[topFolder].count++;
              stats[topFolder].size += parseFloat(fileSize);
              totalFiles++;
            });

            if (files.length > displayLimit) {
              treeString += `│   └── ... and ${files.length - displayLimit} more files\n`;

              // Update statistics for remaining files
              const remainingFiles = files.slice(displayLimit);
              remainingFiles.forEach(file => {
                const filePath = path.join(folderPath, file.name);
                const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
                stats[topFolder].count++;
                stats[topFolder].size += parseFloat(fileSize);
                totalFiles++;
              });
            }
          }
        } catch (error) {
          console.error(`Error reading folder ${topFolder}:`, error);
          treeString += `│   └── Error reading folder contents\n`;
        }
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
                      `📁 ${folder}: ${data.count} files (${data.size.toFixed(2)} KB)`
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