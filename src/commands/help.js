const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');

const PREFIX_USAGE = {
  deletefiles: ' <filename|--all|--category <name>|--subfolder <name>>',
  deletemsg: ' <count>',
  dm: ' <user-id> <message>',
  listfiles: ' [--category <folder>] [--subfolder <folder>]',
  mastercreation: ' [caption] (reply to a message with an attachment)',
  masterphoto: ' [caption] (reply to a message with an attachment)',
  savechat: ' [days]',
  showfile: ' <filename>',
  syslog: ' <message>',
  uniquecreation: ' [caption] (reply to a message with an attachment)',
  uploadfiles: ' (attach the files to your command message)',
};

const ACCESS_GROUPS = [
  { key: 'public', title: 'Everyone', permission: null },
  { key: 'moderator', title: 'Moderator and above', permission: 'moderator' },
  { key: 'admin', title: 'Admin, unlocked staff, and owner', permission: 'admin' },
  { key: 'unlocked', title: 'Unlocked staff and owner', permission: 'unlocked' },
  { key: 'owner', title: 'Owner only', permission: 'owner' },
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
  description: 'Show all commands, usage, and required staff access.',
  slash: true,
  async execute(context) {
    try {
      const commands = require('../commands');
      const commandEntries = Object.entries(commands)
        .filter(([key, command]) => key !== 'help' && command?.description)
        .map(([key, command]) => [key, command]);
      commandEntries.push(['updateslashcommands', {
        name: 'updateslashcommands',
        perm: 'admin',
        description: 'Refresh the registered slash commands.',
      }]);

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`${config.bot.name} Help`)
        .setDescription([
          `Use slash commands from Discord's \`/\` menu. Prefix commands start with \`${config.commandsPrefix}\`.`,
          `You can open this menu with \`/help\` or \`${config.commandsPrefix}help\`.`,
          'Staff-only commands are included below with their required access.',
        ].join('\n'));

      for (const group of ACCESS_GROUPS) {
        const lines = commandEntries
          .filter(([, command]) => (command.perm || null) === group.permission)
          .map(([key, command]) => getCommandLine(key, command));
        if (lines.length) addCommandFields(embed, group.title, lines);
      }

      await context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to build help menu:', error);
      await context.reply('Unable to load the help menu right now.');
    }
  },
};
