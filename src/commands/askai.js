require('dotenv').config();
const { usePrompt } = require('../services/AIservice');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      let prompt = args.join(' ');
      if (message.reference) {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        prompt = `"${referencedMessage.content}", ${prompt}`;
      }
      const answer = await usePrompt(prompt);
      message.channel.send(answer);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
