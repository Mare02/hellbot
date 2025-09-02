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
    if (message.channel.guild.id !== config.homeServerId) return;

    const serverWelcomeMessage = `Welcome to the server! Use /verify command for automatic verification. In case the slash command is not working, use the :verify command (ex. ${config.commandsPrefix}verify [age] [invite source]).`;

    try {
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(serverWelcomeMessage)
        .setImage(gifs.serverWelcomeGif);

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      message.channel.send(serverWelcomeMessage);
    }
  },
};
