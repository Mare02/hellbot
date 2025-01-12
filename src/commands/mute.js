const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');
const syslog = require('../commands/syslog');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'mute',
  description: 'Mutes a user in the server.',
  slash: true,
  perm: MODERATOR,
  params: [
    {
      name: 'user',
      description: 'The user to mute',
      type: 6,
      required: true,
    },
    {
      name: 'duration',
      description: 'Duration of the mute in milliseconds (ms)',
      required: false,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      if (!interaction.member.permissions.has('MUTE_MEMBERS')) {
        await reply(interaction, args, messages.system.noPermission);
        return;
      }

      let userToMute;
      if (!args) {
        userToMute = await interaction.guild.members.fetch(
          interaction.options.getUser('user')
        ).catch(() => null);
      } else if (interaction.mentions.users.size) {
        userToMute = await interaction.guild.members.fetch(
          interaction.mentions.users.first().id
        ).catch(() => null);
      } else if (!interaction.mentions.users.size && args.length) {
        userToMute = await interaction.guild.members.fetch(args[0]).catch(() => null);
      }

      if (!userToMute || Array.isArray(userToMute)) {
        await reply(interaction, args, 'User not found. Please provide a valid user ID or mention.');
        return;
      }

      if (userToMute.voice && userToMute.voice.serverMute) {
        await reply(interaction, args, 'User is already muted.');
        return;
      }

      let duration;
      if (!args && interaction.options.getString('duration')) {
        duration = parseInt(interaction.options.getString('duration')) * 60000;
      } else if (args && args[1] && args[1].length) {
        duration = parseInt(args[1]) * 60000;
      } else {
        duration = 30 * 60000;
      }

      await userToMute.timeout(duration);

      const formatDuration = (duration) => {
        const minutes = duration / 60000;
        const years = Math.floor(minutes / 525600);
        const months = Math.floor((minutes % 525600) / 43200);
        const days = Math.floor((minutes % 43200) / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const remainingMinutes = Math.floor(minutes % 60);

        let result = [];
        if (years > 0) result.push(`${years}y`);
        if (months > 0) result.push(`${months}m`);
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (remainingMinutes > 0) result.push(`${remainingMinutes}m`);

        return result.join(' ');
      };

      const message = `**${userToMute.displayName}** has been muted${
        duration
          ? ` for ${formatDuration(duration)}`
          : ''
      }.`;
      await reply(interaction, args, message);

      await syslog.execute(interaction, [], message, userToMute);
    }
    catch (error) {
      console.error(error.message);
      await reply(interaction, args,
        error.message.includes('permission')
          ? messages.errorState.permissionError
          : messages.errorState.commandError
      );
    }
  },
};
