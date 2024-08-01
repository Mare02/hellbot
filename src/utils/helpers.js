const syslog = require('../commands/syslog');
const { readdirSync } = require('fs');
const path = require('path');
const { ADMIN, MODERATOR } = require('../utils/roles');

module.exports = {
  logToSystem: async (message, logMessage) => {
    await syslog.execute(message, logMessage);
  },

  getCommandsList(filter) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commands = readdirSync(commandsPath).filter(file => file.endsWith('.js'))
      .map(file => require(path.join(commandsPath, file)));
    let commandEntries = Object.entries(commands).filter(([_, value]) =>
      typeof value?.name === 'string'
      && typeof value?.description === 'string'
      && !value?.name.startsWith('test')
    );

    if (filter && filter.show === 'base') {
      commandEntries = commandEntries.filter(([_, value]) => ![ADMIN, MODERATOR].includes(value.perm));
    }

    const commandsList = commandEntries.map(([_, value]) =>
      `**::${value.name}** - ${value.description} ${value.perm ? `(${value.perm})` : ''}`
    ).join('\n');

    return commandsList;
  },

  handleUserPromptInput: async (promptInput, channel) => {
    const prompt = promptInput.trim();
    if (prompt === '' || /^\s+$/.test(prompt)) {
      await channel.send('Please provide a prompt!');
      return;
    }
    return prompt;
  },
}