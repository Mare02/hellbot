const { getInstance } = require('./client');
const listeners = require('./listeners');
require('dotenv').config();

const client = getInstance();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

Object.values(listeners).forEach(listener => listener(client));
