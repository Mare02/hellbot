const { getInstance } = require('./client');
require('dotenv').config();
require('./kernel');
const listeners = require('./listeners');
const Bugsnag = require('@bugsnag/js');
const commands = require('./commands');
const updateslashcommands = require('./commands/slashCommands/updateslashcommands');

const client = getInstance();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

Object.values(listeners).forEach(listener => listener(client));

updateslashcommands.execute();

Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY
});
