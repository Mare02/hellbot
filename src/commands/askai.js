const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const question = args.join(' ');

      console.log(question);

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
          .setColor('#007bff')
          .setTitle(data.error.message);
        message.channel.send({embed});
        return;
      }

      const responseMessage = data.choices[0].message;

      console.log(responseMessage);

      // const embed = new EmbedBuilder()
      //   .setColor('#007bff')
      //   .setTitle(data.choices[0].message.content)
      message.channel.send(responseMessage);
    }
    catch (error) {
      console.log(error);
    }
  },
};
