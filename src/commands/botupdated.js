const { getInstance } = require('../client');
const config = require('../utils/config');

module.exports = {
  name: 'botupdated',
  description: 'Show a message when bot code has been updated.',
  async execute() {
    try {
      const client = getInstance();
      const server = await client.guilds.fetch(config.homeServerId);
      const generalChannel = await server.channels.fetch(config.generalChannelId);

      await generalChannel.send(`${config.bot.name}'s code has been updated!`);
    } catch (error) {
      console.log(error);
    }
  },
};

