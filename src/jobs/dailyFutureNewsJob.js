const { EmbedBuilder } = require('discord.js');
const { isGuildEnabled } = require('../utils/guildAccess');
const { getInstance } = require('../client');
const AIservice = require('../services/AIservice');
const { futureNewsResponseFormat } = require('../utils/aiSchemas');
const { futureNewsPrompt } = require('../utils/aiPrompts');
const config = require('../utils/config');

function getRandomFutureDate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const latestDate = new Date(now);
  latestDate.setFullYear(latestDate.getFullYear() + 3000);

  const timestamp = tomorrow.getTime()
    + Math.random() * (latestDate.getTime() - tomorrow.getTime());

  return new Date(timestamp);
}

module.exports = {
  description: 'Sends AI-generated news from the future to general channels.',
  async execute() {
    const client = getInstance();

    const futureDate = getRandomFutureDate();
    const formattedDate = futureDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const response = await AIservice.usePrompt(
      futureNewsPrompt(formattedDate),
      null,
      null,
      futureNewsResponseFormat
    );
    const news = JSON.parse(response);
    const categories = ['society', 'tech', 'finance', 'science'];

    if (categories.some(category =>
      typeof news[category] !== 'string' || !news[category].trim()
    )) {
      throw new Error('AI response is missing one or more news categories');
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`News from the future: ${formattedDate}`)
      .addFields(categories.map(category => ({
        name: `${category[0].toUpperCase()}${category.slice(1)}`,
        value: news[category].trim().slice(0, 1024),
      })));

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
        const generalChannel = channels.find(channel =>
          channel.type === 0 && channel.name.startsWith('general')
        );

        if (!generalChannel) throw new Error('No general text channel was found.');
        await generalChannel.send({ embeds: [embed] });
      } catch (error) {
        failedGuildIds.push(guildId);
        console.error('Future news delivery failed for guild.', {
          guildId,
          guildName: guild.name,
          error,
        });
      }
    }
    return { attemptedGuilds, failedGuildIds };
  },
};
