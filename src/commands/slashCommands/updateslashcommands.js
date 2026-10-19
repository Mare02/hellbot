const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { OWNER, hasPermission } = require('../../utils/permissions');
const messages = require('../../utils/messages');
const { getInstance } = require('../../client');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(config.bot.token);

module.exports = {
  perm: OWNER,
  description: 'Refresh the registered slash commands.',
  name: 'updateslashcommands',
  async execute(message, isCalledAsJob = false) {
    if (isCalledAsJob !== true && !hasPermission(OWNER, message)) {
      if (message) await message.channel.send(messages.system.noPermission);
      return;
    }

    const client = getInstance();
    let updatesChannel;

    try {
      const applicationId = client.application?.id || config.bot.appId;

      if (!applicationId) {
        throw new Error('Unable to resolve the bot application ID.');
      }

      if (isCalledAsJob === true) {
        const targetServerId = config.isDevMode
          ? config.testingServerId
          : config.homeServerId;
        const homeServer = await client.guilds.fetch(targetServerId);
        updatesChannel = await homeServer.channels.fetch(config.hellbotUpdatesChannelId);
      }

      await rest.put(Routes.applicationCommands(applicationId), {
        body: slashCommands,
      });

      const messageText = 'Slash commands updated!';
      if (message) {
        message.channel.send(messageText);
      }
      else if (updatesChannel) {
        updatesChannel.send(messageText);
      }
    }
    catch (error) {
      console.error(error);
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        message.channel.send(errorText);
      }
      else if (updatesChannel) {
        updatesChannel.send(errorText);
      }
    } finally {
      if (!message && isCalledAsJob === true) {
        process.exit();
      }
    }
  }
}
