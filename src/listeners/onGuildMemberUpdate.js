const { getInstance } = require('../client');
const { verifiedRoleId, homeServerId, generalChannelId } = require('../utils/config');

const client = getInstance();

module.exports = () => {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
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
