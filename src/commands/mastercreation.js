const { PermissionFlagsBits } = require('discord.js');
const config = require('../utils/config');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'mastercreation',
  description: 'Displays an SFS design in the Master Creations channel.',
  perm: PermissionFlagsBits.Administrator,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, config.masterCreationsChannelId, 'design');
  },
};
