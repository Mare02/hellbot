const { EmbedBuilder } = require('discord.js');
require('dotenv').config();
const config = require('../utils/config');
const moment = require('moment');

module.exports = {
  name: 'latestnews',
  description: 'Displays the latest news.',
  slash: true,
  params: [
    {
      name: 'query',
      description: 'Search query for the news titles.',
      required: true,
    }
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

      const monthAgo = moment().subtract(1, 'month').format('YYYY-MM-DD');
      const query = `q=${queryInput}`;
      const sortBy = 'sortBy=popularity';
      const from = `from=${monthAgo}`;
      const pageSize = `pageSize=3`;
      const apiKey = `apiKey=${process.env.NEWS_API_KEY}`;
      const url = `https://newsapi.org/v2/top-headlines?${apiKey}&${query}&${from}&${sortBy}&${pageSize}`;

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

      const news = embeds.length
        ? { embeds }
        : 'No articles found.'

      if(!args){
        interaction.reply(news);
      } else {
        interaction.channel.send(news);
      }
    } catch (error) {
      console.error(error);
      if(!args){
        interaction.reply(error.message);
      } else {
        interaction.channel.send(error.message);
      }
    }
  },
};
