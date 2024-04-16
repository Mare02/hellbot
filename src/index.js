const { ChannelType } = require('discord.js');
const { getInstance } = require('./client');
const commands = require('./commands');
const config = require('./utils/config');

const client = getInstance();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (
    !message.content.startsWith(config.commandsPrefix)
    || message.author.bot
  ) {
    return;
  };

  // get command name + arguments
  const args = message.content.slice(2).split(/ +/);
  const commandName = args.shift().toLowerCase();

  console.log(commandName);

  const command = commands[commandName];
  if (command) {
    await command.execute(message, args);
  }
});

client.on('channelCreate', async(channel) => {
  if (channel.type !== ChannelType.GuildText) return;

  // New user ticket verification
  if (channel.name.startsWith('ticket-')) {
    await commands['newticketquestion'].execute({channel});
  }
})
