const { getInstance } = require('../client');
const config = require('../utils/config');

module.exports = {
  description: 'Shows a message when the bot is updated.',
  async execute(commitMessage) {
    try {
      const client = getInstance();
      const server = await client.guilds.fetch(config.homeServerId);
      const generalChannel = await server.channels.fetch(config.generalChannelId);

      let messageText = `${config.bot.name} has been updated!`;
      if (commitMessage && commitMessage.length) {
        messageText += `\n-# Update note: "${commitMessage}"`;
      }
      await generalChannel.send(messageText);
    } catch (error) {
      console.log(error);
    } finally {
      process.exit();
    }
  },
};

