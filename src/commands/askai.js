require('dotenv').config();
const { usePrompt } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');

module.exports = {
  name: 'askai',
  description: "Prompts AI to answer a question",
  params: [
    {
      name: 'prompt',
      description: "The prompt to send to the AI",
      required: true,
    },
  ],
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const question = interaction.options.getString('prompt');

      let prompt = validateUserPromptInput(question, interaction.channel);
      if (!prompt) return;

      let systemPrompt;
      if (interaction.reference) {
        const referencedMessage = await interaction.channel.messages.fetch(interaction.reference.messageId);
        systemPrompt = referencedMessage.content;
      }
      const answer = await usePrompt(prompt, systemPrompt);
      await interaction.editReply(answer);
    }
    catch (error) {
      console.log(error);
      await interaction.editReply(error.message);
    }
  },
};
