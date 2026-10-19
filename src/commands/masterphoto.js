const { PermissionFlagsBits } = require('discord.js');
const { masterPhotosChannelId } = require('../utils/config');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'masterphoto',
  description: 'Displays a photo in the Master Photos channel.',
  perm: PermissionFlagsBits.Administrator,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, masterPhotosChannelId, 'photo');
  },
};
