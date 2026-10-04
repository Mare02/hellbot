const { usePrompt } = require('../services/AIservice');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');
const { MODERATOR } = require('../utils/roles');
const { brainRotPrompt } = require('../utils/aiPrompts');
const { sendDiscordContent } = require('../utils/discordMessages');

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
  ':wilted_rose:',
];
const RANDOM_SLANG_PROBABILITY = 0.3;

module.exports = {
  name: 'freewill',
  description: 'Allows the bot to respond randomly using AI based on chat context',
  system: true,
  perm: MODERATOR,
  async execute(interaction, args) {
    try {
      const originalMessage = interaction.originalMessage || (interaction.author ? interaction : null);

      if (!args) {
        await interaction.deferReply();
      }

      // Random chance to use a predefined slang response
      if (Math.random() < RANDOM_SLANG_PROBABILITY) {
        const randomIndex = Math.floor(Math.random() * SLANG_RESPONSES.length);
        const slangResponse = SLANG_RESPONSES[randomIndex];

        if (slangResponse === ':wilted_rose:' && originalMessage) {
          await originalMessage.reply(slangResponse);
        } else if (Math.random() < REPLY_PROBABILITY && interaction.originalMessage) {
          await interaction.originalMessage.reply(slangResponse);
        } else {
          await interaction.channel.send(slangResponse);
        }

        return;
      }

      const prompt = 'Generate a relevant response to the current Discord conversation.';

      const aiResponse = await usePrompt(prompt, brainRotPrompt(), undefined, undefined, {
        channel: interaction.channel,
        user: interaction.author || interaction.user,
        member: interaction.member,
        allowMemoryAccess: false,
      });
      const finalResponse = aiResponse || messages.emptyState.noResponseAI;

      // Handle different types of responses based on how the command was triggered
      if (Math.random() < REPLY_PROBABILITY && interaction.originalMessage) {
        await sendDiscordContent(interaction.originalMessage, finalResponse);
      } else {
        await sendDiscordContent(interaction.channel, finalResponse);
      }
    }
    catch (error) {
      console.error(error);
    }
  },
};
