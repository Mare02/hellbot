require('dotenv').config();
const { usePrompt } = require('../services/AIservice');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const answer = await usePrompt(args.join(' '));
      message.channel.send(answer);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
