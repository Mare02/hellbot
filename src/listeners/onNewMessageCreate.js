const { getInstance } = require('../client');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/roles');
const commands = require('../commands');
const updateslashcommands = require('../commands/slashCommands/updateslashcommands');
const freewill = require('../commands/freewill');
const askai = require('../commands/askai');
const { usePrompt } = require('../services/AIservice');
const { brainRotPrompt } = require('../utils/aiPrompts');
const { discordMsgLengthLimit } = require('../utils/config');

const client = getInstance();

const RANDOM_FREEWILL_PROBABILITY = 0.05;
const MAX_MESSAGES_HISTORY = 15;

async function replyWithRecentContext(message) {
  const recentMessages = await message.channel.messages.fetch({ limit: MAX_MESSAGES_HISTORY });
  const conversation = recentMessages
    .reverse()
    .map(m => `${m.author.username}: ${m.content}`)
    .join('\n');

  const prompt = brainRotPrompt(conversation);
  const aiResponse = await usePrompt(prompt);
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
