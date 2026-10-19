const { initializeRuntimeConfig } = require('../services/config/runtime');
const { getInstance } = require('../client');
const config = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  description: 'Sends a random quote to general channel in all servers.',
  async execute() {
    const client = getInstance();

    try {
      const response = await fetch('https://api.api-ninjas.com/v2/randomquotes', {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
          'X-Api-Key': initializeRuntimeConfig().nextKey('apininjas'),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (
        !Array.isArray(data) ||
        typeof data[0]?.quote !== 'string' ||
        typeof data[0]?.author !== 'string'
      ) {
        throw new Error('The quotes API returned an invalid response.');
      }
      const quote = data[0].quote;
      const author = data[0].author;

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('Daily Quote!')
        .setDescription(`"${quote}"`)
        .setFooter({ text: author });

      const guilds = await client.guilds.fetch();
      if (!guilds.size) {
        return;
      }

      for (const [guildId, guild] of guilds) {
        if (guildId === config.testingServerId) {
          continue;
        }

        const fetchedGuild = await client.guilds.fetch(guildId);
        const channels = await fetchedGuild.channels.fetch();
        const generalChannel = channels.find(
          (channel) => channel.type === 0 && channel.name.startsWith('general')
        );

        try {
          if (generalChannel) {
            await generalChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          if (generalChannel.guild) {
            console.error(
              `Failed to send message in guild: ${generalChannel.guild.name} (ID: ${generalChannel.guild.id})`
            );
          }
          continue;
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};
