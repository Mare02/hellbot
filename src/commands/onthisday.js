require('dotenv').config();
const { getInstance } = require('../client');
const { formatDate } = require('../utils/helpers');
const { homeServerId, generalChannelId, embedColor } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'onthisday',
  description: 'Returns an event that happened on this day in history.',
  async execute(message, args, isSentAsScheduledTask) {
    let channel;
    if (isSentAsScheduledTask) {
      const client = getInstance();

      const guild = await client.guilds.fetch(homeServerId);
      if (!guild) {
        return;
      }

      channel = await guild.channels.fetch(generalChannelId);
      if (!channel) {
        return;
      }
    }

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      BASE_URL = 'https://api.api-ninjas.com/v1/historicalevents';
      const url = `${BASE_URL}?month=${month}&day=${day}`;

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

      if (!isSentAsScheduledTask && data.length === 0) {
        message.channel.send(`No events found for this day: ${formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())}`);
        return;
      }

      const event = data[Math.floor(Math.random() * data.length)];

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`On this day: ${formatDate(event.year, event.month, event.day)}`)
        .setDescription(event.event);

      if (isSentAsScheduledTask) {
        await channel.send({ embeds: [embed] });
      } else {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
    }
  },
};
