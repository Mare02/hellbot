const { getInstance } = require('../client');
const { verifyChannelId } = require('../utils/config');

const client = getInstance();

module.exports = () => {
  client.on('guildMemberAdd', member => {
    const welcomeMessage = `
      Welcome to the server, **${member.user.username}**!\nAs a new member, please take a moment to open a ticket in the <#${verifyChannelId}> channel in order for our staff to verify you.\n\n*Note: You may have to wait a little depending on the availability of our staff.*\nThanks for joining!
    `;

    member.send(welcomeMessage)
      .then(() => {
        console.log(`DM sent to ${member.user.tag}`);
      })
      .catch(error => {
        console.error(`Error sending DM to ${member.user.tag}: ${error}`);
      });
  });
};
