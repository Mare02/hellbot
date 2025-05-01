const messages = require('../utils/messages');
const { reply } = require('../utils/helpers');
const config = require('../utils/config');

module.exports = {
  name: 'verify',
  description: "Get verified and gain access to Hell's Resting Place.",
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
      if (interaction.guild.id !== config.homeServerId) {
        return await reply(interaction, args, "This command can only be used in the bot's home server (Hell's Resting Place).");
      }

      const verifiedRole = await interaction.guild.roles.fetch(config.verifiedRoleId);
      if (!verifiedRole) {
        return await reply(interaction, args, messages.errorState.commandError);
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
        return await reply(interaction, args, 'Please provide age and invite source.');
      }

      const member = interaction.member;
      if (member.roles.cache.has(verifiedRole.id)) {
        return await reply(interaction, args, 'You are already verified!');
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
      console.error('Verification command error:', error);
      interaction.channel.send(messages.errorState.commandError);
    }
  },
};
