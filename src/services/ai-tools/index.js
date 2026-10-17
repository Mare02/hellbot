const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');
const chatContextTool = require('./getChatContext');
const exchangeRatesTool = require('./exchangeRates/getExchangeRates');
const { createMemoryToolSet, memoryToolsPrompt } = require('./memory');
const { createGuildToolSet } = require('./guild');

async function createToolSet(channel, options = {}) {
  const memoryToolSet = await createMemoryToolSet({ ...options, channel });
  const guildToolSet = createGuildToolSet({ ...options, channel });
  const memoryEnabled = memoryToolSet.toolDefinitions.length > 0;
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
