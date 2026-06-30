const { EmbedBuilder } = require('discord.js');
const { getInstance } = require('../client');
const AIservice = require('../services/AIservice');
const { futureNewsResponseFormat } = require('../utils/aiSchemas');
const { futureNewsPrompt } = require('../utils/aiPrompts');
const { embedColor, testingServerId } = require('../utils/config');

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

    try {
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
        .setColor(embedColor)
        .setTitle(`News from the future: ${formattedDate}`)
        .addFields(
          { name: 'Society', value: news.society.trim() },
          { name: 'Tech', value: news.tech.trim() },
          { name: 'Finance', value: news.finance.trim() },
          { name: 'Science', value: news.science.trim() }
        );

      const guilds = await client.guilds.fetch();
      if (!guilds.size) {
        return;
      }

      for (const [guildId] of guilds) {
        if (guildId === testingServerId) {
          continue;
        }

        try {
          const guild = await client.guilds.fetch(guildId);
          const channels = await guild.channels.fetch();
          const generalChannel = channels.find(channel =>
            channel.type === 0 && channel.name.startsWith('general')
          );

          if (generalChannel) {
            await generalChannel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error(`Failed to send future news in guild ${guildId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to generate daily future news:', error);
    }
  },
};
