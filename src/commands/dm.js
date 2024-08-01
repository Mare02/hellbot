const { getInstance } = require('../client');
const { ADMIN } = require('../utils/roles')

module.exports = {
  name: 'dm',
  perm: ADMIN,
  description: 'Send a DM to a user.',
  async execute(message, args) {
    try {
      if (
        args.length < 2 || !args[0] || !args[1]
        || !args[0].length || !args[1].length
      ) {
        return message.channel.send('Please provide a user ID and a message text.');
      }

      const client = getInstance();
      const user = await client.users.fetch(args[0]);

      const messageContent = args.slice(1).join(' ');

      await user.send(messageContent);
      message.channel.send(`DM sent to ${user.tag}`);
    } catch (error) {
      message.channel.send(error.message);
    }
  }
};
