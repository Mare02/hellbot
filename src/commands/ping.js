module.exports = {
  name: 'ping',
  description: 'Pings and tells the latency.',
  slash: true,
  async execute(context) {
    try {
      if (context.isChatInputCommand?.()) {
        await context.deferReply();
        const latency = Date.now() - context.createdTimestamp;
        await context.editReply(`Pong! Latency is ${latency}ms.`);
        return;
      }

      const message = context;
      const msg = await message.reply('Pinging...');
      await msg.edit(`Pong! Latency is ${msg.createdTimestamp - message.createdTimestamp}ms.`);
    } catch (error) {
      console.error(error);
      if (context.isChatInputCommand?.()) {
        const response = { content: 'Unable to check latency right now.', ephemeral: true };
        if (context.deferred || context.replied) {
          await context.followUp(response);
        } else {
          await context.reply(response);
        }
        return;
      }

      context.channel.send(error.message);
    }
  },
};
