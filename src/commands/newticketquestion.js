const { EmbedBuilder } = require('discord.js');
const messages = require('../utils/messages');
const { usePrompt } = require('../services/AIservice');
const config = require('../utils/config');
const gifs = require('../data/gifs');

module.exports = {
  name: 'newmemberquestion',
  description: "Displays a verification question for new members in tickets.",
  async execute(message) {
    try {
      const modifiedMessageData = await usePrompt(`
        Make this message seem more natural and human like: ${messages.welcome.newTicketMessage}.
        Make sure to make server invite source and the exact age questions clear.
        Dont use "".
        Display me just this message in the output without any other text.
      `);
      const success = modifiedMessageData && modifiedMessageData.choices && modifiedMessageData.choices[0].message;

      let aiMessage = undefined;
      if (success) {
        aiMessage = modifiedMessageData.choices[0].message.content;
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(messages.welcome.serverWelcome)
        .setDescription(aiMessage && aiMessage.length ? aiMessage : messages.welcome.newTicketMessage)
        .setImage(gifs.serverWelcomeGif);

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      message.channel.send(messages.welcome.newTicketMessage);
    }
  },
};
