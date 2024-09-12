const messages = require('../utils/messages');

module.exports = {
  name: 'mute',
  description: 'Mutes a user in the server.',
  slash: true,
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
        if (!args) {
          await interaction.editReply(messages.system.noPermission);
        } else {
          await interaction.reply(messages.system.noPermission);
        }
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
        const message = 'User not found. Please provide a valid user ID or mention.';
        if (!args) {
          await interaction.editReply(message);
        } else {
          await interaction.reply(message);
        }
        return;
      }

      let duration;
      if (!args && interaction.options.getString('duration')) {
        duration = parseInt(interaction.options.getString('duration'));
      } else if (args && args[1] && args[1].length) {
        duration = parseInt(args[1]);
      }

      await userToMute.timeout(duration);

      const successMessage = `**${userToMute.displayName}** has been muted${
        duration
          ? ` for ${duration / 1000} ${duration / 1000 > 1 ? 'seconds' : 'second'}`
          : ''
      }.`;
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
