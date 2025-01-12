const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getMediaPath, getMediaFolders, getFileInfo } = require('../utils/helpers');
const { OWNER } = require('../utils/roles');

module.exports = {
  name: 'listfiles',
  description: 'Lists files in media folders. Use --category <folder> to filter by category',
  perm: OWNER,
  async execute(message, args) {
    try {
      const mediaFolders = getMediaFolders();

      if (!mediaFolders) {
        return message.reply('Media directory does not exist yet. No files have been uploaded.');
      }

      if (mediaFolders.length === 0) {
        return message.reply('No media folders found.');
      }

      // Parse category argument
      let categoryFilter = null;
      const categoryIndex = args.indexOf('--category');
      if (categoryIndex !== -1 && args[categoryIndex + 1]) {
        categoryFilter = args[categoryIndex + 1].toLowerCase();
        if (!mediaFolders.includes(categoryFilter)) {
          return message.reply(`Invalid category. Available categories: ${mediaFolders.join(', ')}`);
        }
      }

      const embeds = [];
      const summaryEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📁 Files');

      if (categoryFilter) {
        summaryEmbed.setDescription(`Files in category: ${categoryFilter}`);
      }

      let totalFiles = 0;
      const folderCounts = {};
      const mediaPath = getMediaPath();

      // Process each media folder
      for (const folder of mediaFolders) {
        if (categoryFilter && folder !== categoryFilter) continue;

        const folderPath = path.join(mediaPath, folder);
        const files = fs.readdirSync(folderPath);
        folderCounts[folder] = files.length;
        totalFiles += files.length;

        if (files.length > 0) {
          const folderEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📁 ${folder.charAt(0).toUpperCase() + folder.slice(1)}`)
            .setDescription(`Contains ${files.length} files`);

          // Only show first 5 files initially
          const displayFiles = files.slice(0, 5);
          displayFiles.forEach((file, index) => {
            const filePath = path.join(folderPath, file);
            const fileInfo = getFileInfo(filePath);
            const fileInfoText = `📦 Size: ${fileInfo.size} KB\n📅 Created: ${fileInfo.created}`;
            let icon;
            switch(folder) {
              case 'images': icon = '🖼️'; break;
              case 'audio': icon = '🎵'; break;
              case 'videos': icon = '🎥'; break;
              case 'documents': icon = '📄'; break;
              default: icon = '📁';
            }

            folderEmbed.addFields({
              name: `${icon} ${index + 1}. ${file}`,
              value: fileInfoText
            });
          });

          if (files.length > 5) {
            folderEmbed.addFields({
              name: '⚠️ Note',
              value: `Showing 5/${files.length} files. Click 'Show All' to view all files.`
            });
          }

          embeds.push(folderEmbed);
        }
      }

      // Only add summary if there are files to show
      if (totalFiles > 0) {
        summaryEmbed.addFields(
          { name: 'Total Files', value: `${totalFiles}`, inline: true },
          {
            name: 'By Category',
            value: Object.entries(folderCounts)
              .filter(([folder, count]) => count > 0)
              .map(([folder, count]) => `${folder}: ${count}`)
              .join('\n'),
            inline: true
          }
        );

        embeds.unshift(summaryEmbed);

        // Create Show All button if there are more than 5 files
        const hasMoreFiles = Object.values(folderCounts).some(count => count > 5);
        const components = [];

        if (hasMoreFiles) {
          // Create buttons for each folder that has more than 5 files
          for (const folder of mediaFolders) {
            if (categoryFilter && folder !== categoryFilter) continue;
            if (folderCounts[folder] > 5) {
              const button = new ButtonBuilder()
                .setCustomId(`showAll_${folder}`)
                .setLabel(`Show All ${folder.charAt(0).toUpperCase() + folder.slice(1)}`)
                .setStyle(ButtonStyle.Primary);
              components.push(new ActionRowBuilder().addComponents(button));
            }
          }
        }

        // Send initial message with limited files
        const response = await message.reply({
          embeds: embeds.slice(0, 10),
          components
        });

        // Handle button interaction
        const filter = i => i.customId.startsWith('showAll_') && i.user.id === message.author.id;
        const collector = response.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async interaction => {
          // Generate full embeds with all files
          const fullEmbeds = await generateFullEmbeds(mediaPath, mediaFolders, categoryFilter);

          // Update the message with all files
          await interaction.update({
            embeds: fullEmbeds.slice(0, 10),
            components: [] // Remove the button after showing all files
          });

          // If there are more than 10 embeds, send them in additional messages
          for (let i = 10; i < fullEmbeds.length; i += 10) {
            await message.reply({
              embeds: fullEmbeds.slice(i, i + 10),
            });
          }
        });

      } else {
        // Show summary embed even when no files found
        summaryEmbed.addFields(
          { name: 'Total Files', value: '0', inline: true },
        );

        await message.reply({ embeds: [summaryEmbed] });
      }

    } catch (error) {
      console.error('Error listing files:', error);
      return message.reply('An error occurred while trying to list files.');
    }
  },
};

// Helper function to generate full embeds with all files
async function generateFullEmbeds(mediaPath, mediaFolders, categoryFilter) {
  const embeds = [];
  const summaryEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('📁 Files')
    .setDescription(categoryFilter ? `Files in category: ${categoryFilter}` : 'Files organized by type');

  let totalFiles = 0;
  const folderCounts = {};

  for (const folder of mediaFolders) {
    if (categoryFilter && folder !== categoryFilter) continue;

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
          case 'images': icon = '🖼️'; break;
          case 'audio': icon = '🎵'; break;
          case 'videos': icon = '🎥'; break;
          case 'documents': icon = '📄'; break;
          default: icon = '📁';
        }

        folderEmbed.addFields({
          name: `${icon} ${index + 1}. ${file}`,
          value: fileInfoText
        });
      });

      embeds.push(folderEmbed);
    }
  }

  if (totalFiles > 0) {
    summaryEmbed.addFields(
      { name: 'Total Files', value: `${totalFiles}`, inline: true },
      {
        name: 'By Category',
        value: Object.entries(folderCounts)
          .filter(([folder, count]) => count > 0)
          .map(([folder, count]) => `${folder}: ${count}`)
          .join('\n'),
        inline: true
      }
    );
    embeds.unshift(summaryEmbed);
  }

  return embeds;
}
