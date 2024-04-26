const syslog = require('../commands/syslog');
const { readdirSync } = require('fs');
const path = require('path');
const { ADMIN } = require('../utils/roles');

module.exports = {
  logToSystem: async (message, logMessage) => {
    await syslog.execute(message, logMessage);
  },

  getCommandsList(author) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commands = readdirSync(commandsPath).filter(file => file.endsWith('.js'))
      .map(file => require(path.join(commandsPath, file)));
    const commandEntries = Object.entries(commands).filter(([_, value]) =>
      typeof value?.name === 'string' && typeof value?.description === 'string' && !value?.perm
    );

    const commandsList = commandEntries.map(([_, value]) =>
      `**::${value.name}** - ${value.description}`
    ).join('\n');

    return commandsList;
  }
}