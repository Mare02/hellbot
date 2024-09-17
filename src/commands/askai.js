require('dotenv').config();
const { usePrompt } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');

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

      if (!userInput || !userInput.length) {
        return await reply(interaction, args, messages.inputError.noPrompt);
      };

      let prompt = validateUserPromptInput(userInput, interaction.channel);

      let systemPrompt;
      let imageUrl;
      if (interaction.reference) {
        const referencedMessage = await interaction.channel.messages.fetch(interaction.reference.messageId);

        if (referencedMessage.attachments && referencedMessage.attachments.size) {
          if (referencedMessage.attachments.first().url) {
            imageUrl = referencedMessage.attachments.first().url;
          }
        } else {
          systemPrompt = referencedMessage.content;
        }
      }

      const answer = await usePrompt(prompt, systemPrompt, imageUrl);
      await reply(interaction, args, answer);
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
