const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { ADMIN } = require('../../utils/roles');
const { getInstance } = require('../../client');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(config.bot.token);

module.exports = {
  perm: ADMIN,
  name: 'updateslashcommands',
  async execute(message, isCalledAsJob = false) {
    const client = getInstance();

    try {
      const applicationId = client.application?.id
        || (await client.application?.fetch())?.id;

      if (!applicationId) {
        throw new Error('Unable to resolve the bot application ID.');
      }

      let generalChannel;
      if (isCalledAsJob === true) {
        const targetServerId = config.isDevMode
          ? config.testingServerId
          : config.homeServerId;
        const homeServer = await client.guilds.fetch(targetServerId);
        generalChannel = await homeServer.channels.fetch(config.generalChannelId);
      }

      await rest.put(Routes.applicationCommands(applicationId), {
        body: slashCommands,
      });

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
      if (!message && isCalledAsJob === true) {
        process.exit();
      }
    }
  }
}
