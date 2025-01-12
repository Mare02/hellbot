const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');
const syslog = require('../commands/syslog');
const { MODERATOR } = require('../utils/roles');

module.exports = {
  name: 'unmute',
  description: 'Unmutes a user in the server.',
  slash: true,
  perm: MODERATOR,
  params: [
    {
      name: 'user',
      description: 'The user to unmute',
      type: 6,
      required: true,
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

      let userToUnmute;
      if (!args) {
        userToUnmute = await interaction.guild.members.fetch(
          interaction.options.getUser('user')
        ).catch(() => null);
      } else if (interaction.mentions.users.size) {
        userToUnmute = await interaction.guild.members.fetch(
          interaction.mentions.users.first().id
        ).catch(() => null);
      } else if (!interaction.mentions.users.size && args.length) {
        userToUnmute = await interaction.guild.members.fetch(args[0]).catch(() => null);
      }

      if (!userToUnmute || Array.isArray(userToUnmute)) {
        await reply(interaction, args, 'User not found. Please provide a valid user ID or mention.');
        return;
      }

      if (!userToUnmute.communicationDisabledUntil) {
        await reply(interaction, args, 'User is not muted.');
        return;
      }

      await userToUnmute.timeout(null);

      const message = `**${userToUnmute.displayName}** has been unmuted.`;
      await reply(interaction, args, message);

      await syslog.execute(interaction, [], message, userToUnmute);
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
