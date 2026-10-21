const { ChannelType } = require('discord.js');
const newticketquestion = require('../commands/newticketquestion');
const config = require('../utils/config');
const { isGuildEnabled } = require('../utils/guildAccess');
require('dotenv').config();

module.exports = (client) => {
  client.on('channelCreate', async (channel) => {
    if (
      channel.type !== ChannelType.GuildText
      || !isGuildEnabled(channel.guildId)
      || config.isDevMode
      || !config.features.ticketReplies
    ) {
      return;
    }

    if (channel.name.startsWith('ticket-') && channel.parentId !== config.minecraftCategoryId) {
      await newticketquestion.execute({ channel });
    }
  });
};
