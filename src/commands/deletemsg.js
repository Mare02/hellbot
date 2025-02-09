const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'deletemsg',
  description: 'Deletes a specified number of messages.',
  perm: MODERATOR,
  async execute(message, args) {
    try {
      const limit = Math.max(args[0] || 2, 2);
      let totalDeleted = 0;

      while (totalDeleted < limit) {
        const remaining = limit - totalDeleted;
        const fetchLimit = Math.min(remaining, 100);
        const messagesData = await message.channel.messages.fetch({ limit: fetchLimit });

        if (messagesData.size === 0) break;

        // Filter out messages older than 14 days
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentMessages = messagesData.filter(msg => msg.createdTimestamp > twoWeeksAgo);

        if (recentMessages.size === 0) {
          message.channel.send(`Deleted ${totalDeleted} messages - remaining messages are older than 14 days and cannot be deleted.`);
          return;
        }

        await message.channel.bulkDelete(recentMessages);
        totalDeleted += recentMessages.size;
      }
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
