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

module.exports = loadCommands(__dirname);
