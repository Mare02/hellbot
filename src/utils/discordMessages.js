const { AttachmentBuilder } = require('discord.js');

const DISCORD_TEXT_LIMIT = 2000;
const DEFAULT_ATTACHMENT_NAME = 'ai-response.md';
const OVER_LIMIT_MESSAGE = 'The response was too long for a Discord message, so I sent it as a file.';

function buildDiscordPayload(content, options = {}) {
  if (typeof content !== 'string') {
    return content;
  }

  const limit = options.limit ?? DISCORD_TEXT_LIMIT;
  if (content.length <= limit) {
    return content;
  }

  const fileName = options.fileName ?? DEFAULT_ATTACHMENT_NAME;
  return {
    content: OVER_LIMIT_MESSAGE,
    files: [new AttachmentBuilder(Buffer.from(content, 'utf8'), { name: fileName })],
  };
}

async function sendDiscordContent(target, content, options = {}) {
  const payload = buildDiscordPayload(content, options);

  if (typeof target?.reply === 'function') {
    return target.reply(payload);
  }

  if (typeof target?.send === 'function') {
    return target.send(payload);
  }

  throw new Error('Target does not support sending Discord messages.');
}

module.exports = {
  DISCORD_TEXT_LIMIT,
  buildDiscordPayload,
  sendDiscordContent,
};
