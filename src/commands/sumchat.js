const { usePrompt } = require('../services/AIservice');
const { emptyState } = require('../utils/messages');
const { reply } = require('../utils/helpers');
const { getRecentChannelContext } = require('../services/chatContext');

module.exports = {
  name: 'sumchat',
  description: 'Summarizes the recent chat.',
  slash: true,
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      let channel;
      if (!interaction.guildId) {
        channel = await interaction.client.channels.fetch(interaction.channelId);
      } else {
        channel = interaction.channel;
      }

      if (!channel) {
        return await reply(interaction, args, 'Could not access the channel');
      }

      const { messages } = await getRecentChannelContext(channel, { limit: 20 });

      if (!messages.length) {
        return await reply(interaction, args, emptyState.noResponseSummarize);
      }

      const conversation = JSON.stringify(messages);
      const summary = await usePrompt(`Please summarize the following conversation:\n${conversation}`);

      await reply(interaction, args, summary);
    }
    catch (error) {
      console.error(error);
      await reply(interaction, args, error.message);
    }
  },
};
