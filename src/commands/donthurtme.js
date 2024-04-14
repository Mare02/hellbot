const gifs = require('../data/mikeOhearnGifsList');

module.exports = {
  name: 'donthurtme',
  description: "Displays a radom Mike O'Hearn gif.",
  async execute(message, args) {
    try {
      const randomIndex = Math.floor(Math.random() * gifs.length);
      const randomGifUrl = gifs[randomIndex];

      message.channel.send(randomGifUrl);

    } catch (error) {
      console.error(error);
    }
  },
};
