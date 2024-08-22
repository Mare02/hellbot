const { getInstance } = require('../client');
const commands = require('../commands');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/roles');

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
      if (command.perm && !hasPermission(command.perm, message.author.id)) {
        message.channel.send(messages.system.noPermission);
        return;
      }

      await command.execute(message, args);
    }
  });
};
