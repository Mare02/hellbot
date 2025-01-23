module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(interaction) {
    try {
      const start = Date.now();

      const pong = await interaction.channel.send('Pinging...');

      const end = Date.now();
      const latency = end - start;

      await pong.edit(`Pong! Latency is ${latency}ms.`);
    }
    catch (error) {
      console.error(error);
      await interaction.channel.send(error.message);
    }
  },
};
