const { getInstance } = require('../client');
const config = require('../utils/config');

const client = getInstance();

module.exports = () => {
  client.on('guildMemberAdd', (member) => {
    if (!config.features.verification) return;
    const { verifyChannelId, homeServerId } = config;
    if (member.guild.id === homeServerId) {
      const welcomeMessage = `
        Welcome to the server, **${member.user.username}**!\nTo get access, open a ticket in <#${verifyChannelId}> and use /verify with your age and where you joined from for automatic verification.\nThanks for joining!
      `;

      member.send(welcomeMessage).catch((error) => console.error('Welcome DM failed', { error }));
    }
  });
};
