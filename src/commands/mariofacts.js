const gifs = require('../data/mikeOhearnGifsList');

module.exports = {
  name: 'mariofacts',
  description: "Displays a random fact about Mario (SFS Master).",
  async execute(message, args) {
    try {
      const response = await fetch('https://matchilling-chuck-norris-jokes-v1.p.rapidapi.com/jokes/random', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-RapidAPI-Key': 'd61048fa74mshbc54e5a433d1293p11ed79jsn3441e32f95b8',
          'X-RapidAPI-Host': 'matchilling-chuck-norris-jokes-v1.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      const data = await response.json();
      const rawText = data.value;

      const marioFact = rawText.replace(/chuck norris/gi, 'Mario').replace(/chuck/gi, 'Mario');

      message.channel.send(marioFact);

    } catch (error) {
      console.error(error);
    }
  },
};
