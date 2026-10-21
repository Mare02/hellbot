const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');
const chatContextTool = require('./getChatContext');
const exchangeRatesTool = require('./exchangeRates/getExchangeRates');
const { createMemoryToolSet, memoryToolsPrompt } = require('./memory');
const { createGuildToolSet } = require('./guild');
const { initializeRuntimeConfig } = require('../config/runtime');
const registry = require('../../data/aiToolRegistry');
const knownTools = new Set(registry.map((tool) => tool.name));

function isToolEnabled(name) {
  return knownTools.has(name) && initializeRuntimeConfig().snapshot.ai.tools[name] === true;
}

function filterEnabledTools(request) {
  if (!request.tools) return request;
  const next = { ...request };
  const enabled = request.tools.filter((tool) => isToolEnabled(tool.function.name));
  if (enabled.length) next.tools = enabled;
  else {
    delete next.tools;
    delete next.tool_choice;
    delete next.parallel_tool_calls;
  }
  return next;
}

async function createToolSet(channel, options = {}) {
  const memoryToolSet = registry.some(
    (tool) => tool.group === 'Server memory' && isToolEnabled(tool.name)
  )
    ? await createMemoryToolSet({ ...options, channel })
    : { toolDefinitions: [], toolHandlers: {} };
  const guildToolSet = createGuildToolSet({ ...options, channel });
  const memoryEnabled =
    memoryToolSet.toolDefinitions.some((tool) => tool.function.name === 'search_memory') &&
    isToolEnabled('search_memory') &&
    isToolEnabled('get_chat_context');
  const toolDefinitions = [
    currentWeatherTool.definition,
    forecastTool.definition,
    chatContextTool.createDefinition({ memoryEnabled }),
    exchangeRatesTool.definition,
    ...guildToolSet.toolDefinitions,
    ...memoryToolSet.toolDefinitions,
  ];

  const toolHandlers = {
    [currentWeatherTool.definition.function.name]: currentWeatherTool.handler,
    [forecastTool.definition.function.name]: forecastTool.handler,
    [chatContextTool.definition.function.name]: chatContextTool.createHandler(channel),
    [exchangeRatesTool.definition.function.name]: exchangeRatesTool.handler,
    ...guildToolSet.toolHandlers,
    ...memoryToolSet.toolHandlers,
  };

  return {
    toolDefinitions: toolDefinitions
      .filter((tool) => isToolEnabled(tool.function.name))
      .map((tool) => {
        if (tool.function.name !== 'search_memory' || isToolEnabled('get_chat_context'))
          return tool;
        return {
          ...tool,
          function: {
            ...tool.function,
            description:
              'Search readable server memories before answering genuine information requests. Use kind task and status open for open-task lists; omit kind/status to browse all categories. Do not call unavailable tools. Returned author, channel, and requester IDs identify the source and authenticated requester.',
          },
        };
      }),
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
  isToolEnabled,
  filterEnabledTools,
  toolDefinitions,
};
