const { masterCreationsChannelId } = require('../utils/config');
const { MODERATOR } = require('../utils/roles');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'mastercreation',
  description: 'Displays an SFS design in the Master Creations channel.',
  perm: MODERATOR,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, masterCreationsChannelId, 'design');
  },
};
