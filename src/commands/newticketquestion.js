const { EmbedBuilder } = require('discord.js');
const messages = require('../utils/messages');
const { prompt } = require('../utils/useAI');
const config = require('../utils/config');

module.exports = {
  name: 'newmemberquestion',
  description: "Displays a verification question for new members in tickets.",
  async execute(message) {
    try {
      const modifiedMessageData = await prompt(`
        Make this message seem more natural and human like: ${messages.newTicketMessage}.
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
        .setTitle('Welcome to the server!')
        .setDescription(aiMessage && aiMessage.length ? aiMessage : messages.newTicketMessage)
        .setImage('https://media1.tenor.com/m/g2TTJPBB-MAAAAAd/mikeohearn.gif');

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      message.channel.send(messages.newTicketMessage);
    }
  },
};
