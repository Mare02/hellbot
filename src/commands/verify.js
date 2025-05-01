const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');
const config = require('../utils/config');

module.exports = {
  name: 'verify',
  description: 'Verify your account with age and invite source.',
  slash: true,
  params: [
    {
      name: 'age',
      description: 'Your age',
      type: 3,
      required: true,
    },
    {
      name: 'invitesource',
      description: 'Where you joined from',
      type: 3,
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      if (interaction.guild.id !== config.homeServerId) {
        return;
      }

      const verifiedRole = await interaction.guild.roles.fetch(config.verifiedRoleId);
      if (!verifiedRole) {
        await reply(interaction, args, 'Role "Verified" does not exist in this server.');
        return;
      }

      let age;
      let inviteSource;
      if (!args) {
        age = interaction.options.getString('age');
        inviteSource = interaction.options.getString('invitesource');
      }
      else {
        age = args[0];
        inviteSource = args[1];
      }

      if (!age || !inviteSource) {
        await reply(interaction, args, 'Please provide age and invite source.');
        return;
      }

      const member = interaction.member;
      if (member.roles.cache.has(verifiedRole.id)) {
        await reply(interaction, args, 'You are already verified!');
        return;
      }

      await member.roles.add(verifiedRole);

      await reply(interaction, args, 'You have been successfully verified!');

      const logsChannel = await interaction.guild.channels.fetch(config.verificationLogsChannelId);
      if (logsChannel) {
        await logsChannel.send(
          `<@${member.id}> has passed verification - Age: ${age}, From: ${inviteSource}`
        );
      }
    } catch (error) {
      console.error(error);
      interaction.channel.send(messages.errorState.commandError);
    }
  },
};
