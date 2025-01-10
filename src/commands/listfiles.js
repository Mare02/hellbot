const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { getMediaPath, getMediaFolders, getFileInfo } = require('../utils/helpers');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'listfiles',
  description: 'Lists all files in the media folders',
  perm: ADMIN,
  async execute(message, args) {
    try {
      const mediaFolders = getMediaFolders();

      if (!mediaFolders) {
        return message.reply('Media directory does not exist yet. No files have been uploaded.');
      }

      if (mediaFolders.length === 0) {
        return message.reply('No media folders found.');
      }

      const embeds = [];
      const summaryEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📁 Media Files')
        .setDescription('Files organized by type');

      let totalFiles = 0;
      const folderCounts = {};
      const mediaPath = getMediaPath();

      // Process each media folder
      for (const folder of mediaFolders) {
        const folderPath = path.join(mediaPath, folder);
        const files = fs.readdirSync(folderPath);
        folderCounts[folder] = files.length;
        totalFiles += files.length;

        if (files.length > 0) {
          const folderEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📁 ${folder.charAt(0).toUpperCase() + folder.slice(1)}`)
            .setDescription(`Contains ${files.length} files`);

          files.forEach((file, index) => {
            const filePath = path.join(folderPath, file);
            const fileInfo = getFileInfo(filePath);
            const fileInfoText = `📦 Size: ${fileInfo.size} KB\n📅 Created: ${fileInfo.created}`;
            let icon;
            switch(folder) {
              case 'images':
                icon = '🖼️';
                break;
              case 'audio':
                icon = '🎵';
                break;
              case 'videos':
                icon = '🎥';
                break;
              case 'documents':
                icon = '📄';
                break;
              default:
                icon = '📁';
            }

            folderEmbed.addFields({
              name: `${icon} ${index + 1}. ${file}`,
              value: fileInfoText
            });
          });

          embeds.push(folderEmbed);
        }
      }

      summaryEmbed.addFields(
        { name: 'Total Files', value: `${totalFiles}`, inline: true },
        {
          name: 'By Category',
          value: Object.entries(folderCounts)
            .map(([folder, count]) => `${folder}: ${count}`)
            .join('\n'),
          inline: true
        }
      );

      embeds.unshift(summaryEmbed);

      // Send embeds in chunks of 10
      for (let i = 0; i < embeds.length; i += 10) {
        await message.reply({
          embeds: embeds.slice(i, i + 10),
        });
      }

    } catch (error) {
      console.error('Error listing files:', error);
      return message.reply('An error occurred while trying to list files.');
    }
  },
};
