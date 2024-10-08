const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');

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

      let duration;
      if (!args && interaction.options.getString('duration')) {
        duration = parseInt(interaction.options.getString('duration'));
      } else if (args && args[1] && args[1].length) {
        duration = parseInt(args[1]);
      }

      await userToMute.timeout(duration);

      await reply(interaction, args,
        `**${userToMute.displayName}** has been muted${
          duration
            ? ` for ${duration / 1000} ${duration / 1000 > 1 ? 'seconds' : 'second'}`
            : ''
        }.`
      );
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
