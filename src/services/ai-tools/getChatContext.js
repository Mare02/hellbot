const { getRecentChannelContext } = require('../chatContext');

const definition = {
  type: 'function',
  function: {
    name: 'get_chat_context',
    description: 'Fetch recent text and embeds from the current Discord channel. Use this when a reply, mention, or question depends on surrounding chat history.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          anyOf: [
            { type: 'integer' },
            { type: 'string', pattern: '^[0-9]+$' },
          ],
          description: 'How many recent messages to include. Defaults to 15.',
          minimum: 1,
          maximum: 50,
        },
      },
      additionalProperties: false,
    },
  },
};

function createHandler(channel) {
  return async ({ limit } = {}) => {
    const parsedLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;
    return getRecentChannelContext(channel, { limit: parsedLimit });
  };
}

module.exports = {
  definition,
  createHandler,
};
