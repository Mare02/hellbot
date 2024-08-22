const { masterPhotosChannelId } = require('../utils/config');
const { MODERATOR } = require('../utils/roles');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'masterphoto',
  description: 'Displays a photo in the Master Photos channel.',
  perm: MODERATOR,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, masterPhotosChannelId, 'photo');
  },
};
