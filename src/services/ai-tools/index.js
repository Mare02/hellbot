const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');
const chatContextTool = require('./getChatContext');
const exchangeRatesTool = require('./exchangeRates/getExchangeRates');

function createToolSet(channel) {
  const toolDefinitions = [
    currentWeatherTool.definition,
    forecastTool.definition,
    chatContextTool.definition,
    exchangeRatesTool.definition,
  ];

  const toolHandlers = {
    [currentWeatherTool.definition.function.name]: currentWeatherTool.handler,
    [forecastTool.definition.function.name]: forecastTool.handler,
    [chatContextTool.definition.function.name]: chatContextTool.createHandler(channel),
    [exchangeRatesTool.definition.function.name]: exchangeRatesTool.handler,
  };

  return {
    toolDefinitions,
    toolHandlers,
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
