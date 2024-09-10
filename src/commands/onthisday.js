require('dotenv').config();
const { getInstance } = require('../client');
const { formatDate } = require('../utils/helpers');
const { embedColor } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'onthisday',
  description: 'Displays an event that happened on this day in history.',
  slash: true,
  async execute(interaction, args, isSentAsScheduledTask) {
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
        const message = `No events found for this day: ${formatDate(day, month)}`;
        if (!isSentAsScheduledTask) {
          if (!args) {
            interaction.reply(message);
          } else {
            interaction.channel.send(message);
          }
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
        if (!args) {
          interaction.reply({ embeds: [embed] });
        } else {
          interaction.channel.send({ embeds: [embed] });
        }
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
