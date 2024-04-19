require('dotenv').config();
const { ADMIN } = require('../utils/permissions');
const config = require('../utils/config');

module.exports = {
  name: 'getenv',
  description: 'Get current Node environment.',
  perm: ADMIN,
  async execute(message, args) {
    message.channel.send(`
      Node environment: ${process.env.NODE_ENV}
Command prefix: ${
  process.env.NODE_ENV === 'production'
    ? config.commandsPrefix
    : config.commandsPrefixDev
}
Using AI model: ${config.currentAiModel}
Owner: ${config.owner.name} (${config.owner.id})
    `);
  },
};
