const { ChannelType } = require('discord.js');


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
