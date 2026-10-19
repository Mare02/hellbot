const { EmbedBuilder } = require('discord.js');
const { initializeRuntimeConfig } = require('../services/config/runtime');
const config = require('../utils/config');

module.exports = {
  name: 'latestnews',
  description: 'Displays the latest news.',
  slash: true,
  params: [
    {
      name: 'query',
      description: 'Search query for the news titles.',
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      let queryInput;
      if (!args) {
        queryInput = interaction.options.getString('query');
      } else {
        queryInput = args.join(' ');
      }

      if (args && !queryInput.length) {
        interaction.channel.send('Please provide a search query.');
        return;
      }

      if (!args) await interaction.deferReply();
      const url = new URL('https://newsapi.org/v2/top-headlines');
      url.search = new URLSearchParams({ q: queryInput, pageSize: '3' }).toString();
      const response = await fetch(url, {
        headers: { 'X-Api-Key': initializeRuntimeConfig().nextKey('newsapi') },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error(`NewsAPI returned HTTP ${response.status}.`);
      const data = await response.json();

      if (data.status !== 'ok' || !Array.isArray(data.articles)) {
        throw new Error('NewsAPI returned an invalid response.');
      }
      const embeds = [];

      for (const article of data.articles) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle(article.title)
          .setURL(article.url)
          .setAuthor({ name: article.author || 'Unknown Author' })
          .setDescription(article.description)
          .setThumbnail(article.urlToImage);

        embeds.push(embed);
      }

      const news = embeds.length ? { embeds } : 'No articles found.';

      if (!args) {
        await interaction.editReply(news);
      } else {
        await interaction.channel.send(news);
      }
    } catch (error) {
      console.error(error);
      if (!args) {
        const message = 'Could not load news. Check the API key and provider availability.';
        if (interaction.deferred) await interaction.editReply(message);
        else await interaction.reply(message);
      } else {
        await interaction.channel.send(
          'Could not load news. Check the API key and provider availability.'
        );
      }
    }
  },
};
