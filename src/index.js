const { client } = require('./client');
const commands = require('./commands');
const commandPrefix = '!';

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (
    !message.content.startsWith(commandPrefix)
    || message.author.bot
  ) {
    return;
  };

  // get command name + arguments
  const args = message.content.slice(1).split(/ +/);
  const commandName = args.shift().toLowerCase();

  try {
    const command = commands[commandName];
    command.execute(message, args);
  }
  catch {
    console.log('Command not found');
  }
});
