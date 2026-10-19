const { PermissionFlagsBits } = require('discord.js');
const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');
const syslog = require('../commands/syslog');

module.exports = {
  name: 'unmute',
  description: 'Unmutes a user in the server.',
  slash: true,
  perm: PermissionFlagsBits.ModerateMembers,
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

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await reply(interaction, args, "I don't have permission to perform this action.");
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

      if (!userToUnmute.moderatable) {
        await reply(interaction, args, "This user cannot be timed out (higher role/privileges).");
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
