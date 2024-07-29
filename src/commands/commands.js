const { getCommandsList } = require('../utils/helpers');

module.exports = {
  name: 'commands',
  description: 'Show a list of commands.',
  async execute(message, args) {
    try {
      const commandsList = getCommandsList({ show: 'base' });
      await message.channel.send(`
        Here is the list of commands:
        \n${commandsList}
      `);
    } catch (error) {
      console.log(error);
      await message.channel.send(error.message);
    }
  },
};

