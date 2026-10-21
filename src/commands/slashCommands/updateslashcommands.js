const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { OWNER, hasPermission } = require('../../utils/permissions');
const messages = require('../../utils/messages');
const { getInstance, getLoginPromise } = require('../../client');
const { initializeRuntimeConfig } = require('../../services/config/runtime');
const { isGuildEnabled } = require('../../utils/guildAccess');
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
      if (isCalledAsJob) await getLoginPromise();
      const applicationId = client.application?.id || config.bot.appId;

      if (!applicationId) {
        throw new Error('Unable to resolve the bot application ID.');
      }

      if (isCalledAsJob === true) {
        const targetServerId = config.isDevMode
          ? config.testingServerId
          : config.homeServerId;
        if (isGuildEnabled(targetServerId)) {
          const homeServer = await client.guilds.fetch(targetServerId);
          updatesChannel = await homeServer.channels.fetch(config.hellbotUpdatesChannelId);
        }
      }

      await rest.put(Routes.applicationCommands(applicationId), {
        body: slashCommands,
      });

      const messageText = 'Slash commands updated!';
      if (message) {
        await message.channel.send(messageText);
      }
      else if (updatesChannel) {
        await updatesChannel.send(messageText);
      }
    }
    catch (error) {
      console.error('Slash-command registration failed.');
      if (!message && isCalledAsJob) process.exitCode = 1;
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        await message.channel.send(errorText);
      }
      else if (updatesChannel) {
        await updatesChannel.send(errorText);
      }
    } finally {
      if (!message && isCalledAsJob === true) {
        try {
          await client.destroy();
        } finally {
          initializeRuntimeConfig().close();
        }
      }
    }
  }
};
