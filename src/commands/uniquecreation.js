const { PermissionFlagsBits } = require('discord.js');
const config = require('../utils/config');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'uniquecreation',
  description: 'Displays an SFS design in the Unique Creations channel.',
  perm: PermissionFlagsBits.Administrator,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, config.uniqueCreationsChannelId, 'design');
  },
};
