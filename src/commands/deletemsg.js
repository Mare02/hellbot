module.exports = {
  name: 'askai',
  description: 'Prompts AI to answer a question.',
  async execute(message, args) {
    try {
      const limitParam = args[0];
      const messagesData = await message.channel.messages.fetch({ limit: limitParam || 2 });
      await message.channel.bulkDelete(messagesData);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
