require('dotenv').config();
const { ADMIN } = require('../utils/permissions');
const config = require('../utils/config');

module.exports = {
  name: 'getinfo',
  description: 'Get technical bot information.',
  perm: ADMIN,
  async execute(message, args) {
    message.channel.send(`
**Name:** ${config.bot.name} ${config.bot.version} (${config.bot.decription})
**Owner:** ${config.owner.name} (${config.owner.id})
**Environment:** ${process.env.NODE_ENV}
**Command prefix:** ${
  process.env.NODE_ENV === 'production'
    ? config.commandsPrefix
    : config.commandsPrefixDev
}
**Using AI model:** ${config.currentAiModel}
**Host sytem:** ${process.platform} ${process.arch}
    `);
  },
};
