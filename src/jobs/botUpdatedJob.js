const { getInstance } = require('../client');
const config = require('../utils/config');
const { isGuildEnabled } = require('../utils/guildAccess');

module.exports = {
  description: 'Shows a message when the bot is updated.',
  async execute(commitMessage) {
    try {
      if (!isGuildEnabled(config.homeServerId)) return;
      const client = getInstance();
      const server = await client.guilds.fetch(config.homeServerId);
      const updatesChannel = await server.channels.fetch(config.hellbotUpdatesChannelId);

      let messageText = `${config.bot.name} has been updated!`;
      if (commitMessage && commitMessage.length) {
        messageText += `\n-# Update note: "${commitMessage}"`;
      }
      await updatesChannel.send(messageText);
    } catch (error) {
      console.log(error);
    } finally {
      process.exit();
    }
  },
};

