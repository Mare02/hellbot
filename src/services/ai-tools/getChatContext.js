const { getRecentChannelContext } = require('../chatContext');

const definition = {
  type: 'function',
  function: {
    name: 'get_chat_context',
    description: 'Fetch recent text and embeds from the current Discord channel. If search_memory is available, call it first for a genuine question and wait for its result; use this only if recent conversation is still needed. For an explicit remember/note/save request with unclear content or a reference like "that", "it", or "this", use recent messages to resolve what the user intends to save; prefer the user\'s relevant statement over Hellbot\'s reply. For other non-question requests, use when recent conversation is relevant.',
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
