require('dotenv').config();
const { getInstance } = require('../client');
const { homeServerId, generalChannelId, embedColor } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  description: 'Fetches a random fact and sends it to general channel.',
  async execute() {
    const client = getInstance();

    const guild = await client.guilds.fetch(homeServerId);
    if (!guild) {
      return;
    }

    const channel = await guild.channels.fetch(generalChannelId);
    if (!channel) {
      return;
    }

    try {
      const response = await fetch('https://api.api-ninjas.com/v1/facts', {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.NINJA_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      const fact = data[0].fact;

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('Daily Fact!')
        .setDescription(fact)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
    }
  },
};
