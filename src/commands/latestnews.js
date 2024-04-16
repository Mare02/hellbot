const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const config = require('../utils/config');

module.exports = {
  name: 'latestnews',
  description: 'Displays the latest news.',
  async execute(message, args) {
    try {
      const query = `q=${args.join(' ')}`;
      const sortBy = 'sortBy=popularity';
      const from = `from=2024-03-16`;
      const pageSize = `pageSize=3`;
      const apiKey = `apiKey=${process.env.NEWS_API_KEY}`;
      const url = `https://newsapi.org/v2/top-headlines?${apiKey}&${query}&${from}&${sortBy}&${pageSize}`;

      if (args.join(' ').length === 0) {
        return message.channel.send('Please provide a search query.');
      }

      const response = await fetch(url);
      const data = await response.json();

      const embeds = [];

      for (const article of data.articles) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle(article.title)
          .setURL(article.url)
          .setAuthor({ name: article.author || 'Unknown Author' })
          .setDescription(article.description)
          .setThumbnail(article.urlToImage)

        embeds.push(embed);
      }

      await message.channel.send(
        embeds.length
          ? { embeds }
          : 'No articles found.'
      );
    } catch (error) {
      console.error(error);
      message.channel.send(error.message);
    }
  },
};
