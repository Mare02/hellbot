const { MODERATOR } = require('../utils/roles');
const messages = require('../utils/messages');

module.exports = {
  name: 'mute',
  description: 'Mutes a user in the server.',
  perm: MODERATOR,
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
          return await interaction.editReply(messages.system.noPermission);
        } else {
          return await interaction.reply(messages.system.noPermission);
        }
      }

      let userToMute;
      if (!args) {
        userToMute = await interaction.guild.members.fetch(
          interaction.options.getUser('user')
        );
      } else if (interaction.mentions.users.size) {
        userToMute = await interaction.guild.members.fetch(
          interaction.mentions.users.first().id
        );
      } else if (!interaction.mentions.users.size && args.length) {
        userToMute = await interaction.guild.members.fetch(args[0]);
      }

      if (!userToMute || Array.isArray(userToMute)) {
        const message = 'User not found. Please provide a valid user ID or mention.';
        if (!args) {
          return await interaction.editReply(message);
        } else {
          return await interaction.reply(message);
        }
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
        return await interaction.editReply(successMessage);
      } else {
        return await interaction.reply(successMessage);
      }
    }
    catch (error) {
      console.error(error.message);
      if (!args) {
        return await interaction.editReply(messages.errorState.commandError);
      } else {
        return await interaction.reply(messages.errorState.commandError);
      }
    }
  },
};