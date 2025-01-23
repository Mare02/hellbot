const { reply } = require('../utils/helpers');

module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(interaction) {
    try {
      const startTime = Date.now();
      await reply(interaction, null, 'Pinging...');
      const endTime = Date.now();

      await reply(interaction, null, `Pong! Latency is ${endTime - startTime}ms.`);
    } catch (error) {
      console.error(error);
      await reply(interaction, null, error.message);
    }
  },
};
