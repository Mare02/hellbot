const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { ADMIN } = require('../../utils/roles');
const { getInstance } = require('../../client');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

module.exports = {
  perm: ADMIN,
  name: 'updateslashcommands',
  async execute(message) {
    try {
      const client = getInstance();

      let guildId = config.homeServerId;
      if (message) {
        guildId = message.guild.id;
      }

      const guilds = await client.guilds.fetch();

      for (const [guildId] of guilds) {
        await rest.put(Routes.applicationGuildCommands(config.bot.appId, guildId), {
          body: slashCommands,
        }).catch(error => {
          throw error;
        });
      }

      if (message) {
        message.channel.send('Slash commands updated!');
      }
    } catch (error) {
      console.error(error);
      if (message) {
        message.channel.send(`Failed to updated slash commands: ${error.message}`);
      }
    }
  }
}
