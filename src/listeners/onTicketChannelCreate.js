const { ChannelType } = require('discord.js');
const { newticketquestion } = require('../commands');
const config = require('../utils/config');
require('dotenv').config();

module.exports = (client) => {
  client.on('channelCreate', async (channel) => {
    if (
      channel.type !== ChannelType.GuildText
      || config.isDevMode
    ) {
      return;
    }

    if (channel.name.startsWith('ticket-') && channel.parentId !== config.minecraftCategoryId) {
      await newticketquestion.execute({ channel });
    }
  });
};
