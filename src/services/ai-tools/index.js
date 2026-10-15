const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');
const chatContextTool = require('./getChatContext');
const exchangeRatesTool = require('./exchangeRates/getExchangeRates');
const { createMemoryToolSet, memoryToolsPrompt } = require('./memory');
const { createServerChannelToolSet } = require('./serverChannels');
const { createServerRoleToolSet } = require('./serverRoles');
const { createServerGuildToolSet } = require('./serverGuild');
const { createServerAuditToolSet } = require('./serverAudit');
const { createServerMemberToolSet } = require('./serverMembers');
const { createServerMessageToolSet } = require('./serverMessages');
const { createServerInvitesAndEventsToolSet } = require('./serverInvitesAndEvents');
const { createServerExpressionsToolSet } = require('./serverExpressions');
const { createServerAutoModerationToolSet } = require('./serverAutoModeration');

async function createToolSet(channel, options = {}) {
  const memoryToolSet = await createMemoryToolSet({ ...options, channel });
  const serverChannelToolSet = createServerChannelToolSet({ ...options, channel });
  const serverRoleToolSet = createServerRoleToolSet({ ...options, channel });
  const serverGuildToolSet = createServerGuildToolSet({ ...options, channel });
  const serverAuditToolSet = createServerAuditToolSet({ ...options, channel });
  const serverMemberToolSet = createServerMemberToolSet({ ...options, channel });
  const serverMessageToolSet = createServerMessageToolSet({ ...options, channel });
  const serverInvitesAndEventsToolSet = createServerInvitesAndEventsToolSet({ ...options, channel });
  const serverExpressionsToolSet = createServerExpressionsToolSet({ ...options, channel });
  const serverAutoModerationToolSet = createServerAutoModerationToolSet({ ...options, channel });
  const memoryEnabled = memoryToolSet.toolDefinitions.length > 0;
  const toolDefinitions = [
    currentWeatherTool.definition,
    forecastTool.definition,
    chatContextTool.createDefinition({ memoryEnabled }),
    exchangeRatesTool.definition,
    ...serverChannelToolSet.toolDefinitions,
    ...serverRoleToolSet.toolDefinitions,
    ...serverGuildToolSet.toolDefinitions,
    ...serverAuditToolSet.toolDefinitions,
    ...serverMemberToolSet.toolDefinitions,
    ...serverMessageToolSet.toolDefinitions,
    ...serverInvitesAndEventsToolSet.toolDefinitions,
    ...serverExpressionsToolSet.toolDefinitions,
    ...serverAutoModerationToolSet.toolDefinitions,
    ...memoryToolSet.toolDefinitions,
  ];

  const toolHandlers = {
    [currentWeatherTool.definition.function.name]: currentWeatherTool.handler,
    [forecastTool.definition.function.name]: forecastTool.handler,
    [chatContextTool.definition.function.name]: chatContextTool.createHandler(channel),
    [exchangeRatesTool.definition.function.name]: exchangeRatesTool.handler,
    ...serverChannelToolSet.toolHandlers,
    ...serverRoleToolSet.toolHandlers,
    ...serverGuildToolSet.toolHandlers,
    ...serverAuditToolSet.toolHandlers,
    ...serverMemberToolSet.toolHandlers,
    ...serverMessageToolSet.toolHandlers,
    ...serverInvitesAndEventsToolSet.toolHandlers,
    ...serverExpressionsToolSet.toolHandlers,
    ...serverAutoModerationToolSet.toolHandlers,
    ...memoryToolSet.toolHandlers,
  };

  return {
    toolDefinitions,
    toolHandlers,
    memoryPrompt: memoryEnabled ? memoryToolsPrompt : null,
  };
}

const toolDefinitions = [
  currentWeatherTool.definition,
  forecastTool.definition,
  chatContextTool.definition,
  exchangeRatesTool.definition,
];

module.exports = {
  createToolSet,
  toolDefinitions,
};
