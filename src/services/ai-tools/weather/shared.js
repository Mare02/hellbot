const messages = require('../../../utils/messages');

const WEATHER_CODE_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog with rime',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snowfall',
  73: 'Moderate snowfall',
  75: 'Heavy snowfall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function formatLocation(result) {
  return [result.name, result.admin1, result.country]
    .filter(Boolean)
    .join(', ');
}

function getWeatherCondition(weatherCode) {
  return WEATHER_CODE_LABELS[weatherCode] || 'Unknown';
}

async function resolveLocation(city) {
  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodingUrl.searchParams.set('name', city);
  geocodingUrl.searchParams.set('count', '1');
  geocodingUrl.searchParams.set('language', 'en');
  geocodingUrl.searchParams.set('format', 'json');

  const response = await fetch(geocodingUrl);

  if (!response.ok) {
    throw new Error(messages.errorState.apiError);
  }

  const data = await response.json();
  const location = data?.results?.[0];

  if (!location) {
    throw new Error(`No location found for "${city}".`);
  }

  return location;
}

async function fetchWeather(latitude, longitude, queryKey, queryValues) {
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', latitude);
  weatherUrl.searchParams.set('longitude', longitude);
  weatherUrl.searchParams.set(queryKey, queryValues.join(','));
  weatherUrl.searchParams.set('timezone', 'auto');

  const response = await fetch(weatherUrl);

  if (!response.ok) {
    throw new Error(messages.errorState.apiError);
  }

  const data = await response.json();

  if (!data?.[queryKey]) {
    throw new Error(messages.emptyState.noResponseAI);
  }

  return data;
}

async function fetchCurrentWeather(latitude, longitude) {
  return fetchWeather(latitude, longitude, 'current', [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ]);
}

async function fetchDailyForecast(latitude, longitude) {
  return fetchWeather(latitude, longitude, 'daily', [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'apparent_temperature_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_direction_10m_dominant',
  ]);
}

function buildDailyForecast(daily) {
  return daily.time.map((time, index) => ({
    date: time,
    weatherCode: daily.weather_code[index],
    condition: getWeatherCondition(daily.weather_code[index]),
    maxTemperature: daily.temperature_2m_max[index],
    minTemperature: daily.temperature_2m_min[index],
    apparentTemperatureMax: daily.apparent_temperature_max[index],
    apparentTemperatureMin: daily.apparent_temperature_min[index],
    precipitationSum: daily.precipitation_sum[index],
    precipitationProbabilityMax: daily.precipitation_probability_max[index],
    windSpeedMax: daily.wind_speed_10m_max[index],
    windDirectionDominant: daily.wind_direction_10m_dominant[index],
  }));
}

module.exports = {
  WEATHER_CODE_LABELS,
  buildDailyForecast,
  fetchCurrentWeather,
  fetchDailyForecast,
  formatLocation,
  getWeatherCondition,
  resolveLocation,
};
