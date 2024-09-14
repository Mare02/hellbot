const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');

module.exports = {
  name: 'getcoin',
  description: 'Get the crypto coin stats.',
  slash: true,
  params: [
    {
      name: 'coin',
      description: 'The coin to get the stats for.',
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      let coin;
      if (args) {
        coin = args.join('-').toLowerCase();
      } else {
        coin = interaction.options.getString('coin');
        coin = coin.split(' ').join('-').toLowerCase();
      }

      if (!coin) {
        await reply(interaction, args, 'Please provide a coin name.');
        return;
      }

      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}`);
      const data = await response.json();

      if (!data || data.error) {
        await reply(interaction, args, messages.errorState.apiError);
        return;
      }

      const price = Number(data.market_data.current_price.eur)
        .toLocaleString('en-US', { style: 'currency', currency: 'EUR' });

      const change24h = Number(data.market_data.price_change_percentage_24h);
      const change7d = Number(data.market_data.price_change_percentage_7d);
      const change1m = Number(data.market_data.price_change_percentage_30d);

      const marketCap = Number(data.market_data.market_cap.eur)
        .toLocaleString('en-US', { style: 'currency', currency: 'EUR' });

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${data.name} (${data.symbol.toUpperCase()})`)
        .addFields(
          {
            name: 'Current Price',
            value: price,
          },
          {
            name: 'Market Cap',
            value: marketCap,
          },
          {
            name: '24h Change',
            value: `${change24h.toFixed(2)}%`,
            inline: true,
          },
          {
            name: '7d Change',
            value: `${change7d.toFixed(2)}%`,
            inline: true,
          },
          {
            name: '1M Change',
            value: `${change1m.toFixed(2)}%`,
            inline: true,
          },
        )
        .setThumbnail(data.image.small)
        .setTimestamp();

      await reply(interaction, args, { embeds: [embed] });
    }
    catch (error) {
      console.error(error);
      await reply(interaction, args, error.message);
    }
  },
};
