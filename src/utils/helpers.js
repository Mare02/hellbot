const fs = require('fs');
const path = require('path');
const messages = require('../utils/messages');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { buildDiscordPayload } = require('./discordMessages');

require('dotenv').config();

const helpers = {
  getCommandsList(filter) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commands = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
      .map(file => require(path.join(commandsPath, file)));
    let commandEntries = Object.entries(commands).filter(([_, value]) =>
      typeof value?.name === 'string'
      && typeof value?.description === 'string'
      && !value?.name.startsWith('test')
    );

    if (filter && filter.show === 'base') {
      commandEntries = commandEntries.filter(([_, value]) => !value.perm);
    }

    const commandsList = commandEntries.map(([_, value]) =>
      `**::${value.name}** - ${value.description} ${value.perm ? `(${value.perm})` : ''}`
    ).join('\n');

    return commandsList;
  },

  validateUserPromptInput: (promptInput, channel) => {
    const prompt = promptInput.trim();
    if (prompt === '' || /^\s+$/.test(prompt)) {
      channel.send('Please provide a prompt!');
      return;
    }
    return prompt;
  },

  reply: async (interaction, args, content) => {
    const payload = buildDiscordPayload(content);

    if (interaction.deferred) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  },

  forwardAttachmentsToChannel: async (message, args, channelId, mediaType) => {
    try {
      if (!message.reference) {
        message.channel.send(messages.emptyState.noAttachmentInReply);
        return;
      }

      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      const attachments = repliedMessage.attachments;

      if (!attachments.size) {
        message.channel.send(messages.emptyState.noAttachmentInReply, { reply: { messageReference: null } });
        return;
      }

      const authorText = args.join(' ') || repliedMessage.author.displayName;

      const channel = await message.guild.channels.fetch(channelId);
      await channel.send({ content: authorText, files: attachments.map(a => a.url), reply: { messageReference: null } });

      message.channel.send(`Selected ${mediaType} is now displayed in the <#${channelId}>`);
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },

  saveToEnv: async (name, value) => {
    const envFile = fs.readFileSync('.env', 'utf8');
    const envLines = envFile.split('\n');
    let nameUpperCase = name.toUpperCase();

    const index = envLines.findIndex(line => line.startsWith(`${nameUpperCase}=`));

    if (index !== -1) {
      envLines[index] = `${nameUpperCase}=${JSON.stringify(value)}`;
    } else {
      envLines.push(`${nameUpperCase}=${JSON.stringify(value)}`);
    }

    fs.writeFileSync('.env', envLines.join('\n'));
  },

  getFromEnv(name) {
    const envFile = fs.readFileSync('.env', 'utf8');
    const envLines = envFile.split('\n');

    const index = envLines.findIndex(line => line.startsWith(`${name.toUpperCase()}=`));
    return index !== -1 ? JSON.parse(envLines[index].split('=')[1]) : null;
  },

  formatDate: (day, month, year) => {
    const formattedMonth = new Date(year, month, day)
      .toLocaleString('default', { month: 'long' });

    const formattedDay = day.toString();

    return `${formattedMonth} ${formattedDay}${year ? `, ${year}` : ''}`;
  },

  getMediaPath() {
    return path.join(process.cwd(), 'media');
  },

  getMediaFolders() {
    const mediaPath = helpers.getMediaPath();
    if (!fs.existsSync(mediaPath)) {
      return null;
    }
    const folders = fs.readdirSync(mediaPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // For the Submissions folder, also include user subfolders
    if (folders.includes('Submissions')) {
      const submissionsPath = path.join(mediaPath, 'Submissions');
      const userFolders = fs.readdirSync(submissionsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => `Submissions/${dirent.name}`);

      // Replace 'Submissions' with user-specific folders
      const index = folders.indexOf('Submissions');
      folders.splice(index, 1, ...userFolders);
    }

    return folders;
  },

  async confirmAction(message, promptText) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_action')
          .setLabel('YES')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_action')
          .setLabel('NO')
          .setStyle(ButtonStyle.Secondary),
      );

    const confirmationMsg = await message.reply({
      content: promptText,
      components: [row]
    });

    try {
      const confirmation = await confirmationMsg.awaitMessageComponent({
        filter: i => i.user.id === message.author.id,
        time: 30000
      });

      // Remove the buttons after selection
      await confirmationMsg.edit({ components: [] });
      return confirmation.customId === 'confirm_action';
    } catch (error) {
      // Remove the buttons if timeout occurs
      await confirmationMsg.edit({ components: [] });
      return false;
    }
  },

  findFileInMediaFolders(fileName) {
    const mediaPath = helpers.getMediaPath();
    const mediaFolders = helpers.getMediaFolders();

    if (!mediaFolders) return [];

    const matches = [];
    for (const folder of mediaFolders) {
      // Handle nested folders (e.g., Submissions/username)
      const folderPath = folder.includes('/') 
        ? path.join(mediaPath, ...folder.split('/'))
        : path.join(mediaPath, folder);

      const testPath = path.join(folderPath, fileName);
      if (fs.existsSync(testPath)) {
        matches.push({
          filePath: testPath,
          folder: folder
        });
      }
    }
    return matches;
  },

  getFileInfo(filePath) {
    const stats = fs.statSync(filePath);
    return {
      size: (stats.size / 1024).toFixed(2),
      created: stats.birthtime.toLocaleString()
    };
  },

  async uploadFile(attachment, targetFileName, mediaTypeFolder, mediaPath) {
    try {
      const fs = require('fs');
      const path = require('path');

      // Basic file name sanitization
      const sanitizedFileName = targetFileName.replace(/[^a-zA-Z0-9.-]/g, '_');

      // Check if file already exists in the appropriate subfolder
      const filePath = path.join(mediaPath, mediaTypeFolder, sanitizedFileName);
      if (fs.existsSync(filePath)) {
        throw new Error('A file with this name already exists');
      }

      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check if buffer is empty
      if (!buffer || buffer.length === 0) {
        throw new Error('Received empty file');
      }

      // Write file with error handling
      await fs.promises.writeFile(filePath, buffer);

      // Verify file was written
      if (!fs.existsSync(filePath)) {
        throw new Error('File was not written successfully');
      }

      return {
        success: true,
        filePath: filePath,
        fileName: sanitizedFileName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
};

module.exports = helpers;
