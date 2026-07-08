const {
  buildDailyForecast,
  fetchDailyForecast,
  formatLocation,
  resolveLocation,
} = require('./shared');

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'get_forecast',
      description: 'Get the 7-day weather forecast for a city using Open-Meteo.',
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
    const weather = await fetchDailyForecast(location.latitude, location.longitude);

    return {
      location: {
        name: formatLocation(location),
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      },
      forecast: buildDailyForecast(weather.daily),
      units: weather.daily_units,
    };
  },
};
