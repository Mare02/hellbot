const { getInstance } = require('../client');
const config = require('../utils/config');

const client = getInstance();

module.exports = () => {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (!config.features.verification) return;
    const { verifiedRoleId, homeServerId, generalChannelId } = config;
    if (newMember.guild.id !== homeServerId) {
      return;
    }

    if (!oldMember.roles.resolve(verifiedRoleId) && newMember.roles.resolve(verifiedRoleId)) {
      const welcomeMessage = `Welcome <@${newMember.id}>! You have been verified. Enjoy the server!`;

      const generalChannel = await client.channels.fetch(generalChannelId);
      if (generalChannel) {
        await generalChannel.send(welcomeMessage);
      }
    }
  });
};
