const { SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } = require('discord.js');
const commands = require('../../commands');

const filteredCommands = Object.values(commands).filter(command => command.slash);

const slashCommands = filteredCommands.map(command => {
  const slashCommand = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

  if (command.perm) {
    slashCommand
      .setDefaultMemberPermissions(command.perm)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setContexts(InteractionContextType.Guild);
  } else {
    slashCommand
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
  }

  if (command.params) {
    command.params.forEach(param => {
      if (param.type === 6) {
        slashCommand.addUserOption(option =>
          option.setName(param.name)
            .setDescription(param.description)
            .setRequired(param.required)
        );
      }
      else if (param.type === 3) {
        slashCommand.addStringOption(option =>
          option.setName(param.name)
            .setDescription(param.description)
            .setRequired(param.required)
        );
      }
      else {
        slashCommand.addStringOption(option =>
          option.setName(param.name)
            .setDescription(param.description)
            .setRequired(param.required)
            .setAutocomplete(true)
        );
      }
    });
  }

  return slashCommand;
});

module.exports = slashCommands.map(command => command.toJSON());
