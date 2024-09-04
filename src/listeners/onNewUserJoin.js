const { getInstance } = require('../client');
const { verifyChannelId, homeServerId } = require('../utils/config');

const client = getInstance();

module.exports = () => {
  client.on('guildMemberAdd', member => {
    if (member.guild.id === homeServerId) {
      const welcomeMessage = `
        Welcome to the server, **${member.user.username}**!\nAs a new member, please take a moment to open a ticket in the <#${verifyChannelId}> channel in order for our staff to verify you.\nThanks for joining!\n\n*Note: You may have to wait a little depending on the availability of our staff.*
      `;

      member.send(welcomeMessage);
    }
  });
};
