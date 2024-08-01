require('dotenv').config();
const { usePrompt } = require('../services/AIservice');
const { handleUserPromptInput } = require('../utils/helpers');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      let prompt = await handleUserPromptInput(args.join(' '), message.channel);
      if (!prompt) return;

      let systemPrompt;
      if (message.reference) {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        systemPrompt = referencedMessage.content;
      }
      const answer = await usePrompt(prompt, systemPrompt);
      message.channel.send(answer);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
