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

      const guilds = await client.guilds.fetch();
      const homeServer = await client.guilds.fetch(config.homeServerId);
      const generalChannel = await homeServer.channels.fetch(config.generalChannelId);

      for (const [guildId] of guilds) {
        await rest.put(Routes.applicationGuildCommands(config.bot.appId, guildId), {
          body: slashCommands,
        }).catch(error => {
          throw error;
        });
      }

      const messageText = 'Slash commands updated!';
      if (message) {
        message.channel.send(messageText);
      }
      else if (generalChannel) {
        generalChannel.send(messageText);
      }

    } catch (error) {
      console.error(error);
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        message.channel.send(errorText);
      } else if (generalChannel) {
        generalChannel.send(errorText);
      }
    } finally {
      process.exit();
    }
  }
}
