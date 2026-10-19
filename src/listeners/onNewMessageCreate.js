const { MessageReferenceType } = require('discord.js');
const { withLogContext } = require('../services/logging');
const { getInstance } = require('../client');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/permissions');
const commands = require('../commands');
const updateslashcommands = require('../commands/slashCommands/updateslashcommands');
const freewill = require('../commands/freewill');
const askai = require('../commands/askai');
const { usePrompt } = require('../services/AIservice');
const { chatReplyPrompt } = require('../utils/aiPrompts');
const { getMessageImageUrl, hasOversizedImageAttachment, hasUnsupportedVisionAttachment, serializeMessageContent } = require('../services/chatContext');
const { sendDiscordContent } = require('../utils/discordMessages');
const { isGuildEnabled } = require('../utils/guildAccess');

const client = getInstance();

async function replyWithRecentContext(message) {
  const currentMessageContext = serializeMessageContent(message)
    || 'The user mentioned you or replied to you in the current Discord channel.';
  let imageUrl = getMessageImageUrl(message);
  const hasTooLargeImage = hasOversizedImageAttachment(message);
  const hasUnsupportedImage = hasUnsupportedVisionAttachment(message);
  let systemPrompt = chatReplyPrompt();

  if (message.reference?.messageId && message.reference.type !== MessageReferenceType.Forward) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      const referencedContent = serializeMessageContent(referencedMessage);
      if (referencedContent) {
        systemPrompt = `${systemPrompt}\n\nReferenced message:\n${referencedContent}`;
      }
      imageUrl = imageUrl || getMessageImageUrl(referencedMessage);
      if (hasOversizedImageAttachment(referencedMessage)) {
        systemPrompt = `${systemPrompt}\n\nReferenced image attachment was too large to inspect directly. Reply from the text context and mention that if needed.`;
      }
      if (hasUnsupportedVisionAttachment(referencedMessage)) {
        systemPrompt = `${systemPrompt}\n\nReferenced image attachment uses a format you cannot inspect directly. Reply from the text context and mention that if needed.`;
      }
    } catch (error) {
      console.error('Failed to fetch referenced message context:', error);
    }
  }

  if (hasTooLargeImage) {
    systemPrompt = `${systemPrompt}\n\nThe current image attachment was too large to inspect directly. Reply from the text context and mention that if needed.`;
  }

  if (hasUnsupportedImage) {
    systemPrompt = `${systemPrompt}\n\nThe current image attachment uses a format you cannot inspect directly. Reply from the text context and mention that if needed.`;
  }

  const aiResponse = await usePrompt(currentMessageContext, systemPrompt, imageUrl, undefined, {
    channel: message.channel,
    user: message.author,
    member: message.member,
    messageId: message.id,
  });
  const response = aiResponse || 'No response found from the AI.';

  await sendDiscordContent(message, response);
}

async function isReplyToBot(message) {
  if (!message.reference?.messageId || message.reference.type === MessageReferenceType.Forward) {
    return false;
  }

  try {
    const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
    return referencedMessage.author?.id === client.user.id;
  } catch (error) {
    console.error('Failed to fetch referenced message:', error);
    return false;
  }
}

module.exports = () => {
  client.on('messageCreate', async (message) => {
    if (message.system || message.author.bot) {
      return;
    }
    if (!isGuildEnabled(message.guildId)) return;

    // get command name + arguments
    const fullArgs = message.content.split(' ');
    const args = message.content.slice(config.commandsPrefix.length).split(/ +/);
    const commandName = args.shift();

    let command = commands[commandName];

    if (commandName === 'updateslashcommands') {
      command = updateslashcommands;
    }

    const mentionsBot = message.mentions.has(client.user.id);
    const repliesToBot = await isReplyToBot(message);

    if (config.features.mentionReplies && (mentionsBot || repliesToBot) && commandName !== askai.name) {
      try {
        await withLogContext({ component: 'ai', command: 'mentionReply' }, () => replyWithRecentContext(message));
      } catch (error) {
        console.error('AI response error:', error);
      }
      return;
    }

    if (
      config.features.randomReplies
      && Math.random() < config.behavior.randomReplyProbability
      && message.channel.name?.startsWith('general')
      && !message.mentions.has(client.user.id)
      && message.guild?.id === config.homeServerId
    ) {
      try {
        await withLogContext({ component: 'ai', command: 'freewill' }, () => freewill.execute(message, []));
      }
      catch (error) {
        console.error('Error executing random freewill command:', error);
      }
    }

    if (!message.content.startsWith(config.commandsPrefix)) {
      return;
    };

    if (command) {
      if (command.perm && !hasPermission(command.perm, message)) {
        message.channel.send(messages.system.noPermission);
        return;
      }

      if (commandName === 'updateslashcommands') {
        await command.execute(message, false);
        return;
      }

      try {
        await withLogContext({ component: 'commands', command: commandName }, () => command.execute(message, args));
      } catch (error) {
        withLogContext({ component: 'commands', command: commandName }, () => console.error('Prefix command failed', { error }));
      }
    }
  });
};
