const { ChannelType } = require('discord.js');
const { newticketquestion } = require('../commands');
const { isDevMode, subscriberDesignsRoleId } = require('../utils/config');
require('dotenv').config();

module.exports = (client) => {
  client.on('channelCreate', async (channel) => {
    if (
      channel.type !== ChannelType.GuildText
      || isDevMode
    ) {
      return;
    }

    if (channel.name.startsWith('ticket-')) {
      await newticketquestion.execute({ channel });
    }

    if (channel.name.endsWith('-submission')) {
      const username = channel.name.replace('-submission', '');
      const user = await channel.guild.members.fetch()
        .then(members => members.find(member => member.user.username === username));

      if (user) {
        const submitterRole = channel.guild.roles.cache.get(subscriberDesignsRoleId);
        if (submitterRole) {
          await user.roles.add(submitterRole);
        }
      }
    }
  });
};
