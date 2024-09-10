module.exports = {
  name: 'mariofacts',
  description: "Displays a random fact about Mario (SFS Master).",
  slash: true,
  async execute(interaction, args) {
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

      const marioFact = data.value.replace(/chuck norris/gi, 'Mario').replace(/chuck/gi, 'Mario');

      if (!args) {
        interaction.reply(marioFact);
      } else {
        interaction.channel.send(marioFact);
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
