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

      const user = await message.guild.members.fetch(args[0]);

      const messageContent = args.slice(1).join(' ');

      await user.send(messageContent);
      message.channel.send(`DM sent to ${user.displayName}`);
    } catch (error) {
      message.channel.send(error.message);
    }
  }
};
