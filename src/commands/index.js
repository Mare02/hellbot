const fs = require('fs');

const commandFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

const commands = commandFiles.reduce((cmds, file) => {
  const commandName = file.split('.')[0];
  cmds[commandName] = require(`./${file}`);
  return cmds;
}, {});

module.exports = commands;
