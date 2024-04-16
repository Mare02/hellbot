const gifs = require('../data/gifs');

module.exports = {
  name: 'donthurtme',
  description: "Displays a radom Mike O'Hearn gif.",
  async execute(message, args) {
    try {
      const randomIndex = Math.floor(Math.random() * gifs.mikeoHearnGifs.length);
      const randomGifUrl = gifs.mikeoHearnGifs[randomIndex];

      message.channel.send(randomGifUrl);

    } catch (error) {
      console.error(error);
      message.channel.send(error.message);
    }
  },
};
