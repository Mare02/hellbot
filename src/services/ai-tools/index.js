const currentWeatherTool = require('./weather/getCurrentWeather');
const forecastTool = require('./weather/getForecast');

const toolDefinitions = [
  currentWeatherTool.definition,
  forecastTool.definition,
];

const toolHandlers = {
  [currentWeatherTool.definition.function.name]: currentWeatherTool.handler,
  [forecastTool.definition.function.name]: forecastTool.handler,
};

module.exports = {
  toolDefinitions,
  toolHandlers,
};
