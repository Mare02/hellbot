const { getInstance } = require('../client');
const commands = require('../commands');

const client = getInstance();

module.exports = () => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    const command = commands[commandName];

    if (command) {
      if (command.perm && !hasPermission(command.perm, interaction.user.id)) {
        interaction.reply(messages.system.noPermission);
        return;
      }

      commands[commandName].execute(interaction);
    }
  });
};
