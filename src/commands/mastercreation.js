const { masterCreationsChannelId } = require('../utils/config');
const { ADMIN } = require('../utils/roles');
const { forwardAttachmentsToChannel } = require('../utils/helpers');

module.exports = {
  name: 'mastercreation',
  description: 'Displays an SFS design in the Master Creations channel.',
  perm: ADMIN,
  async execute(message, args) {
    await forwardAttachmentsToChannel(message, args, masterCreationsChannelId, 'design');
  },
};
