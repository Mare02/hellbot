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
  async execute(message, isCalledAsJob) {
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
        if (generalChannel) {
          generalChannel.send(messageText);
        } else {
          message.channel.send(messageText);
        }
      }

    } catch (error) {
      console.error(error);
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        if (generalChannel) {
          generalChannel.send(errorText);
        } else {
          message.channel.send(errorText);
        }
      }
    } finally {
      if (isCalledAsJob) {
        process.exit();
      }
    }
  }
}
