const DEFAULT_CHAT_CONTEXT_LIMIT = 15;
const GROQ_IMAGE_URL_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const STATIC_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];

function isGifUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    return new URL(url).pathname.toLowerCase().endsWith('.gif');
  } catch (error) {
    return url.toLowerCase().includes('.gif');
  }
}

function isUnsupportedVisionMedia(attachment) {
  const contentType = attachment?.contentType?.toLowerCase() || '';
  const url = attachment?.url || '';
  const name = attachment?.name || '';

  if (contentType === 'image/gif') {
    return true;
  }

  return isGifUrl(url) || isGifUrl(name);
}

function isLikelyImageAttachment(attachment) {
  const contentType = attachment?.contentType?.toLowerCase() || '';
  const url = attachment?.url?.toLowerCase() || '';
  const name = attachment?.name?.toLowerCase() || '';

  if (contentType.startsWith('image/')) {
    return true;
  }

  if (contentType.startsWith('video/')) {
    return false;
  }

  return [url, name].some((candidate) =>
    STATIC_IMAGE_EXTENSIONS.some((extension) => candidate.endsWith(extension))
  );
}

function formatEmbed(embed, index) {
  const parts = [];

  if (embed.author?.name) {
    parts.push(`author: ${embed.author.name}`);
  }

  if (embed.title) {
    parts.push(`title: ${embed.title}`);
  }

  if (embed.description) {
    parts.push(`description: ${embed.description}`);
  }

  if (Array.isArray(embed.fields) && embed.fields.length) {
    const fields = embed.fields
      .map((field) => `${field.name}: ${field.value}`)
      .join(' | ');
    parts.push(`fields: ${fields}`);
  }

  if (embed.footer?.text) {
    parts.push(`footer: ${embed.footer.text}`);
  }

  if (embed.url) {
    parts.push(`url: ${embed.url}`);
  }

  if (!parts.length) {
    return null;
  }

  return `embed ${index + 1}: ${parts.join(' | ')}`;
}

function serializeMessageContent(message) {
  const lines = [];

  if (message.content && message.content.trim()) {
    lines.push(`text: ${message.content.trim()}`);
  }

  if (Array.isArray(message.embeds) && message.embeds.length) {
    const embeds = message.embeds
      .map((embed, index) => formatEmbed(embed, index))
      .filter(Boolean);

    if (embeds.length) {
      lines.push(...embeds);
    }
  }

  return lines.join('\n');
}

function formatMessageContext(message) {
  const content = serializeMessageContent(message);

  if (!content) {
    return null;
  }

  const authorName = message.author?.username || 'Unknown';
  return `${authorName}: ${content}`;
}

function getMessageImageUrl(message) {
  if (!message) {
    return null;
  }

  for (const attachment of message.attachments?.values?.() || []) {
    const isImage = isLikelyImageAttachment(attachment);
    const isWithinSizeLimit = typeof attachment.size === 'number'
      ? attachment.size <= GROQ_IMAGE_URL_SIZE_LIMIT_BYTES
      : true;
    const isSupportedMedia = !isUnsupportedVisionMedia(attachment);

    if (isImage && isWithinSizeLimit && isSupportedMedia) {
      return attachment.url;
    }
  }

  for (const embed of message.embeds || []) {
    const embedImageUrl = embed?.image?.url;
    if (embedImageUrl && !isGifUrl(embedImageUrl)) {
      return embedImageUrl;
    }

    const embedThumbnailUrl = embed?.thumbnail?.url;
    if (embedThumbnailUrl && !isGifUrl(embedThumbnailUrl)) {
      return embedThumbnailUrl;
    }
  }

  return null;
}

function hasOversizedImageAttachment(message) {
  if (!message?.attachments?.size) {
    return false;
  }

  return Array.from(message.attachments.values()).some((attachment) => {
    const isImage = isLikelyImageAttachment(attachment);
    return isImage && typeof attachment.size === 'number' && attachment.size > GROQ_IMAGE_URL_SIZE_LIMIT_BYTES;
  });
}

function hasUnsupportedVisionAttachment(message) {
  if (!message?.attachments?.size) {
    return false;
  }

  return Array.from(message.attachments.values()).some((attachment) => {
    const isImage = isLikelyImageAttachment(attachment);
    return isImage && isUnsupportedVisionMedia(attachment);
  });
}

async function getRecentChannelContext(channel, options = {}) {
  const parsedLimit = Number.parseInt(options.limit, 10);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(50, Math.max(1, parsedLimit))
    : DEFAULT_CHAT_CONTEXT_LIMIT;

  if (!channel?.messages?.fetch) {
    throw new Error('A valid Discord channel is required to load chat context.');
  }

  const recentMessages = await channel.messages.fetch({ limit });
  const formattedMessages = recentMessages
    .reverse()
    .map((message) => formatMessageContext(message))
    .filter(Boolean);

  if (!formattedMessages.length) {
    return 'No recent text or embed context was found in this channel.';
  }

  return formattedMessages.join('\n');
}

module.exports = {
  DEFAULT_CHAT_CONTEXT_LIMIT,
  GROQ_IMAGE_URL_SIZE_LIMIT_BYTES,
  getMessageImageUrl,
  hasOversizedImageAttachment,
  hasUnsupportedVisionAttachment,
  formatMessageContext,
  serializeMessageContent,
  getRecentChannelContext,
};
