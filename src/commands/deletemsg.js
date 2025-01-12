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

        await message.channel.bulkDelete(messagesData);
        totalDeleted += messagesData.size;
      }
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
