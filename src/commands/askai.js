const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const config = require('../utils/config');

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const question = args.join(' ');

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "google/gemma-7b-it:free",
          "messages": [
            {"role": "user", "content": question},
          ],
        })
      });

      const data = await response.json();

      if (data.error) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle(data.error.message);
        message.channel.send({embed});
        return;
      }

      if (!data.choices) {
        message.channel.send('No response found from the AI.');
        return;
      }

      // Check for message property in the first choice
      const answer = data.choices[0]?.message;

      if (!answer) {
        message.channel.send('An error occurred while processing the response.');
        return;
      }

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
