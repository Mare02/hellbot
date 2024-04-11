const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
console.log(process.env.DISCORD_TOKEN);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
  // partials: ['Channel', 'Message', 'Guild', 'User'],
});

client.login(token);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!')) return;

  console.log(message.content);

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  console.log(command);

  if (command === 'ping') {
    const msg = await message.reply('Pinging...');
    msg.edit(`Pong! Latency is ${msg.createdTimestamp - message.createdTimestamp}ms.`);
  }
  if (command === 'macer') {
    await message.reply('The worst member in the recorded server history.');
  }
  if (command === 'echo') {
    // await message.reply('@rippw stfu');
    await message.channel.send(args.join(' '));
  }
  if (command === 'pinguser') {
    messageToEcho = args.join(' ');
    // await message.reply('@rippw stfu');
    await message.channel.send(`<@${1140696859107659937}> ${messageToEcho}`);
  }
});
