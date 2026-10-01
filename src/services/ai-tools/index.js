const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');
const chatContextTool = require('./getChatContext');
const exchangeRatesTool = require('./exchangeRates/getExchangeRates');
const { createMemoryToolSet, memoryToolsPrompt } = require('./memory');

async function createToolSet(channel, options = {}) {
  const memoryToolSet = await createMemoryToolSet({ ...options, channel });
  const toolDefinitions = [
    currentWeatherTool.definition,
    forecastTool.definition,
    chatContextTool.definition,
    exchangeRatesTool.definition,
    ...memoryToolSet.toolDefinitions,
  ];

  const toolHandlers = {
    [currentWeatherTool.definition.function.name]: currentWeatherTool.handler,
    [forecastTool.definition.function.name]: forecastTool.handler,
    [chatContextTool.definition.function.name]: chatContextTool.createHandler(channel),
    [exchangeRatesTool.definition.function.name]: exchangeRatesTool.handler,
    ...memoryToolSet.toolHandlers,
  };

  return {
    toolDefinitions,
    toolHandlers,
    memoryPrompt: memoryToolSet.toolDefinitions.length ? memoryToolsPrompt : null,
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
