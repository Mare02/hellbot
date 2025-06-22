const fs = require('fs');
const path = require('path');

const loadCommands = (dir) => {
  const commandFilesAndDirs = fs.readdirSync(dir, { withFileTypes: true });

  const commands = commandFilesAndDirs.reduce((cmds, fileOrDir) => {
    if (fileOrDir.isDirectory()) {
      const nestedCmds = loadCommands(path.join(dir, fileOrDir.name));
      return { ...cmds, ...nestedCmds };
    }

    if (fileOrDir.name.endsWith('.js') && fileOrDir.name !== 'index.js') {
      const commandName = fileOrDir.name.split('.')[0];
      const command = require(path.join(dir, fileOrDir.name));
      if (!command.system) {
        cmds[commandName] = command;
      }
    }

    return cmds;
  }, {});

  return commands;
};

const loadEconomyCommands = (dir) => {
  const economyDir = path.join(dir, 'economy');
  if (!fs.existsSync(economyDir)) {
    return {};
  }

  const commandFiles = fs.readdirSync(economyDir, { withFileTypes: true });

  const commands = commandFiles.reduce((cmds, file) => {
    if (file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js') {
      const commandName = file.name.split('.')[0];
      const command = require(path.join(economyDir, file.name));
      if (!command.system && command.name && typeof command.name === 'string') {
        cmds[commandName] = command;
      }
    }
    return cmds;
  }, {});

  return commands;
};

module.exports = loadEconomyCommands(__dirname);
