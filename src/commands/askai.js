require('dotenv').config();
const config = require('../utils/config');
const aiModels = require('../utils/aiModels');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const question = args.join(' ');
      const model = aiModels.googleGemma;
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": model,
          "messages": [
            {"role": "user", "content": question},
          ],
        })
      });

      const data = await response.json();

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
