const { getInstance } = require('../client');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/roles');
const commands = require('../commands');
const updateslashcommands = require('../commands/slashCommands/updateslashcommands');

const client = getInstance();

module.exports = () => {
  client.on('messageCreate', async (message) => {
    if (
      !message.content.startsWith(config.commandsPrefix)
      || message.author.bot
    ) {
      return;
    };

    // get command name + arguments
    const args = message.content.slice(config.commandsPrefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    let command = commands[commandName];

    if (commandName === 'updateslashcommands') {
      command = updateslashcommands;
    }

    if (command.perm && !hasPermission(command.perm, message.author.id)) {
      message.channel.send(messages.system.noPermission);
      return;
    }

    await command.execute(message, args);
  });
};
