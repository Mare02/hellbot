const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { ADMIN } = require('../../utils/roles');
const { getInstance } = require('../../client');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

module.exports = {
  perm: ADMIN,
  name: 'updateslashcommands',
  async execute(message, isCalledAsJob) {
    try {
      const client = getInstance();

      let generalChannel;
      if (isCalledAsJob) {
        const homeServer = await client.guilds.fetch(config.homeServerId);
        generalChannel = await homeServer.channels.fetch(config.generalChannelId);
      }

      const guilds = await client.guilds.fetch();
      for (const [guildId] of guilds) {
        await rest.put(Routes.applicationGuildCommands(config.bot.appId, guildId), {
          body: slashCommands,
        });
      }

      const messageText = 'Slash commands updated!';
      if (message) {
        message.channel.send(messageText);
      }
      else if (generalChannel) {
        generalChannel.send(messageText);
      }
    }
    catch (error) {
      console.error(error);
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        message.channel.send(errorText);
      }
      else if (generalChannel) {
        generalChannel.send(errorText);
      }
    } finally {
      if (!message && isCalledAsJob) {
        process.exit();
      }
    }
  }
}
