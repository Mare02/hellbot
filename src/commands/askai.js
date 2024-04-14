require('dotenv').config();
const config = require('../utils/config');
const aiModels = require('../utils/aiModels');
const { prompt } = require('../utils/useAI');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const data = await prompt(args.join(' '));

      if (data.error) {
        message.channel.send(data.error.message);
        return;
      }

      if (!data.choices) {
        message.channel.send('No response found from the AI.');
        return;
      }

      const answer = data.choices[0]?.message;

      const truncatedAnswer = answer.content.length > config.discordMsgLengthLimit
        ? `${answer.content.substring(0, config.discordMsgLengthLimit - 3)}...`
        : answer.content;

      message.channel.send(truncatedAnswer);
    }
    catch (error) {
      console.log(error);
    }
  },
};
