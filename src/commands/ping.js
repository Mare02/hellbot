const { reply } = require('../utils/helpers');

module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(interaction) {
    try {
      const sent = await reply(interaction, null, 'Pinging...');
      const latency = sent.createdTimestamp - interaction.createdTimestamp;

      await sent.edit(`Pong! Latency is ${latency}ms.`);
    } catch (error) {
      console.error(error);
      await reply(interaction, null, 'An error occurred while pinging.').catch(console.error);
    }
  },
};
