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
    const reply = (args && interaction.editReply)
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);

    try {
      if (!args) {
        await interaction.deferReply();
      }

      if (!interaction.member.permissions.has('MUTE_MEMBERS')) {
        return await reply(messages.system.noPermission);
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
        return await reply('User not found. Please provide a valid user ID or mention.');
      }

      let duration;
      if (!args && interaction.options.getString('duration')) {
        duration = parseInt(interaction.options.getString('duration'));
      } else if (args && args[1] && args[1].length) {
        duration = parseInt(args[1]);
      }

      await userToMute.timeout(duration);
      await reply(`**${userToMute.displayName}** has been muted${
        duration
          ? ` for ${duration / 1000} ${duration / 1000 > 1 ? 'seconds' : 'second'}`
          : ''
      }.`);
    }
    catch (error) {
      console.error(error.message);
      await reply(
        error.message.includes('permission')
          ? messages.errorState.permissionError
          : messages.errorState.commandError
      );
    }
  },
};
