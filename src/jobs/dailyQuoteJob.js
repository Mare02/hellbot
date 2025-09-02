require('dotenv').config();
const { getInstance } = require('../client');
const { embedColor, testingServerId } = require('../utils/config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  description: 'Sends a random quote to general channel in all servers.',
  async execute() {
    const client = getInstance();

    try {
      const response = await fetch('https://api.api-ninjas.com/v1/quotes', {
        method: 'GET',
        headers: {
          'X-Api-Key': process.env.NINJA_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      const quote = data[0].quote;
      const author = data[0].author;

      console.log(quote);

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('Daily Quote!')
        .setDescription(`"${quote}"`)
        .setFooter({ text: author });

      const guilds = await client.guilds.fetch();
      if (!guilds.size) {
        return;
      }

      for (const [guildId, guild] of guilds) {
        if (guildId === testingServerId) {
          continue;
        }

        const fetchedGuild = await client.guilds.fetch(guildId);
        const channels = await fetchedGuild.channels.fetch();
        const generalChannel = channels.find(channel =>
          channel.type === 0 && channel.name.startsWith('general')
        );

        try {
          if (generalChannel) {
            await generalChannel.send({ embeds: [embed] });
          }
        }
        catch (error) {
          if (generalChannel.guild) {
            console.error(`Failed to send message in guild: ${generalChannel.guild.name} (ID: ${generalChannel.guild.id})`);
          }
          continue;
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};
