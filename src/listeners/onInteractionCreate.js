const { getInstance } = require('../client');
const commands = require('../commands');
const { hasPermission } = require('../utils/permissions');
const messages = require('../utils/messages');
const roleRequests = require('../services/roleRequests');
const { withLogContext } = require('../services/logging');
const { isGuildEnabled } = require('../utils/guildAccess');

const client = getInstance();

module.exports = () => {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.guildId && !isGuildEnabled(interaction.guildId)) {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Hellbot is disabled in this server.',
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }
    if (interaction.isButton() || interaction.isModalSubmit()) {
      await roleRequests.handleInteraction(interaction);
      return;
    }
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    const command = commands[commandName];

    if (command) {
      if (command.perm && !hasPermission(command.perm, interaction)) {
        await interaction.reply({ content: messages.system.noPermission, ephemeral: true });
        return;
      }

      try {
        await withLogContext({ component: 'commands', command: commandName }, () => command.execute(interaction));
      } catch (error) {
        withLogContext({ component: 'commands', command: commandName }, () => console.error('Slash command failed', { error }));
        const reply = { content: messages.errorState.commandError, ephemeral: true };
        if (interaction.deferred) await interaction.editReply(reply.content).catch(() => {});
        else if (!interaction.replied) await interaction.reply(reply).catch(() => {});
      }
    }
  });
};
