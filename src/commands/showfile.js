const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commandsPrefix } = require('../utils/config');
const { findFileInMediaFolders, getFileInfo } = require('../utils/helpers');
const { OWNER } = require('../utils/roles');

module.exports = {
  name: 'showfile',
  description: 'Retrieves a specific file from the media folders',
  perm: OWNER,
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.reply(`Please provide a filename to retrieve. Usage: ${commandsPrefix}showfile <filename>`);
      }

      const fileName = args.join(' ');
      const fileMatches = findFileInMediaFolders(fileName);

      if (!fileMatches.length) {
        return message.reply(`File "${fileName}" not found in any media folder.`);
      }

      const getFileIcon = (folder, filename) => {
        // Check file extension first
        const extension = filename.toLowerCase().split('.').pop();

        // Image formats
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
          return '🖼️';
        }
        // Audio formats
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) {
          return '🎵';
        }
        // Video formats
        if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension)) {
          return '🎥';
        }
        // Document formats
        if (['txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
          return '📄';
        }

        // Fallback to folder-based icons if extension not recognized
        switch(folder) {
          case 'images': return '🖼️';
          case 'audio': return '🎵';
          case 'videos': return '🎥';
          case 'documents': return '📄';
          default: return '📁';
        }
      };

      // If only one match, show it directly
      if (fileMatches.length === 1) {
        const fileData = fileMatches[0];
        const fileInfo = getFileInfo(fileData.filePath);
        const infoText = `📦 Size: ${fileInfo.size} KB\n📅 Created: ${fileInfo.created}\n📁 Folder: ${fileData.folder}`;
        const attachment = new AttachmentBuilder(fileData.filePath, { name: fileName });

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`${getFileIcon(fileData.folder, fileName)} ${fileName}`)
          .setDescription(infoText);

        return message.reply({
          embeds: [embed],
          files: [attachment]
        });
      }

      // If multiple matches, show selection buttons
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Multiple matches found for "${fileName}"`)
        .setDescription('Please select which file you want to view:');

      const row = new ActionRowBuilder();

      fileMatches.forEach((match, index) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`file_${index}`)
            .setLabel(`${getFileIcon(match.folder, fileName)} ${match.folder}`)
            .setStyle(ButtonStyle.Primary)
        );
      });

      const selectionMsg = await message.reply({
        embeds: [embed],
        components: [row]
      });

      try {
        const interaction = await selectionMsg.awaitMessageComponent({
          filter: i => i.user.id === message.author.id,
          time: 30000
        });

        const selectedIndex = parseInt(interaction.customId.split('_')[1]);
        const selectedFile = fileMatches[selectedIndex];

        const fileInfo = getFileInfo(selectedFile.filePath);
        const infoText = `📦 Size: ${fileInfo.size} KB\n📅 Created: ${fileInfo.created}\n📁 Folder: ${selectedFile.folder}`;
        const attachment = new AttachmentBuilder(selectedFile.filePath, { name: fileName });

        const fileEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`${getFileIcon(selectedFile.folder, fileName)} ${fileName}`)
          .setDescription(infoText);

        // Remove the selection buttons
        await selectionMsg.edit({ components: [] });

        await interaction.reply({
          embeds: [fileEmbed],
          files: [attachment]
        });

      } catch (error) {
        if (error.name === 'TimeoutError') {
          await selectionMsg.edit({
            content: 'Selection timed out.',
            embeds: [],
            components: []
          });
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.error('Error retrieving file:', error);
      return message.reply('An error occurred while trying to retrieve the file.');
    }
  },
};
