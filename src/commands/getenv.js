require('dotenv').config();
const { ADMIN } = require('../utils/permissions');

module.exports = {
  name: 'getenv',
  description: 'Get current Node environment.',
  perm: ADMIN,
  async execute(message, args) {
    message.channel.send(process.env.NODE_ENV);
  },
};
