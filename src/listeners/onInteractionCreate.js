const { getInstance } = require('../client');
const commands = require('../commands');
const { hasPermission } = require('../utils/roles');
const messages = require('../utils/messages');
const roleRequests = require('../services/roleRequests');

const client = getInstance();

module.exports = () => {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() || interaction.isModalSubmit()) {
      await roleRequests.handleInteraction(interaction);
      return;
    }
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    const command = commands[commandName];

    if (command) {
      if (command.perm && !hasPermission(command.perm, interaction.user.id)) {
        interaction.reply(messages.system.noPermission);
        return;
      }

      command.execute(interaction);
    }
  });
};
