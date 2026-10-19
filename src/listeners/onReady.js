const { getInstance } = require('../client');
const roleRequests = require('../services/roleRequests');
const { initializeRuntimeConfig } = require('../services/config/runtime');

const client = getInstance();

module.exports = () => {
  let publication = Promise.resolve();
  async function publishInstructions() {
    const guild = await client.guilds.fetch(roleRequests.getTargetServerId()).catch(() => null);
    if (!guild) return;

    try {
      await guild.channels.fetch();
      await roleRequests.ensureInstructions(guild);
    } catch (error) {
      console.error('Could not publish role-request instructions:', error);
    }
  }
  const enqueue = () => {
    publication = publication
      .then(publishInstructions)
      .catch((error) => console.error('Could not refresh role-request instructions:', error));
  };
  client.on('clientReady', enqueue);
  initializeRuntimeConfig().onChange(({ previous, current }) => {
    if (!client.isReady()) return;
    const fields = (value) => [
      value?.commandsPrefix,
      value?.embedColor,
      value?.roleRequests,
      value?.features.roleRequests,
      value?.homeServerId,
      value?.testingServerId,
      value?.staffMemberRoleId,
    ];
    if (JSON.stringify(fields(previous)) !== JSON.stringify(fields(current))) enqueue();
  });
};
