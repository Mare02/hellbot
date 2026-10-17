const { createServerChannelToolSet } = require('./channels');
const { createServerRoleToolSet } = require('./roles');
const { createServerGuildToolSet } = require('./settings');
const { createServerAuditToolSet } = require('./audit');
const { createServerMemberToolSet } = require('./members');
const { createServerMessageToolSet } = require('./messages');
const { createServerThreadToolSet } = require('./threads');
const { createServerInvitesAndEventsToolSet } = require('./invitesAndEvents');
const { createServerExpressionsToolSet } = require('./expressions');
const { createServerAutoModerationToolSet } = require('./autoModeration');

const toolSetFactories = [
  createServerChannelToolSet,
  createServerRoleToolSet,
  createServerGuildToolSet,
  createServerAuditToolSet,
  createServerMemberToolSet,
  createServerMessageToolSet,
  createServerThreadToolSet,
  createServerInvitesAndEventsToolSet,
  createServerExpressionsToolSet,
  createServerAutoModerationToolSet,
];

function createGuildToolSet(options = {}) {
  const toolSets = toolSetFactories.map((createToolSet) => createToolSet(options));
  return {
    toolDefinitions: toolSets.flatMap((toolSet) => toolSet.toolDefinitions),
    toolHandlers: Object.assign({}, ...toolSets.map((toolSet) => toolSet.toolHandlers)),
  };
}

module.exports = { createGuildToolSet };
