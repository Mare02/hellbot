const { usePrompt } = require('../services/AIservice');
const { emptyState } = require('../utils/messages');

module.exports = {
  name: 'sumchat',
  description: 'Summarizes the recent chat.',
  async execute(message, args) {
    try {
      const channel = message.channel;
      const messages = await channel.messages.fetch({ limit: 20 });
      const messagesArray = messages.map(message => ({
        content: message.content,
        author: message.author.username,
      }));
      if (!messagesArray.length) {
        await message.channel.send(emptyState.noResponseSummarize);
        return;
      }
      const messagesContentString = messagesArray.map(msg => `${msg.author}: ${msg.content}`).join('<br>');
      const summary = await usePrompt(`Please summarize the following conversation: \n${messagesContentString}`);
      message.channel.send(summary);
    } catch (error) {
      console.error(error);
      message.channel.send(error.message);
    }
  },
};
