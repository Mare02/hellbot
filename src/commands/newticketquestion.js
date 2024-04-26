const { EmbedBuilder } = require('discord.js');
const messages = require('../utils/messages');
const { usePrompt } = require('../services/AIservice');
const config = require('../utils/config');
const gifs = require('../data/gifs');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'newticketquestion',
  description: "Displays a verification question for new members in tickets.",
  perm: MODERATOR,
  async execute(message) {
    if (config.ticketMessageServerBlacklist.includes(message.channel.guild.id)) return;

    try {
      const systemPrompt = `
        Make this message seem more natural and human like.
        Make sure to make server invite source and the exact age questions clear.
        Dont use "".
        Display just this message in the output without any other text.
      `;
      const aiMessage = await usePrompt(
        messages.welcome.newTicketMessage,
        systemPrompt
      );

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(messages.welcome.serverWelcome)
        .setDescription(
          aiMessage && aiMessage.length
            ? aiMessage
            : messages.welcome.newTicketMessage
        )
        .setImage(gifs.serverWelcomeGif);

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      message.channel.send(messages.welcome.newTicketMessage);
    }
  },
};
