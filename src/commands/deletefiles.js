const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { commandsPrefix } = require('../utils/config');
const { getMediaPath, getMediaFolders, confirmAction, findFileInMediaFolders } = require('../utils/helpers');
const { OWNER } = require('../utils/roles');

module.exports = {
  name: 'deletefiles',
  description: `Deletes files from the media folders. Usage: ${commandsPrefix}deletefile <filename> | --all | --category <categoryName> | --subfolder <subfolderName>`,
  perm: OWNER,
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.reply(`Please provide a filename or flag. Usage: ${commandsPrefix}deletefile <filename> | --all | --category <categoryName> | --subfolder <subfolderName>`);
      }

      const mediaPath = getMediaPath();
      const mediaFolders = getMediaFolders();

      if (!mediaFolders) {
        return message.reply('Media directory does not exist yet. No files to delete.');
      }

      // Handle --all flag
      if (args[0] === '--all') {
        let totalFiles = mediaFolders.reduce((count, folder) => {
          const folderPath = folder.includes('/')
            ? path.join(mediaPath, ...folder.split('/'))
            : path.join(mediaPath, folder);
          return count + fs.readdirSync(folderPath).length;
        }, 0);

        if (totalFiles === 0) {
          return message.reply('There are no files to delete in any category.');
        }

        const confirmed = await confirmAction(message, 'Are you sure you want to delete ALL files?');
        if (!confirmed) return message.reply('Deletion cancelled.');

        let deletedCount = 0;
        let deletedFolders = 0;

        // Sort folders by depth (deepest first) to properly handle nested folders
        const sortedFolders = [...mediaFolders].sort((a, b) =>
          (b.match(/\//g) || []).length - (a.match(/\//g) || []).length
        );

        for (const folder of sortedFolders) {
          const folderPath = folder.includes('/')
            ? path.join(mediaPath, ...folder.split('/'))
            : path.join(mediaPath, folder);

          try {
            const files = fs.readdirSync(folderPath);

            // Delete all files in the folder
            for (const file of files) {
              fs.unlinkSync(path.join(folderPath, file));
              deletedCount++;
            }

            // Delete the folder if it's empty and not a root category folder
            if (fs.readdirSync(folderPath).length === 0 && folder.includes('/')) {
              fs.rmdirSync(folderPath);
              deletedFolders++;
            }
          } catch (error) {
            console.error(`Error processing folder ${folderPath}:`, error);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Bulk Deletion Successful')
          .setDescription(`Deleted ${deletedCount} file(s) and ${deletedFolders} subfolder(s) from all categories.`);

        return message.reply({ embeds: [embed] });
      }

      // Handle --category flag
      if (args[0] === '--category') {
        if (!args[1]) {
          return message.reply(`Please specify a category name. Usage: ${commandsPrefix}deletefile --category <categoryName>`);
        }

        const category = args[1].toLowerCase();
        const matchingFolders = mediaFolders.filter(folder =>
          folder.toLowerCase().startsWith(category)
        );

        if (matchingFolders.length === 0) {
          return message.reply(`Category "${args[1]}" not found. Available categories: ${mediaFolders.join(', ')}`);
        }

        const confirmed = await confirmAction(message, `Are you sure you want to delete ALL files and folders in category "${args[1]}"?`);
        if (!confirmed) return message.reply('Deletion cancelled.');

        let deletedCount = 0;
        let deletedFolders = 0;

        // Sort folders by depth (deepest first) to properly handle nested folders
        const sortedFolders = [...matchingFolders].sort((a, b) =>
          (b.match(/\//g) || []).length - (a.match(/\//g) || []).length
        );

        for (const folder of sortedFolders) {
          const folderPath = folder.includes('/')
            ? path.join(mediaPath, ...folder.split('/'))
            : path.join(mediaPath, folder);

          try {
            const files = fs.readdirSync(folderPath);

            // Delete all files in the folder
            for (const file of files) {
              fs.unlinkSync(path.join(folderPath, file));
              deletedCount++;
            }

            // Delete the folder if it's empty (including root category folders)
            if (fs.readdirSync(folderPath).length === 0) {
              fs.rmdirSync(folderPath);
              deletedFolders++;
            }
          } catch (error) {
            console.error(`Error processing folder ${folderPath}:`, error);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Category Deletion Successful')
          .setDescription(`Deleted ${deletedCount} file(s) and ${deletedFolders} folder(s) from the "${args[1]}" category.`);

        return message.reply({ embeds: [embed] });
      }

      // Handle --subfolder flag
      if (args[0] === '--subfolder') {
        if (!args[1]) {
          return message.reply(`Please specify a subfolder name. Usage: ${commandsPrefix}deletefile --subfolder <subfolderName>`);
        }

        const subfolderName = args[1];
        let subfolderFound = false;

        // Find any folder that contains the specified subfolder
        for (const folder of mediaFolders) {
          if (folder.includes('/') && folder.split('/').includes(subfolderName)) {
            subfolderFound = true;
            const folderPath = path.join(mediaPath, ...folder.split('/'));

            if (!fs.existsSync(folderPath)) {
              continue;
            }

            const files = fs.readdirSync(folderPath);

            if (files.length === 0) {
              continue;
            }

            const confirmed = await confirmAction(message, `Are you sure you want to delete ALL files in subfolder "${subfolderName}"?`);
            if (!confirmed) return message.reply('Deletion cancelled.');

            for (const file of files) {
              fs.unlinkSync(path.join(folderPath, file));
            }

            // Remove empty subfolder
            fs.rmdirSync(folderPath);

            const embed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Subfolder Files Deletion Successful')
              .setDescription(`Deleted ${files.length} file(s) from subfolder "${subfolderName}".`);

            return message.reply({ embeds: [embed] });
          }
        }

        if (!subfolderFound) {
          return message.reply(`No subfolder named "${subfolderName}" found in any category.`);
        }
      }

      // Handle single file deletion
      const fileName = args.join(' ');
      const allMatches = [];

      // Search through all folders for matching files
      for (const folder of mediaFolders) {
        const folderPath = folder.includes('/')
          ? path.join(mediaPath, ...folder.split('/'))
          : path.join(mediaPath, folder);

        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath);
          const matchingFiles = files.filter(file =>
            file.toLowerCase().includes(fileName.toLowerCase())
          );

          matchingFiles.forEach(file => {
            allMatches.push({
              fileName: file,
              folder: folder,
              filePath: path.join(folderPath, file)
            });
          });
        }
      }

      if (allMatches.length === 0) {
        return message.reply(`File "${fileName}" not found in any media folder.`);
      }

      if (allMatches.length === 1) {
        // If only one match, delete it directly after confirmation
        const fileData = allMatches[0];
        const confirmed = await confirmAction(
          message,
          `Are you sure you want to delete "${fileData.fileName}" from ${fileData.folder}?`
        );

        if (!confirmed) return message.reply('Deletion cancelled.');

        fs.unlinkSync(fileData.filePath);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('File Deleted Successfully')
          .setDescription(`The file "${fileData.fileName}" has been deleted from the ${fileData.folder} folder.`);

        return message.reply({ embeds: [embed] });
      }

      // If multiple matches, show them as numbered options
      const matchList = allMatches.map((match, index) =>
        `${index + 1}. "${match.fileName}" in ${match.folder}`
      ).join('\n');

      const selectionEmbed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('Multiple Files Found')
        .setDescription(`Found ${allMatches.length} matching files. Please reply with the number of the file you want to delete:\n\n${matchList}\n\nReply with 'cancel' to abort.`);

      await message.reply({ embeds: [selectionEmbed] });

      // Wait for user response
      try {
        const filter = m => m.author.id === message.author.id;
        const response = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30000,
          errors: ['time']
        });

        const choice = response.first().content.toLowerCase();

        if (choice === 'cancel') {
          return message.reply('Deletion cancelled.');
        }

        const selectedIndex = parseInt(choice) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allMatches.length) {
          return message.reply('Invalid selection. Deletion cancelled.');
        }

        const selectedFile = allMatches[selectedIndex];

        // Confirm deletion of selected file
        const confirmed = await confirmAction(
          message,
          `Are you sure you want to delete "${selectedFile.fileName}" from ${selectedFile.folder}?`
        );

        if (!confirmed) return message.reply('Deletion cancelled.');

        fs.unlinkSync(selectedFile.filePath);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('File Deleted Successfully')
          .setDescription(`The file "${selectedFile.fileName}" has been deleted from the ${selectedFile.folder} folder.`);

        await message.reply({ embeds: [embed] });

      } catch (error) {
        if (error.name === 'Error [INTERACTION_COLLECTOR_ERROR]') {
          return message.reply('No response received within 30 seconds. Deletion cancelled.');
        }
        throw error;
      }

    } catch (error) {
      console.error('Error deleting file:', error);
      return message.reply('An error occurred while trying to delete the file.');
    }
  },
};
