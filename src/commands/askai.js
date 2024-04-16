require('dotenv').config();
const config = require('../utils/config');
const { usePrompt } = require('../services/AIservice');
const messages = require('../utils/messages');

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
