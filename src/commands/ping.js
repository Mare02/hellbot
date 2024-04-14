module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  async execute(message, args) {
    try {
      const msg = await message.reply('Pinging...');
      msg.edit(`Pong! Latency is ${msg.createdTimestamp - message.createdTimestamp}ms.`);
    } catch (error) {
      console.error(error);
    }
  },
};