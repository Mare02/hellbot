const { getInstance } = require('../client');
const config = require('../utils/config');
const messages = require('../utils/messages');
const { hasPermission } = require('../utils/roles');
const commands = require('../commands');
const updateslashcommands = require('../commands/slashCommands/updateslashcommands');
const freewill = require('../commands/freewill');
const askai = require('../commands/askai');

const client = getInstance();

const RANDOM_FREEWILL_PROBABILITY = 0.05;

module.exports = () => {
  client.on('messageCreate', async (message) => {
    // get command name + arguments
    const args = message.content.slice(config.commandsPrefix.length).split(/ +/);
    const commandName = args.shift();

    let command = commands[commandName];

    if (commandName === 'updateslashcommands') {
      command = updateslashcommands;
    }

    if (message.mentions.has(client.user.id) && commandName !== askai.name) {
      try {
        await askai.execute(message, args, {useBrainRotPrompt: true});
      } catch (error) {
        console.error('AI response error:', error);
      }
      return;
    }

    if (message.author.bot) {
      return;
    };

    if (
      Math.random() < RANDOM_FREEWILL_PROBABILITY
      && message.channel.name.startsWith('general')
      && !message.mentions.has(client.user.id)
      && message.guild.id === config.homeServerId
    ) {
      try {
        await freewill.execute(message, []);
      }
      catch (error) {
        console.error('Error executing random freewill command:', error);
      }
    }

    if (!message.content.startsWith(config.commandsPrefix)) {
      return;
    };

    if (command) {
      if (command.perm && !hasPermission(command.perm, message.author.id)) {
        message.channel.send(messages.system.noPermission);
        return;
      }

      await command.execute(message, args);
    }
  });
};
