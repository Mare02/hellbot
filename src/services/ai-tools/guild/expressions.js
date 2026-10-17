const { PermissionFlagsBits } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./access');

const expressionTools = [
  {
    type: 'function',
    function: {
      name: 'get_server_expressions',
      description: 'List custom emojis and stickers in the configured Hellbot server.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_server_emoji',
      description: 'Upload a custom emoji from an HTTPS PNG, JPEG, GIF, or WebP image hosted on Discord CDN. Only create when explicitly requested.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', pattern: '^[a-zA-Z0-9_]{2,32}$' },
          image_url: { type: 'string', maxLength: 2048, description: 'Discord CDN image URL, including an attachment from chat context.' },
        },
        required: ['name', 'image_url'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_server_emoji',
      description: 'Rename a custom emoji in the configured server by exact emoji ID.',
      parameters: {
        type: 'object',
        properties: {
          emoji_id: { type: 'string', description: 'Exact emoji ID from get_server_expressions.' },
          name: { type: 'string', pattern: '^[a-zA-Z0-9_]{2,32}$' },
        },
        required: ['emoji_id', 'name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_server_emoji',
      description: 'Permanently delete a custom emoji from the configured server. Only delete when explicitly requested.',
      parameters: {
        type: 'object',
        properties: { emoji_id: { type: 'string', description: 'Exact emoji ID from get_server_expressions.' } },
        required: ['emoji_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_server_sticker',
      description: 'Upload a custom static PNG sticker from an HTTPS PNG image hosted on Discord CDN. tags must be a related Unicode emoji such as 👋. Only create when explicitly requested.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 30 },
          description: { type: 'string', maxLength: 100 },
          tags: { type: 'string', minLength: 1, maxLength: 200, description: 'A related Unicode emoji, for example 👋.' },
          image_url: { type: 'string', maxLength: 2048, description: 'Discord CDN PNG URL, including an image attachment in chat context.' },
        },
        required: ['name', 'tags', 'image_url'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_server_sticker',
      description: 'Edit the name, description, or tags of a custom sticker by exact sticker ID.',
      parameters: {
        type: 'object',
        properties: {
          sticker_id: { type: 'string', description: 'Exact sticker ID from get_server_expressions.' },
          name: { type: 'string', minLength: 2, maxLength: 30 },
          description: { type: 'string', maxLength: 100 },
          tags: { type: 'string', minLength: 1, maxLength: 200 },
        },
        required: ['sticker_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_server_sticker',
      description: 'Permanently delete a custom sticker from the configured server. Only delete when explicitly requested.',
      parameters: {
        type: 'object',
        properties: { sticker_id: { type: 'string', description: 'Exact sticker ID from get_server_expressions.' } },
        required: ['sticker_id'],
        additionalProperties: false,
      },
    },
  },
];

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function serializeEmoji(emoji) {
  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
    available: emoji.available,
    managed: emoji.managed,
    url: emoji.imageURL({ size: 1024 }),
  };
}

function serializeSticker(sticker) {
  return {
    id: sticker.id,
    name: sticker.name,
    description: sticker.description || null,
    tags: sticker.tags,
    format: sticker.format,
    available: sticker.available,
    url: sticker.url,
  };
}

async function fetchDiscordImage(url, { pngOnly = false, maxBytes, label }) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${label} must be a valid HTTPS image URL.`);
  }
  if (parsedUrl.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(parsedUrl.hostname)) {
    throw new Error(`${label} must use cdn.discordapp.com or media.discordapp.net over HTTPS.`);
  }
  const response = await fetch(parsedUrl, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Discord image download failed for ${label}.`);
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  const supportedTypes = pngOnly ? ['image/png'] : ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(contentType)) throw new Error(`${label} must be ${pngOnly ? 'a PNG' : 'a PNG, JPEG, GIF, or WebP'} image.`);
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error(`${label} must be ${maxBytes} bytes or smaller.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) throw new Error(`${label} must be between 1 and ${maxBytes} bytes.`);
  return bytes;
}

function createServerExpressionsToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  async function requireManageExpressions() {
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      throw new Error('The bot needs Manage Expressions permission for this action.');
    }
  }

  const toolHandlers = {
    get_server_expressions: async () => {
      ensureAccess();
      const [emojis, stickers] = await Promise.all([guild.emojis.fetch(), guild.stickers.fetch()]);
      return {
        success: true,
        emojiCount: emojis.size,
        stickerCount: stickers.size,
        emojis: [...emojis.values()].map(serializeEmoji),
        stickers: [...stickers.values()].map(serializeSticker),
      };
    },

    create_server_emoji: async ({ name, image_url: imageUrl } = {}) => {
      ensureAccess();
      if (typeof name !== 'string' || !/^[a-zA-Z0-9_]{2,32}$/.test(name)) throw new Error('Emoji name must be 2 to 32 letters, numbers, or underscores.');
      if (typeof imageUrl !== 'string' || imageUrl.length > 2048) throw new Error('Provide a Discord CDN image URL.');
      await requireManageExpressions();
      const image = await fetchDiscordImage(imageUrl, { maxBytes: 256 * 1024, label: 'Emoji image' });
      const emoji = await guild.emojis.create({ attachment: image, name, reason: `Requested by Hellbot owner ${user.id} through AI server tools` });
      const verified = await guild.emojis.fetch(emoji.id, { force: true });
      if (!verified) throw new Error('Emoji was created, but Discord did not return it for verification.');
      return { success: true, emoji: serializeEmoji(verified) };
    },

    edit_server_emoji: async ({ emoji_id: emojiId, name } = {}) => {
      ensureAccess();
      if (!isSnowflake(emojiId)) throw new Error('Provide a valid emoji ID.');
      if (typeof name !== 'string' || !/^[a-zA-Z0-9_]{2,32}$/.test(name)) throw new Error('Emoji name must be 2 to 32 letters, numbers, or underscores.');
      await requireManageExpressions();
      const emoji = await guild.emojis.fetch(emojiId, { force: true });
      if (!emoji) throw new Error('Emoji not found in the configured server.');
      if (emoji.managed) throw new Error('Integration-managed emojis cannot be edited with this tool.');
      const edited = await guild.emojis.edit(emoji, { name, reason: `Requested by Hellbot owner ${user.id} through AI server tools` });
      const verified = await guild.emojis.fetch(emojiId, { force: true });
      if (!verified || verified.name !== edited.name) throw new Error('Emoji was edited, but Discord did not return the updated emoji.');
      return { success: true, emoji: serializeEmoji(verified) };
    },

    delete_server_emoji: async ({ emoji_id: emojiId } = {}) => {
      ensureAccess();
      if (!isSnowflake(emojiId)) throw new Error('Provide a valid emoji ID.');
      await requireManageExpressions();
      const emoji = await guild.emojis.fetch(emojiId, { force: true });
      if (!emoji) throw new Error('Emoji not found in the configured server.');
      if (emoji.managed) throw new Error('Integration-managed emojis cannot be deleted with this tool.');
      const removed = { id: emoji.id, name: emoji.name };
      await guild.emojis.delete(emoji, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedEmojis = await guild.emojis.fetch();
      if (verifiedEmojis.has(emojiId)) throw new Error('Emoji deletion was requested, but Discord still returned it.');
      return { success: true, deleted: true, emoji: removed };
    },

    create_server_sticker: async ({ name, description, tags, image_url: imageUrl } = {}) => {
      ensureAccess();
      if (typeof name !== 'string' || name.length < 2 || name.length > 30) throw new Error('Sticker name must contain 2 to 30 characters.');
      if (description !== undefined && (typeof description !== 'string' || description.length > 100)) throw new Error('Sticker description must be at most 100 characters.');
      if (typeof tags !== 'string' || !tags.trim() || tags.length > 200) throw new Error('Sticker tags must contain 1 to 200 characters.');
      if (typeof imageUrl !== 'string' || imageUrl.length > 2048) throw new Error('Provide a Discord CDN PNG URL.');
      await requireManageExpressions();
      const image = await fetchDiscordImage(imageUrl, { pngOnly: true, maxBytes: 512 * 1024, label: 'Sticker image' });
      const sticker = await guild.stickers.create({
        file: image,
        name,
        tags: tags.trim(),
        ...(description !== undefined ? { description } : {}),
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verified = await guild.stickers.fetch(sticker.id, { force: true });
      if (!verified) throw new Error('Sticker was created, but Discord did not return it for verification.');
      return { success: true, sticker: serializeSticker(verified) };
    },

    edit_server_sticker: async ({ sticker_id: stickerId, ...requestedChanges } = {}) => {
      ensureAccess();
      if (!isSnowflake(stickerId)) throw new Error('Provide a valid sticker ID.');
      await requireManageExpressions();
      const target = await guild.stickers.fetch(stickerId, { force: true });
      if (!target) throw new Error('Sticker not found in the configured server.');
      const changes = {};
      if (Object.hasOwn(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || requestedChanges.name.length < 2 || requestedChanges.name.length > 30) throw new Error('Sticker name must contain 2 to 30 characters.');
        changes.name = requestedChanges.name;
      }
      if (Object.hasOwn(requestedChanges, 'description')) {
        if (typeof requestedChanges.description !== 'string' || requestedChanges.description.length > 100) throw new Error('Sticker description must be at most 100 characters.');
        changes.description = requestedChanges.description;
      }
      if (Object.hasOwn(requestedChanges, 'tags')) {
        if (typeof requestedChanges.tags !== 'string' || !requestedChanges.tags.trim() || requestedChanges.tags.length > 200) throw new Error('Sticker tags must contain 1 to 200 characters.');
        changes.tags = requestedChanges.tags.trim();
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one sticker field to edit.');
      await guild.stickers.edit(target, { ...changes, reason: `Requested by Hellbot owner ${user.id} through AI server tools` });
      const verified = await guild.stickers.fetch(stickerId, { force: true });
      if (!verified) throw new Error('Sticker was edited, but Discord did not return it for verification.');
      return { success: true, sticker: serializeSticker(verified) };
    },

    delete_server_sticker: async ({ sticker_id: stickerId } = {}) => {
      ensureAccess();
      if (!isSnowflake(stickerId)) throw new Error('Provide a valid sticker ID.');
      await requireManageExpressions();
      const sticker = await guild.stickers.fetch(stickerId, { force: true });
      if (!sticker) throw new Error('Sticker not found in the configured server.');
      const removed = { id: sticker.id, name: sticker.name };
      await guild.stickers.delete(sticker, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedStickers = await guild.stickers.fetch();
      if (verifiedStickers.has(stickerId)) throw new Error('Sticker deletion was requested, but Discord still returned it.');
      return { success: true, deleted: true, sticker: removed };
    },
  };

  return { toolDefinitions: expressionTools, toolHandlers };
}

module.exports = { createServerExpressionsToolSet };
