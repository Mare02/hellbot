const { getInstance } = require('../client');
const roleRequests = require('../services/roleRequests');
const funnyPresenceJob = require('../jobs/funnyPresenceJob');

const client = getInstance();

module.exports = () => {
  client.on('ready', async () => {
    funnyPresenceJob.start(client);

    const guild = await client.guilds.fetch(roleRequests.targetServerId).catch(() => null);
    if (!guild) return;

    try {
      await guild.channels.fetch();
      await roleRequests.ensureInstructions(guild);
    } catch (error) {
      console.error('Could not publish role-request instructions:', error);
    }
  });
};
