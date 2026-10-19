module.exports = [
  { id: 'groq', label: 'Groq', group: 'AI providers', envPrefix: 'GROQ_API_KEY' },
  { id: 'google', label: 'Google Gemini', group: 'AI providers', envPrefix: 'GEMINI_API_KEY' },
  {
    id: 'edenai',
    label: 'EdenAI · image generation',
    group: 'AI providers',
    envPrefix: 'EDENAI_API_KEY',
  },
  { id: 'newsapi', label: 'NewsAPI', group: 'Integrations', envPrefix: 'NEWS_API_KEY' },
  {
    id: 'exchangerate',
    label: 'ExchangeRate-API',
    group: 'Integrations',
    envPrefix: 'EXCHANGE_RATE_API_KEY',
  },
  { id: 'apininjas', label: 'API Ninjas', group: 'Integrations', envPrefix: 'NINJA_API_KEY' },
];
