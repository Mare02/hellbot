const { getInstance } = require('../client');
const commands = require('../commands');
const config = require('../utils/config');
const roles = require('../utils/roles');
const messages = require('../utils/messages');

const client = getInstance();

const commandPrefix = config.isDevMode
    ? config.commandsPrefixDev
    : config.commandsPrefix;

module.exports = () => {
  client.on('messageCreate', async (message) => {
    if (
      !message.content.startsWith(commandPrefix)
      || message.author.bot
    ) {
      return;
    };

    // get command name + arguments
    const args = message.content.slice(commandPrefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands[commandName];
    if (command) {
      // Check permission
      if (
        Object.values(roles).includes(command.perm)
        && !config.staffIds.includes(String(message.author.id))
      ) {
        message.channel.send(messages.system.noPermission);
        return;
      }
      await command.execute(message, args);
    }
  });
};
