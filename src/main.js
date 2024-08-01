const { getInstance } = require('./client');
const commands = require('./commands');
const listeners = require('./listeners');
const config = require('./utils/config');
const roles = require('./utils/roles');
const messages = require('./utils/messages');
require('dotenv').config();

const client = getInstance();

const prefix = config.isDevMode
  ? config.commandsPrefixDev
  : config.commandsPrefix;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (
    !message.content.startsWith(prefix)
    || message.author.bot
  ) {
    return;
  };

  // get command name + arguments
  const args = message.content.slice(prefix.length).split(/ +/);
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

Object.values(listeners).forEach(listener => listener(client));
