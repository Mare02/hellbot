const { EmbedBuilder } = require('discord.js');
const messages = require('../utils/messages');
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
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(messages.welcome.serverWelcome)
        .setDescription(messages.welcome.newTicketMessage)
        .setImage(gifs.serverWelcomeGif);

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      message.channel.send(messages.welcome.newTicketMessage);
    }
  },
};
