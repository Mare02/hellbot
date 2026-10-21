const { REST, Routes } = require('discord.js');
const config = require('../utils/config');
const { isGuildEnabled } = require('../utils/guildAccess');

module.exports = {
  description: 'Shows a message when the bot is updated.',
  async execute(commitMessage) {
    if (!isGuildEnabled(config.homeServerId)) {
      console.info('Deployment announcement skipped: home server is disabled.');
      return;
    }
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    const bot = await rest.get(Routes.user('@me'));
    if (bot.id !== config.bot.appId) throw new Error('Deployment bot identity does not match.');
    const channel = await rest.get(Routes.channel(config.hellbotUpdatesChannelId));
    if (channel.guild_id !== config.homeServerId) throw new Error('Update channel belongs to another server.');
    let content = `${config.bot.name} has been updated!`;
    if (commitMessage) content += `\n-# Update note: "${commitMessage}"`;
    const sent = await rest.post(Routes.channelMessages(channel.id), {
      body: { content: content.slice(0, 2000), allowed_mentions: { parse: [] } },
    });
    await rest.get(Routes.channelMessage(channel.id, sent.id));
    console.info(`Deployment announcement verified in #${channel.name} (${sent.id}).`);
  },
};
