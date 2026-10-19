const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../utils/config');
const { OWNER, hasPermission } = require('../utils/permissions');

const PREFIX_USAGE = {
  deletemsg: ' <count>',
  dm: ' <user-id> <message>',
  masterphoto: ' [caption] (reply to a message with an attachment)',
  syslog: ' <message>',
  uniquecreation: ' [caption] (reply to a message with an attachment)',
};

const ACCESS_GROUPS = [
  { title: 'Everyone', permission: null },
  { title: 'Ban Members', permission: PermissionFlagsBits.BanMembers },
  { title: 'Kick Members', permission: PermissionFlagsBits.KickMembers },
  { title: 'Moderate Members', permission: PermissionFlagsBits.ModerateMembers },
  { title: 'Manage Messages', permission: PermissionFlagsBits.ManageMessages },
  { title: 'Administrator', permission: PermissionFlagsBits.Administrator },
  { title: 'Owner only', permission: OWNER },
];

const getSlashUsage = command => {
  const options = (command.params || []).map(param => {
    const value = param.type === 6 ? '<member>' : `<${param.name}>`;
    const option = `${param.name}:${value}`;
    return param.required ? option : `[${option}]`;
  });

  return `/${command.name}${options.length ? ` ${options.join(' ')}` : ''}`;
};

const getCommandLine = (key, command) => {
  const usage = command.slash
    ? getSlashUsage(command)
    : `${config.commandsPrefix}${key}${PREFIX_USAGE[key] || ''}`;
  return `\`${usage}\` — ${command.description}`;
};

const addCommandFields = (embed, title, lines) => {
  let chunk = '';
  let chunkNumber = 1;

  for (const line of lines) {
    const nextChunk = chunk ? `${chunk}\n${line}` : line;
    if (nextChunk.length > 1000 && chunk) {
      embed.addFields({
        name: chunkNumber === 1 ? title : `${title} (continued)`,
        value: chunk,
      });
      chunk = line;
      chunkNumber += 1;
    } else {
      chunk = nextChunk;
    }
  }

  if (chunk) {
    embed.addFields({
      name: chunkNumber === 1 ? title : `${title} (continued)`,
      value: chunk,
    });
  }
};

module.exports = {
  name: 'help',
  description: 'Show commands available to you and how to use them.',
  slash: true,
  async execute(context) {
    try {
      const commands = require('../commands');
      const commandEntries = Object.entries(commands)
        .filter(([key, command]) => key !== 'help' && command?.description)
        .map(([key, command]) => [key, command]);
      commandEntries.push(['updateslashcommands', require('./slashCommands/updateslashcommands')]);

      const availableCommands = commandEntries.filter(([, command]) =>
        !command.perm || hasPermission(command.perm, context)
      );

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${config.bot.name} Commands`)
        .setDescription([
          `Use slash commands from Discord's \`/\` menu. Prefix commands start with \`${config.commandsPrefix}\`.`,
          `You can open this menu with \`/help\` or \`${config.commandsPrefix}help\`.`,
          'Only commands available to you are shown.',
        ].join('\n'));

      for (const group of ACCESS_GROUPS) {
        const lines = availableCommands
          .filter(([, command]) => (command.perm || null) === group.permission)
          .map(([key, command]) => getCommandLine(key, command));
        if (lines.length) addCommandFields(embed, group.title, lines);
      }

      embed.setFooter({ text: `${availableCommands.length} commands available` });

      await context.reply({
        embeds: [embed],
        ...(context.isChatInputCommand?.() ? { ephemeral: true } : {}),
      });
    } catch (error) {
      console.error('Failed to build help menu:', error);
      await context.reply('Unable to load the help menu right now.');
    }
  },
};
