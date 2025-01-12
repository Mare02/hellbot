const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { commandsPrefix } = require('../utils/config');
const { getMediaPath, getMediaFolders, confirmAction, findFileInMediaFolders } = require('../utils/helpers');
const { OWNER } = require('../utils/roles');

module.exports = {
  name: 'deletefiles',
  description: `Deletes files from the media folders. Usage: ${commandsPrefix}deletefile <filename> | --all | --category <categoryName>`,
  perm: OWNER,
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.reply(`Please provide a filename or flag. Usage: ${commandsPrefix}deletefile <filename> | --all | --category <categoryName>`);
      }

      const mediaPath = getMediaPath();
      const mediaFolders = getMediaFolders();

      if (!mediaFolders) {
        return message.reply('Media directory does not exist yet. No files to delete.');
      }

      // Handle --all flag
      if (args[0] === '--all') {
        let totalFiles = mediaFolders.reduce((count, folder) => {
          return count + fs.readdirSync(path.join(mediaPath, folder)).length;
        }, 0);

        if (totalFiles === 0) {
          return message.reply('There are no files to delete in any category.');
        }

        const confirmed = await confirmAction(message, 'Are you sure you want to delete ALL files?');
        if (!confirmed) return message.reply('Deletion cancelled.');

        let deletedCount = 0;
        for (const folder of mediaFolders) {
          const folderPath = path.join(mediaPath, folder);
          const files = fs.readdirSync(folderPath);

          for (const file of files) {
            fs.unlinkSync(path.join(folderPath, file));
            deletedCount++;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Bulk Deletion Successful')
          .setDescription(`Deleted ${deletedCount} file(s) from all categories.`);

        return message.reply({ embeds: [embed] });
      }

      // Handle --category flag
      if (args[0] === '--category') {
        if (!args[1]) {
          return message.reply(`Please specify a category name. Usage: ${commandsPrefix}deletefile --category <categoryName>`);
        }

        const category = args[1].toLowerCase();
        if (!mediaFolders.includes(category)) {
          return message.reply(`Category "${category}" not found. Available categories: ${mediaFolders.join(', ')}`);
        }

        const categoryPath = path.join(mediaPath, category);
        const files = fs.readdirSync(categoryPath);

        if (files.length === 0) {
          return message.reply(`There are no files to delete in category "${category}".`);
        }

        const confirmed = await confirmAction(message, `Are you sure you want to delete ALL files in category "${category}"?`);
        if (!confirmed) return message.reply('Deletion cancelled.');

        for (const file of files) {
          fs.unlinkSync(path.join(categoryPath, file));
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Category Deletion Successful')
          .setDescription(`Deleted ${files.length} file(s) from the "${category}" category.`);

        return message.reply({ embeds: [embed] });
      }

      // Handle single file deletion
      const fileName = args.join(' ');
      const fileData = findFileInMediaFolders(fileName);

      if (!fileData) {
        return message.reply(`File "${fileName}" not found in any media folder.`);
      }

      fs.unlinkSync(fileData.filePath);

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('File Deleted Successfully')
        .setDescription(`The file "${fileName}" has been deleted from the ${fileData.folder} folder.`);

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error deleting file:', error);
      return message.reply('An error occurred while trying to delete the file.');
    }
  },
};
