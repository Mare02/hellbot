const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const config = require('./utils/config');

let instance;
let loginPromise;

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

    loginPromise = instance.login(config.bot.token);
    loginPromise.catch(() => {});
  }

  return instance;
}

module.exports = {
  getInstance,
  getLoginPromise: () => loginPromise,
};
