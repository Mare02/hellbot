require('dotenv').config();
const config = require('../utils/config');
const { prompt } = require('../utils/useAI');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const data = await prompt(args.join(' '));

      if (data.error) {
        await message.channel.send(data.error.message);
        return;
      }

      if (!data.choices || !data.choices[0].message) {
        await message.channel.send('No response found from the AI.');
        return;
      }

      const answer = data.choices[0].message.content;

      const truncatedAnswer = answer.length > config.discordMsgLengthLimit
        ? `${answer.substring(0, config.discordMsgLengthLimit - 3)}...`
        : answer;

      message.channel.send(truncatedAnswer);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
