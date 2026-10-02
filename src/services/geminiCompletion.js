const { setTimeout: delay } = require('node:timers/promises');
const { createApiKeyRotator } = require('../utils/apiKeyRotator');

const GEMINI_COMPLETIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MAX_RETRIES = 2;
const apiKeyRotator = createApiKeyRotator('GEMINI_API_KEY');

function hasGeminiApiKeys() {
  return apiKeyRotator.hasKeys();
}

// Gemini's OpenAI-compatible endpoint uses Hellbot's existing messages and tools.
async function createGeminiCompletion(request) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(GEMINI_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKeyRotator.next()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok) {
      return response.json();
    }
    await response.body?.cancel();
    if ([500, 502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
      await delay(1000 * (2 ** attempt) + Math.random() * 250);
      continue;
    }
    const error = new Error('Gemini request failed.');
    error.status = response.status;
    throw error;
  }
}

module.exports = { createGeminiCompletion, hasGeminiApiKeys };
