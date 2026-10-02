const { getRecentChannelContext } = require('../chatContext');

const definition = {
  type: 'function',
  function: {
    name: 'get_chat_context',
    description: 'Fetch recent text and embeds from the current Discord channel. For every genuine information-seeking question or request, call this as the second tool after search_memory returns, even if search_memory found relevant notes or found none. For an explicit save request with an unclear reference like "that", "it", or "this", call this to resolve what the user intends to save; prefer the user\'s relevant statement over Hellbot\'s reply. Do not call for greetings, banter, reactions, statements, or obvious rhetorical questions.',
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
