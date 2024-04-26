const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'deletemsg',
  description: 'Deletes a specified number of messages.',
  perm: ADMIN,
  async execute(message, args) {
    try {
      const limit = args[0] || 2;
      const messagesData = await message.channel.messages.fetch({ limit });
      await message.channel.bulkDelete(messagesData);
    }
    catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },
};
