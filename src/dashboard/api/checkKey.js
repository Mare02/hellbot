const { createTrackedFetch } = require('../../services/aiUsage/tracking');

async function checkKey({ provider, value }, { allowGeneration, customProvider }) {
  if (provider === 'edenai' && !allowGeneration) {
    return {
      success: false,
      tested: false,
      message: 'Confirm a test image generation to check this EdenAI key.',
    };
  }
  if (provider.startsWith('custom_') && !customProvider) {
    return {
      success: false,
      tested: false,
      message: 'Custom provider is not configured for this bot.',
    };
  }
  try {
    if (provider === 'edenai') {
      const { useImageGen } = require('../../services/AIservice');
      await useImageGen('A plain white square on a white background.', { apiKey: value });
      return {
        success: true,
        tested: true,
        message: 'EdenAI generated the test image successfully.',
      };
    }
    const checks = {
      groq: {
        endpoint: 'https://api.groq.com/openai/v1/models',
        headers: { Authorization: `Bearer ${value}` },
      },
      google: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
        headers: { 'x-goog-api-key': value },
      },
      newsapi: {
        endpoint: 'https://newsapi.org/v2/top-headlines?country=us&pageSize=1',
        headers: { 'X-Api-Key': value },
        accepts: (data) => data?.status === 'ok' && Array.isArray(data.articles),
      },
      exchangerate: {
        endpoint: `https://v6.exchangerate-api.com/v6/${encodeURIComponent(value)}/quota`,
        accepts: (data) => data?.result === 'success',
      },
      apininjas: {
        endpoint: 'https://api.api-ninjas.com/v2/randomquotes',
        headers: { 'X-Api-Key': value },
        accepts: (data) => Array.isArray(data) && typeof data[0]?.quote === 'string',
      },
    };
    if (provider.startsWith('custom_')) {
      checks[provider] = {
        endpoint: new URL('models', `${customProvider.baseUrl.replace(/\/$/, '')}/`).toString(),
        headers: { Authorization: `Bearer ${value}` },
      };
    }
    const check = Object.hasOwn(checks, provider) ? checks[provider] : null;
    if (!check) return { success: false, tested: false, message: 'Unsupported provider.' };
    const providerFetch =
      ['groq', 'google'].includes(provider) || provider.startsWith('custom_')
        ? createTrackedFetch({ provider, operation: 'connection.check' })
        : fetch;
    const response = await providerFetch(check.endpoint, {
      headers: check.headers,
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    let success = response.ok;
    if (success && check.accepts) success = check.accepts(await response.json());
    else await response.body?.cancel();
    return {
      success,
      tested: true,
      message: !response.ok
        ? `Provider check returned HTTP ${response.status}.`
        : !success
          ? 'Provider did not accept the request. Check the key, quota and account access.'
          : check.accepts
            ? 'Provider accepted the key and returned a valid response.'
            : 'Provider accepted the key. Model inference and quota were not checked.',
    };
  } catch {
    return {
      success: false,
      tested: true,
      message:
        provider === 'edenai'
          ? 'EdenAI could not generate a test image. Check the key, account credits and provider availability.'
          : 'Provider could not be reached. Key validity was not confirmed.',
    };
  }
}

module.exports = { checkKey };
