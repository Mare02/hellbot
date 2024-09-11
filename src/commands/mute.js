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
  ],
  async execute(interaction, args) {
    try {
      if (!interaction.member.permissions.has('MUTE_MEMBERS')) {
        return interaction.reply(messages.system.noPermission);
      }

      let userToMute;
      if (!args) {
        userToMute = await interaction.guild.members.fetch(
          interaction.options.getUser('user')
        );
      }
      else if (interaction.mentions.users.size) {
        userToMute = await interaction.guild.members.fetch(
          interaction.mentions.users.first().id
        );
      }
      else if (!interaction.mentions.users.size && args.length) {
        userToMute = await interaction.guild.members.fetch(args[0]);
      }

      if (!userToMute || Array.isArray(userToMute)) {
        return interaction.reply('User not found. Please provide a valid user ID or mention.');
      }

      const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
      if (!muteRole) {
        return interaction.reply('Mute role not found. Please create a role called "Muted" with correct permission and try again.');
      }
      await userToMute.roles.add(muteRole);

      const message = `**${userToMute.displayName}** has been muted.`;
      if (!args) {
        interaction.reply(message);
      } else {
        interaction.channel.send(message);
      }
    } catch (error) {
        console.error(error.message);
      if (!args) {
        interaction.reply(messages.errorState.commandError);
      } else {
        interaction.channel.send(messages.errorState.commandError);
      }
    }
  },
};