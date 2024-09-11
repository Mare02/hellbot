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
        return await reply('User not found. Please provide a valid user ID or mention.');
      }

      await userToUnmute.timeout(null);
      await reply(`**${userToUnmute.displayName}** has been unmuted.`);
    }
    catch (error) {
      console.error(error.message);
      await reply(messages.errorState.commandError);
    }
  },
};
