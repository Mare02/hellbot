const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { commandsPrefix } = require('../utils/config');
const { findFileInMediaFolders, getFileInfo } = require('../utils/helpers');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'showfile',
  description: 'Retrieves a specific file from the media folders',
  perm: ADMIN,
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.reply(`Please provide a filename to retrieve. Usage: ${commandsPrefix}showfile <filename>`);
      }

      const fileName = args.join(' ');
      const fileData = findFileInMediaFolders(fileName);

      if (!fileData) {
        return message.reply(`File "${fileName}" not found in any media folder.`);
      }

      const fileInfo = getFileInfo(fileData.filePath);
      const infoText = `📦 Size: ${fileInfo.size} KB\n📅 Created: ${fileInfo.created}\n📁 Folder: ${fileData.folder}`;

      const attachment = new AttachmentBuilder(fileData.filePath, { name: fileName });

      const getFileIcon = (folder) => {
        switch(folder) {
          case 'images': return '🖼️';
          case 'audio': return '🎵';
          case 'videos': return '🎥';
          case 'documents': return '📄';
          default: return '📁';
        }
      };

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${getFileIcon(fileData.folder)} ${fileName}`)
        .setDescription(infoText);

      await message.reply({
        embeds: [embed],
        files: [attachment]
      });

    } catch (error) {
      console.error('Error retrieving file:', error);
      return message.reply('An error occurred while trying to retrieve the file.');
    }
  },
};
