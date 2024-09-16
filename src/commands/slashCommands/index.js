const { SlashCommandBuilder } = require('discord.js');
const commands = require('../../commands');

const filteredCommands = Object.values(commands).filter(command => command.slash);

const slashCommands = filteredCommands.map(command => {
  const slashCommand = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description)
    .setDMPermission(true);

  if (command.params) {
    command.params.forEach(param => {
      if (param.type === 6) {
        slashCommand.addUserOption(option =>
          option.setName('user')
            .setDescription('The user to mute')
            .setRequired(true)
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

  slashCommand.integration_type = [1, 2];
  slashCommand.contexts = [1, 2];

  return slashCommand;
});

module.exports = slashCommands.map(command => command.toJSON());
