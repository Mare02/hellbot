const { ChannelType } = require('discord.js');
const { newticketquestion } = require('../commands');
const { isDevMode } = require('../utils/config');
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
  });
};
