const { usePrompt } = require('../services/AIservice');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');
const { MODERATOR } = require('../utils/roles');
const { brainRotPrompt } = require('../utils/aiPrompts');
const config = require('../utils/config');

const MAX_MESSAGES_HISTORY = 15;
const REPLY_PROBABILITY = 0.6;
const SLANG_RESPONSES = [
  "cap",
  "fr",
  "no cap",
  "based",
  "bruh",
  "sheesh",
  "on god",
  "deadass",
  "lmaooo",
  "bro fr",
  "im dead 💀",
  "💀💀💀",
  "💀",
];
const RANDOM_SLANG_PROBABILITY = 0.3;

module.exports = {
  name: 'freewill',
  description: 'Allows the bot to respond randomly using AI based on chat context',
  system: true,
  perm: MODERATOR,
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      // Random chance to use a predefined slang response
      if (Math.random() < RANDOM_SLANG_PROBABILITY) {
        const randomIndex = Math.floor(Math.random() * SLANG_RESPONSES.length);
        const slangResponse = SLANG_RESPONSES[randomIndex];

        if (Math.random() < REPLY_PROBABILITY && interaction.originalMessage) {
          await interaction.originalMessage.reply(slangResponse);
        } else {
          await interaction.channel.send(slangResponse);
        }

        return;
      }

      // Get message history for context
      const messagesHistory = await interaction.channel.messages.fetch({ limit: MAX_MESSAGES_HISTORY });
      const conversation = messagesHistory
        .reverse()
        .map(m => `${m.author.username}: ${m.content}`)
        .join('\n');

      const prompt = brainRotPrompt(conversation);

      const aiResponse = await usePrompt(prompt);
      const finalResponse = aiResponse || messages.emptyState.noResponseAI;

      // Handle different types of responses based on how the command was triggered
      if (Math.random() < REPLY_PROBABILITY && interaction.originalMessage) {
        await interaction.originalMessage.reply(finalResponse);
      } else {
        await interaction.channel.send(finalResponse);
      }
    }
    catch (error) {
      console.error(error);
    }
  },
};
