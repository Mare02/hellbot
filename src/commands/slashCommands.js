const { SlashCommandBuilder } = require('discord.js');
const commands = require('../commands');

const slashCommands = Object.values(commands).map(command => {
  const slashCommand = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

  if (command.params) {
    command.params.forEach(param => {
      slashCommand.addStringOption(option =>
        option.setName(param.name)
          .setDescription(param.description)
          .setRequired(param.required)
          .setAutocomplete(true)
      );
    });
  }

  return slashCommand;
}
).map(command => command.toJSON());

module.exports = slashCommands;
