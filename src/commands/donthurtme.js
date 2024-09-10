const gifs = require('../data/gifs');

module.exports = {
  name: 'donthurtme',
  description: "Displays a radom Mike O'Hearn gif.",
  slash: true,
  async execute(interaction, args) {
    try {
      const randomIndex = Math.floor(Math.random() * gifs.mikeoHearnGifs.length);
      const randomGifUrl = gifs.mikeoHearnGifs[randomIndex];

      if (!args) {
        interaction.reply(randomGifUrl);
      } else {
        interaction.channel.send(randomGifUrl);
      }


    } catch (error) {
      console.error(error);
      if (!args) {
        interaction.reply(error.message);
      } else {
        interaction.channel.send(error.message);
      }
    }
  },
};
