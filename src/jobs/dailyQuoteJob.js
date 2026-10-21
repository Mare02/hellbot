const { initializeRuntimeConfig } = require('../services/config/runtime');
const { getInstance } = require('../client');
const config = require('../utils/config');
const { EmbedBuilder } = require('discord.js');
const { isGuildEnabled } = require('../utils/guildAccess');

module.exports = {
  description: 'Sends a random quote to general channel in all servers.',
  async execute() {
    const client = getInstance();

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
      return { attemptedGuilds: 0, failedGuildIds: [] };
    }

    let attemptedGuilds = 0;
    const failedGuildIds = [];
    for (const [guildId, guild] of guilds) {
      if (guildId === config.testingServerId || !isGuildEnabled(guildId)) {
        continue;
      }

      attemptedGuilds += 1;
      try {
        const fetchedGuild = await client.guilds.fetch(guildId);
        const channels = await fetchedGuild.channels.fetch();
        const generalChannel = channels.find(
          (channel) => channel.type === 0 && channel.name.startsWith('general')
        );

        if (!generalChannel) throw new Error('No general text channel was found.');
        await generalChannel.send({ embeds: [embed] });
      } catch (error) {
        failedGuildIds.push(guildId);
        console.error('Daily quote delivery failed for guild.', {
          guildId,
          guildName: guild.name,
          error,
        });
      }
    }
    return { attemptedGuilds, failedGuildIds };
  },
};
