const fs = require('fs');

const commandFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

const blacklistFileNames = ['registerslashcommands', 'slashCommands'];

const commands = commandFiles.reduce((cmds, file) => {
  if (!blacklistFileNames.includes(file.split('.')[0])) {
    const commandName = file.split('.')[0];
    cmds[commandName] = require(`./${file}`);
  }
  return cmds;
}, {});

module.exports = commands;
