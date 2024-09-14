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
        return await reply(interaction, args, 'Please provide a coin name.');
      }

      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}`);
      const data = await response.json();

      if (!data || data.error) {
        await reply(interaction, args, messages.errorState.apiError);
        return;
      }

      const toHumanReadablePrice = (price, decimals = 2) => {
        return Number(price)
          .toLocaleString('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
      };
      const price = toHumanReadablePrice(data.market_data.current_price.eur, 4);
      const ath = toHumanReadablePrice(data.market_data.ath.eur);
      const atl = toHumanReadablePrice(data.market_data.atl.eur);

      const change24h = Number(data.market_data.price_change_percentage_24h);
      const change7d = Number(data.market_data.price_change_percentage_7d);
      const change1m = Number(data.market_data.price_change_percentage_30d);

      const marketCap = toHumanReadablePrice(data.market_data.market_cap.eur);
      const circulatingSupply = Number(data.market_data.circulating_supply)
        .toLocaleString('en-US');

      const homepage = data.links.homepage[0];

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${data.name} (${data.symbol.toUpperCase()})`)
        .addFields(
          {
            name: 'Current Price',
            value: price,
            inline: true,
          },
          {
            name: 'All-Time High',
            value: ath,
            inline: true,
          },
          {
            name: 'All-Time Low',
            value: atl,
            inline: true,
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
            name: '1m Change',
            value: `${change1m.toFixed(2)}%`,
            inline: true,
          },
          {
            name: 'Market Cap',
            value: marketCap,
            inline: true,
          },
          {
            name: 'Circulating Supply',
            value: circulatingSupply,
            inline: true,
          },
          {
            name: 'Homepage',
            value: homepage,
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
