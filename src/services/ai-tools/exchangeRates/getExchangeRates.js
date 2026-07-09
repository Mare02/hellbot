const messages = require('../../../utils/messages');

function normalizeCurrencyCode(value) {
  return String(value || '').trim().toUpperCase();
}

function parseRequestedCurrencies(targetCurrencies) {
  if (!Array.isArray(targetCurrencies)) {
    return [];
  }

  return [...new Set(
    targetCurrencies
      .map(normalizeCurrencyCode)
      .filter(Boolean)
  )];
}

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'get_exchange_rates',
      description: 'Get exchange rates for a base currency and one or more target currencies using ExchangeRate-API.',
      parameters: {
        type: 'object',
        properties: {
          baseCurrency: {
            type: 'string',
            description: 'The three-letter ISO 4217 base currency code, for example "USD".',
          },
          targetCurrencies: {
            type: 'array',
            items: {
              type: 'string',
              description: 'A three-letter ISO 4217 target currency code, for example "EUR".',
            },
            description: 'The currencies to return exchange rates for.',
            minItems: 1,
          },
        },
        required: ['baseCurrency', 'targetCurrencies'],
        additionalProperties: false,
      },
    },
  },

  handler: async ({ baseCurrency, targetCurrencies }) => {
    const normalizedBaseCurrency = normalizeCurrencyCode(baseCurrency);
    const requestedCurrencies = parseRequestedCurrencies(targetCurrencies);

    if (!normalizedBaseCurrency) {
      throw new Error('Base currency is required.');
    }

    if (!requestedCurrencies.length) {
      throw new Error('At least one target currency is required.');
    }

    const url = new URL(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${normalizedBaseCurrency}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(messages.errorState.apiError);
    }

    const data = await response.json();

    if (data?.result !== 'success') {
      throw new Error(data?.['error-type'] || messages.errorState.apiError);
    }

    const conversionRates = {};
    const missingCurrencies = [];

    for (const currency of requestedCurrencies) {
      if (Object.prototype.hasOwnProperty.call(data.conversion_rates, currency)) {
        conversionRates[currency] = data.conversion_rates[currency];
      } else {
        missingCurrencies.push(currency);
      }
    }

    if (missingCurrencies.length) {
      throw new Error(`Unsupported currency code(s): ${missingCurrencies.join(', ')}`);
    }

    return {
      baseCurrency: data.base_code,
      requestedCurrencies,
      conversionRates,
      timeLastUpdateUtc: data.time_last_update_utc,
      timeNextUpdateUtc: data.time_next_update_utc,
      documentation: data.documentation,
    };
  },
};
