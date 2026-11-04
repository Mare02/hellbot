const { usePrompt } = require('../services/AIservice');
const messages = require('../utils/messages');
const { characterPrompt } = require('../utils/aiPrompts');
const { sendDiscordContent } = require('../utils/discordMessages');

const REPLY_PROBABILITY = 0.6;

module.exports = {
  name: 'freewill',
  description: 'Allows the bot to respond randomly using AI based on chat context',
  system: true,
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      const prompt = 'Generate a relevant response to the current Discord conversation.';

      const aiResponse = await usePrompt(prompt, characterPrompt(), undefined, undefined, {
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
