require('dotenv').config();
const { getInstance } = require('../client');
const { formatDate } = require('../utils/helpers');
const { embedColor } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'onthisday',
  description: 'Returns an event that happened on this day in history to all servers.',
  async execute(message, args, isSentAsScheduledTask) {
    try {
      const today = new Date();
      const month = today.getMonth();
      const day = today.getDate();

      BASE_URL = 'https://api.api-ninjas.com/v1/historicalevents';
      const url = `${BASE_URL}?month=${month + 1}&day=${day}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.NINJA_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        if (!isSentAsScheduledTask) {
          message.channel.send(`No events found for this day: ${formatDate(day, month)}`);
          return;
        }
      }

      const event = data[Math.floor(Math.random() * data.length)];

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`On this day: ${formatDate(day, month, event.year)}`)
        .setDescription(event.event);

      if (isSentAsScheduledTask) {
        const client = getInstance();

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
      } else {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
    }
  },
};