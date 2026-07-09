const { getInstance } = require('../client');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/roles');
const commands = require('../commands');
const updateslashcommands = require('../commands/slashCommands/updateslashcommands');
const freewill = require('../commands/freewill');
const askai = require('../commands/askai');
const { usePrompt } = require('../services/AIservice');
const { chatReplyPrompt } = require('../utils/aiPrompts');
const { getMessageImageUrl, hasOversizedImageAttachment, hasUnsupportedVisionAttachment } = require('../services/chatContext');
const { discordMsgLengthLimit } = require('../utils/config');

const client = getInstance();

const RANDOM_FREEWILL_PROBABILITY = 0.05;

async function replyWithRecentContext(message) {
  const currentMessageContext = message.content?.trim()
    || 'The user mentioned you or replied to you in the current Discord channel.';
  let imageUrl = getMessageImageUrl(message);
  const hasTooLargeImage = hasOversizedImageAttachment(message);
  const hasUnsupportedImage = hasUnsupportedVisionAttachment(message);
  let systemPrompt = chatReplyPrompt();

  if (!imageUrl && message.reference?.messageId) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      imageUrl = getMessageImageUrl(referencedMessage);
      if (hasOversizedImageAttachment(referencedMessage)) {
        systemPrompt = `${systemPrompt}\n\nReferenced image attachment was too large to inspect directly. Reply from the text context and mention that if needed.`;
      }
    } catch (error) {
      console.error('Failed to fetch referenced message image context:', error);
    }
  }

  if (hasTooLargeImage) {
    systemPrompt = `${systemPrompt}\n\nThe current image attachment was too large to inspect directly. Reply from the text context and mention that if needed.`;
  }

  if (hasUnsupportedImage) {
    systemPrompt = `${systemPrompt}\n\nThe current image attachment is an animated GIF, which you cannot inspect directly. Reply from the text context and mention that if needed.`;
  }

  const aiResponse = await usePrompt(currentMessageContext, systemPrompt, imageUrl, undefined, {
    channel: message.channel,
  });
  const response = aiResponse || 'No response found from the AI.';

  const truncatedResponse = response.length > discordMsgLengthLimit
    ? `${response.substring(0, discordMsgLengthLimit - 3)}...`
    : response;

  await message.reply(truncatedResponse);
}

async function isReplyToBot(message) {
  if (!message.reference?.messageId) {
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

    if ((mentionsBot || repliesToBot) && commandName !== askai.name) {
      try {
        await replyWithRecentContext(message);
      } catch (error) {
        console.error('AI response error:', error);
      }
      return;
    }

    if (message.author.bot) {
      return;
    };

    if (
      Math.random() < RANDOM_FREEWILL_PROBABILITY
      && message.channel.name.startsWith('general')
      && !message.mentions.has(client.user.id)
      && message.guild.id === config.homeServerId
    ) {
      try {
        await freewill.execute(message, []);
      }
      catch (error) {
        console.error('Error executing random freewill command:', error);
      }
    }

    if (!message.content.startsWith(config.commandsPrefix)) {
      return;
    };

    if (command) {
      if (command.perm && !hasPermission(command.perm, message.author.id)) {
        message.channel.send(messages.system.noPermission);
        return;
      }

      await command.execute(message, args);
    }
  });
};
