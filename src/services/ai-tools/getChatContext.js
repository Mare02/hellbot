const { getRecentChannelContext } = require('../chatContext');

const definition = {
  type: 'function',
  function: {
    name: 'get_chat_context',
    description: 'Fetch recent messages from the current Discord channel, including text, embeds, and metadata (ID, filename, MIME type, size, and URL) for every attachment. Image-only messages are included. When a request depends on an earlier image, use the attachment metadata to identify its message and attachment IDs, then call this tool again with those IDs to inspect that image visually.',
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
        message_id: {
          type: 'string',
          pattern: '^[0-9]{17,20}$',
          description: 'Fetch one exact message from the current channel. Use a messageId returned by a previous get_chat_context call to inspect its attachments.',
        },
        attachment_id: {
          type: 'string',
          pattern: '^[0-9]{17,20}$',
          description: 'Optional exact attachment ID to inspect from message_id. When omitted, up to five supported images in that message are inspected.',
        },
      },
      additionalProperties: false,
    },
  },
};

function createDefinition({ memoryEnabled = false } = {}) {
  if (!memoryEnabled) return definition;
  return {
    ...definition,
    function: {
      ...definition.function,
      description: 'Fetch recent messages from the current Discord channel, including text, embeds, and metadata (ID, filename, MIME type, size, and URL) for every attachment. Image-only messages are included. For every genuine information-seeking question or request, call this as the second tool after search_memory returns, even if search_memory found relevant notes or found none. For an explicit save request with an unclear reference like "that", "it", or "this", call this to resolve what the user intends to save; prefer the user\'s relevant statement over Hellbot\'s reply. When a request depends on an earlier image, use the returned messageId and attachment ID to call this again and inspect the image visually. Do not call for greetings, banter, reactions, statements, or obvious rhetorical questions.',
    },
  };
}

function createHandler(channel) {
  return async ({ limit, message_id: messageId, attachment_id: attachmentId } = {}) => {
    const parsedLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;
    if (attachmentId !== undefined && !messageId) throw new Error('message_id is required when attachment_id is provided.');
    return getRecentChannelContext(channel, {
      limit: parsedLimit,
      messageId,
      attachmentId,
    });
  };
}

module.exports = {
  definition,
  createDefinition,
  createHandler,
};
