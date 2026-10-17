const { getMessageContent } = require('../utils/messageContent');

const DEFAULT_CHAT_CONTEXT_LIMIT = 15;
const { currentAiProvider } = require('../utils/config');
const GROQ_IMAGE_URL_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;
const STATIC_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];
const GEMINI_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

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

  if (isGifUrl(url) || isGifUrl(name)) {
    return true;
  }

  if (currentAiProvider === 'google') {
    if (contentType.startsWith('image/') && !GEMINI_IMAGE_MIME_TYPES.includes(contentType.split(';')[0])) {
      return true;
    }
    return [url, name].some(value => /\.(bmp|tiff?|svg)(?:[?#]|$)/i.test(value));
  }

  return false;
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
  const messageContent = getMessageContent(message);

  if (messageContent.content.trim()) {
    lines.push(`text: ${messageContent.content.trim()}`);
  }

  if (messageContent.embeds.length) {
    const embeds = messageContent.embeds
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
  const { attachments } = getMessageContent(message);

  if (!content && attachments.length === 0) {
    return null;
  }

  const authorName = message.author?.username || 'Unknown';
  return {
    messageId: message.id,
    author: authorName,
    createdAt: message.createdAt?.toISOString() || null,
    content: content || null,
    attachments: attachments.map((attachment) => ({
      id: attachment.id || null,
      name: attachment.name || null,
      contentType: attachment.contentType || null,
      size: attachment.size ?? null,
      url: attachment.url,
    })),
  };
}

function getMessageImageUrl(message) {
  if (!message) {
    return null;
  }

  const { attachments, embeds } = getMessageContent(message);
  for (const attachment of attachments) {
    const isImage = isLikelyImageAttachment(attachment);
    const isWithinSizeLimit = typeof attachment.size === 'number'
      ? attachment.size <= GROQ_IMAGE_URL_SIZE_LIMIT_BYTES
      : true;
    const isSupportedMedia = !isUnsupportedVisionMedia(attachment);

    if (isImage && isWithinSizeLimit && isSupportedMedia) {
      return attachment.url;
    }
  }

  for (const embed of embeds) {
    const embedImageUrl = embed?.image?.url;
    if (embedImageUrl && !isUnsupportedVisionMedia({ url: embedImageUrl })) {
      return embedImageUrl;
    }

    const embedThumbnailUrl = embed?.thumbnail?.url;
    if (embedThumbnailUrl && !isUnsupportedVisionMedia({ url: embedThumbnailUrl })) {
      return embedThumbnailUrl;
    }
  }

  return null;
}

function hasOversizedImageAttachment(message) {
  const { attachments } = getMessageContent(message);
  return attachments.some((attachment) => {
    const isImage = isLikelyImageAttachment(attachment);
    return isImage && typeof attachment.size === 'number' && attachment.size > GROQ_IMAGE_URL_SIZE_LIMIT_BYTES;
  });
}

function hasUnsupportedVisionAttachment(message) {
  const { attachments } = getMessageContent(message);
  return attachments.some((attachment) => {
    const isImage = isLikelyImageAttachment(attachment);
    return isImage && isUnsupportedVisionMedia(attachment);
  });
}

function getContextVisionImages(message, attachmentId) {
  const { attachments } = getMessageContent(message);
  const supportedImages = attachments.filter((attachment) => {
    const isSupported = isLikelyImageAttachment(attachment)
      && !isUnsupportedVisionMedia(attachment)
      && (typeof attachment.size !== 'number' || attachment.size <= GROQ_IMAGE_URL_SIZE_LIMIT_BYTES);
    return isSupported && (!attachmentId || attachment.id === attachmentId);
  });

  return supportedImages.slice(0, 5).map((attachment) => ({
    messageId: message.id,
    attachmentId: attachment.id || null,
    name: attachment.name || null,
    url: attachment.url,
  }));
}

async function getRecentChannelContext(channel, options = {}) {
  const parsedLimit = Number.parseInt(options.limit, 10);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(50, Math.max(1, parsedLimit))
    : DEFAULT_CHAT_CONTEXT_LIMIT;

  if (!channel?.messages?.fetch) {
    throw new Error('A valid Discord channel is required to load chat context.');
  }

  if (options.messageId) {
    if (typeof options.messageId !== 'string' || !/^\d{17,20}$/.test(options.messageId)) {
      throw new Error('Provide a valid Discord message ID.');
    }
    if (options.attachmentId !== undefined
      && (typeof options.attachmentId !== 'string' || !/^\d{17,20}$/.test(options.attachmentId))) {
      throw new Error('Provide a valid Discord attachment ID.');
    }
    const message = await channel.messages.fetch({ message: options.messageId, force: true });
    const messageAttachments = getMessageContent(message).attachments;
    if (options.attachmentId
      && !messageAttachments.some((attachment) => attachment.id === options.attachmentId)) {
      throw new Error('The selected attachment was not found on that Discord message.');
    }
    const formattedMessage = formatMessageContext(message);
    if (!formattedMessage) return { success: true, messages: [], __aiVisionImages: [] };
    const visionImages = getContextVisionImages(message, options.attachmentId);
    return {
      success: true,
      messages: [formattedMessage],
      visionImagesIncluded: visionImages.length,
      __aiVisionImages: visionImages,
    };
  }

  const recentMessages = await channel.messages.fetch({ limit });
  const formattedMessages = recentMessages
    .reverse()
    .map((message) => formatMessageContext(message))
    .filter(Boolean);

  if (!formattedMessages.length) {
    return { success: true, messages: [], __aiVisionImages: [] };
  }

  return { success: true, messages: formattedMessages, __aiVisionImages: [] };
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
