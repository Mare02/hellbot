module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(interaction, args) {
    const start = Date.now();

    try {
      if (!args) {
        interaction.deferReply();
      }

      if (!args) {
        await interaction.editReply('Pinging...');
      }
      else {
        await interaction.reply('Pinging...');
      }

      const end = Date.now();
      const latency = end - start;

      if (!args) {
        await interaction.editReply(`Pong! Latency is ${latency}ms.`);
      }
      else {
        await interaction.reply(`Pong! Latency is ${latency}ms.`);
      }
    }
    catch (error) {
      console.error(error);
      await interaction.channel.send(error.message);
    }
  },
};
