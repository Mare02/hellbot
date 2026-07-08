const {
  fetchCurrentWeather,
  formatLocation,
  getWeatherCondition,
  resolveLocation,
} = require('./shared');

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get the current weather for a city using Open-Meteo.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The city name to look up, for example "Belgrade".',
          },
        },
        required: ['city'],
        additionalProperties: false,
      },
    },
  },

  handler: async ({ city }) => {
    const normalizedCity = String(city || '').trim();

    if (!normalizedCity) {
      throw new Error('City is required.');
    }

    const location = await resolveLocation(normalizedCity);
    const weather = await fetchCurrentWeather(location.latitude, location.longitude);
    const current = weather.current;

    return {
      location: {
        name: formatLocation(location),
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      },
      current: {
        time: current.time,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        weatherCode: current.weather_code,
        condition: getWeatherCondition(current.weather_code),
      },
      units: weather.current_units,
    };
  },
};
