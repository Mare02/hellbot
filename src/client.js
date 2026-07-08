const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const config = require('./utils/config');

let instance;

function getInstance() {
  if (!instance) {
    instance = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    instance.login(config.bot.token);
  }

  return instance;
}

module.exports = {
  getInstance,
};
