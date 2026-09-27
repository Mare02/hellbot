const { requestRole } = require('../services/roleRequests');

module.exports = {
  name: 'request-role',
  description: 'Request a role for the server.',
  slash: true,
  params: [
    {
      name: 'name',
      description: 'The name of the role you want.',
      type: 3,
      required: true,
    },
    {
      name: 'color',
      description: 'A hex color, for example #FF8800.',
      type: 3,
      required: true,
    },
  ],
  async execute(interaction, args) {
    await requestRole(interaction, args);
  },
};
