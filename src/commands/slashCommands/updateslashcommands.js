const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const config = require('../../utils/config');
const slashCommands = require('.');
const { OWNER, hasPermission } = require('../../utils/permissions');
const messages = require('../../utils/messages');
const { getInstance, getLoginPromise } = require('../../client');
const { initializeRuntimeConfig } = require('../../services/config/runtime');
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

    try {
      if (isCalledAsJob) await getLoginPromise();
      const applicationId = client.application?.id || config.bot.appId;

      if (!applicationId) {
        throw new Error('Unable to resolve the bot application ID.');
      }

      await rest.put(Routes.applicationCommands(applicationId), {
        body: slashCommands,
      });

      const messageText = 'Slash commands updated!';
      if (message) {
        await message.channel.send(messageText);
      }
    }
    catch (error) {
      console.error('Slash-command registration failed.');
      if (!message && isCalledAsJob) process.exitCode = 1;
      const errorText = `Failed to update slash commands: ${error.message}`;
      if (message) {
        await message.channel.send(errorText);
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
