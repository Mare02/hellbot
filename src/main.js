const { getInstance } = require('./client');
require('dotenv').config();
require('./kernel');
const listeners = require('./listeners');
const Bugsnag = require('@bugsnag/js');
const commands = require('./commands');
const registerslashcommands = require('./commands/slashCommands/registerslashcommands');

const client = getInstance();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

Object.values(listeners).forEach(listener => listener(client));

registerslashcommands.execute();

Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY
});
