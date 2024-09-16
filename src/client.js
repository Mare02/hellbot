const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

let instance;

function getInstance() {
  if (!instance) {
    const token = process.env.DISCORD_TOKEN;

    instance = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    instance.login(token);
  }

  return instance;
}

module.exports = {
  getInstance,
};
