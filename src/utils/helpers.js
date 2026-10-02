const fs = require('fs');
const messages = require('../utils/messages');
const { sendDiscordContent } = require('./discordMessages');
const { getMessageContent } = require('./messageContent');

require('dotenv').config();

const helpers = {
  validateUserPromptInput: (promptInput, channel) => {
    const prompt = promptInput.trim();
    if (prompt === '' || /^\s+$/.test(prompt)) {
      channel.send('Please provide a prompt!');
      return;
    }
    return prompt;
  },

  reply: async (interaction, args, content) => {
    await sendDiscordContent(interaction, content);
  },

  forwardAttachmentsToChannel: async (message, args, channelId, mediaType) => {
    try {
      if (!message.reference) {
        message.channel.send(messages.emptyState.noAttachmentInReply);
        return;
      }

      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      const { attachments } = getMessageContent(repliedMessage);

      if (!attachments.length) {
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

};

module.exports = helpers;
