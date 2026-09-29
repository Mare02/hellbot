const { gemsChannelId } = require('../utils/config');
const { MODERATOR } = require('../utils/roles');
const { forwardMessageToChannel } = require('../utils/helpers');

module.exports = {
  name: 'gems',
  description: 'Posts a replied-to message and its attachments in the Gems channel.',
  perm: MODERATOR,
  async execute(message) {
    await forwardMessageToChannel(message, gemsChannelId);
  },
};
