const { usePrompt } = require('../services/AIservice');
const { emptyState } = require('../utils/messages');
const { reply } = require('../utils/helpers');

module.exports = {
  name: 'sumchat',
  description: 'Summarizes the recent chat.',
  slash: true,
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 20 });

      let username;
      if (!args) {
        username = interaction.user.username;
      } else {
        username = interaction.author.username;
      }
      const messagesArray = messages.map(message => ({
        content: message.content,
        author: username,
      }));

      if (!messagesArray.length) {
        return await reply(interaction, args, emptyState.noResponseSummarize);
      }

      const messagesContentString = messagesArray.reverse().map(msg => `${msg.author}: ${msg.content}`).join('<br>');
      const summary = await usePrompt(`Please summarize the following conversation: \n${messagesContentString}`);

      await reply(interaction, args, summary);
    }
    catch (error) {
      console.error(error);
      await reply(interaction, args, error.message);
    }
  },
};
