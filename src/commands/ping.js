const { reply } = require('../utils/helpers');

module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      const latency = Math.round(interaction.client.ws.ping);

      if (!args) {
        await interaction.editReply(`Pong! Latency is ${latency}ms.`);
      } else {
        await interaction.reply(`Pong! Latency is ${latency}ms.`);
      }
    } catch (error) {
      console.error(error);
      if (!args) {
        await interaction.editReply(error.message);
      } else {
        await interaction.reply(error.message);
      }
    }
  },
};
