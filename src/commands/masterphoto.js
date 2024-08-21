const { masterPhotosChannelId } = require('../utils/config');
const { ADMIN } = require('../utils/roles');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'masterphoto',
  description: 'Displays a photo in the Master Photos channel.',
  perm: ADMIN,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, masterPhotosChannelId, 'photo');
  },
};
