require('dotenv').config();
const { getInstance } = require('../client');
const { embedColor } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  description: 'Sends a random fact to general channel in all servers.',
  async execute() {
    const client = getInstance();

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

      const guilds = await client.guilds.fetch();
      if (!guilds.size) {
        return;
      }

      for (const [guildId, guild] of guilds) {
        const fetchedGuild = await client.guilds.fetch(guildId);
        const channels = await fetchedGuild.channels.fetch();
        const generalChannel = channels.find(channel =>
          channel.type === 0 && channel.name.startsWith('general')
        );

        if (generalChannel) {
          await generalChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};
