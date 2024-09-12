const messages = require('../utils/messages');

module.exports = {
  name: 'unmute',
  description: 'Unmutes a user in the server.',
  slash: true,
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
        if (!args) {
          await interaction.editReply(messages.system.noPermission);
        } else {
          await interaction.reply(messages.system.noPermission);
        }
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
        const message = 'User not found. Please provide a valid user ID or mention.';
        if (!args) {
          await interaction.editReply(message);
        } else {
          await interaction.reply(message);
        }
        return;
      }

      await userToUnmute.timeout(null);
      const successMessage = `**${userToUnmute.displayName}** has been unmuted.`;
      if (!args) {
        await interaction.editReply(successMessage);
      } else {
        await interaction.reply(successMessage);
      }
    }
    catch (error) {
      console.error(error.message);
      const errorMessage = error.message.includes('permission')
        ? messages.errorState.permissionError
        : messages.errorState.commandError;

      if (!args) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};
