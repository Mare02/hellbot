const fs = require('fs');
const path = require('path');
const syslog = require('../commands/syslog');
const messages = require('../utils/messages');
require('dotenv').config();

module.exports = {
  logToSystem: async (message, logMessage) => {
    await syslog.execute(message, logMessage);
  },

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
    if (!args) {
      await interaction.editReply(content);
    } else {
      await interaction.reply(content);
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
}