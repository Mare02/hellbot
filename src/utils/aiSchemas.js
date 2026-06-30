const futureNewsResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'future_news',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        society: { type: 'string' },
        tech: { type: 'string' },
        finance: { type: 'string' },
        science: { type: 'string' }
      },
      required: ['society', 'tech', 'finance', 'science'],
      additionalProperties: false
    }
  }
};

module.exports = {
  futureNewsResponseFormat
};
