require('dotenv').config();
const { usePrompt } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');

module.exports = {
  name: 'askai',
  description: "Prompts AI to answer a question",
  slash: true,
  params: [
    {
      name: 'prompt',
      description: "The prompt to send to the AI",
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      let userInput;
      if (args) {
        userInput = args.join(' ');
      } else {
        userInput = interaction.options.getString('prompt');
      }

      let prompt = validateUserPromptInput(userInput, interaction.channel);
      if (!prompt) return;

      let systemPrompt;
      if (interaction.reference) {
        const referencedMessage = await interaction.channel.messages.fetch(interaction.reference.messageId);
        systemPrompt = referencedMessage.content;
      }
      const answer = await usePrompt(prompt, systemPrompt);
      if (!args) {
        await interaction.editReply(answer);
      } else {
        await interaction.reply(answer);
      }
    }
    catch (error) {
      console.error(error);
      if (!args) {
        await interaction.editReply(error.message);
      } else {
        await interaction.reply(error.message);
      }
    }
  },
};
