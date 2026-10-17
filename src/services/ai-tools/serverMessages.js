const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const getMessagesDefinition = {
  type: 'function',
  function: {
    name: 'get_server_channel_messages',
    description: 'Fetch recent messages from a text or announcement channel in the configured Hellbot server. Use this to find a bot-authored message before editing it.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID from get_server_channels.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum recent messages to fetch. Defaults to 20.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const sendMessageDefinition = {
  type: 'function',
  function: {
    name: 'send_server_channel_message',
    description: 'Send a text message to a text or announcement channel in the configured Hellbot server. Only post content explicitly requested by the user. Mentions are sent without ping notifications.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID from get_server_channels.' },
        content: { type: 'string', minLength: 1, maxLength: 2000, description: 'Message text to post.' },
      },
      required: ['channel_id', 'content'],
      additionalProperties: false,
    },
  },
};

const editMessageDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_channel_message',
    description: 'Edit the text of one message authored by Hellbot in a text or announcement channel. Use get_server_channel_messages to find its exact message ID. Only make changes explicitly requested by the user.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact Discord channel ID.' },
        message_id: { type: 'string', description: 'The exact ID of a message authored by this bot.' },
        content: { type: 'string', minLength: 1, maxLength: 2000, description: 'Replacement message text.' },
      },
      required: ['channel_id', 'message_id', 'content'],
      additionalProperties: false,
    },
  },
};

const pinnedMessagesDefinition = {
  type: 'function',
  function: {
    name: 'get_server_channel_pins',
    description: 'List pinned messages in a text or announcement channel in the configured Hellbot server.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact channel ID from get_server_channels.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

const pinMessageDefinition = {
  type: 'function',
  function: {
    name: 'pin_server_channel_message',
    description: 'Pin one message in a text or announcement channel. Only pin when explicitly requested. Find the exact message ID with get_server_channel_messages first.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact channel ID.' },
        message_id: { type: 'string', description: 'The exact message ID to pin.' },
      },
      required: ['channel_id', 'message_id'],
      additionalProperties: false,
    },
  },
};

const unpinMessageDefinition = {
  type: 'function',
  function: {
    name: 'unpin_server_channel_message',
    description: 'Remove one message from a channel’s pins. Find the exact message ID with get_server_channel_messages or get_server_channel_pins first.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact channel ID.' },
        message_id: { type: 'string', description: 'The exact message ID to unpin.' },
      },
      required: ['channel_id', 'message_id'],
      additionalProperties: false,
    },
  },
};

const deleteMessageDefinition = {
  type: 'function',
  function: {
    name: 'delete_server_channel_message',
    description: 'Permanently delete either one specific message by message_id or the most recent count messages in a text or announcement channel, regardless of author. Deleting recent messages requires Manage Messages permission. This cannot be undone. Only delete when the owner explicitly requests it.',
    parameters: {
      type: 'object',
      properties: {
        channel_id: { type: 'string', description: 'The exact channel ID.' },
        message_id: { type: 'string', description: 'The exact message ID to delete. Provide this or count, not both.' },
        count: { type: 'integer', minimum: 1, maximum: 50, description: 'Delete this many most recent messages in the channel, regardless of author. If the owner does not specify a number, use 5. Provide this or message_id, not both.' },
      },
      required: ['channel_id'],
      additionalProperties: false,
    },
  },
};

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function isSupportedTextChannel(channel) {
  return channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement;
}

function serializeMessage(message) {
  return {
    id: message.id,
    channelId: message.channelId,
    authorId: message.author.id,
    authorName: message.author.username,
    authorIsBot: message.author.bot,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt?.toISOString() || null,
  };
}

function createServerMessageToolSet({ channel, user, toolTraceMessageIds = new Set() } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  async function fetchTargetChannel(channelId) {
    if (!isSnowflake(channelId)) throw new Error('Provide a valid Discord channel ID.');
    const targetChannel = await guild.channels.fetch(channelId);
    if (!targetChannel || !isSupportedTextChannel(targetChannel)) {
      throw new Error('Channel must be a text or announcement channel in the configured Hellbot server.');
    }
    return targetChannel;
  }

  async function requireBotChannelPermissions(targetChannel, permissions) {
    const botMember = guild.members.me || await guild.members.fetchMe();
    const currentPermissions = targetChannel.permissionsFor(botMember);
    if (!currentPermissions?.has(PermissionFlagsBits.ViewChannel)) {
      throw new Error('The bot needs View Channel permission in this channel.');
    }
    for (const permission of permissions) {
      if (!currentPermissions.has(permission)) {
        const label = permission === PermissionFlagsBits.SendMessages ? 'Send Messages' : 'Read Message History';
        throw new Error(`The bot needs ${label} permission in this channel.`);
      }
    }
    return botMember;
  }

  async function fetchChannelPins(targetChannel, messageId) {
    const messages = new Map();
    let before;

    while (true) {
      const page = await targetChannel.messages.fetchPins({ limit: 50, ...(before ? { before } : {}) });
      for (const pin of page.items) {
        messages.set(pin.message.id, pin.message);
      }
      if ((messageId && messages.has(messageId)) || !page.hasMore) return messages;

      const nextBefore = page.items[page.items.length - 1]?.pinnedTimestamp;
      if (!Number.isFinite(nextBefore) || (before !== undefined && nextBefore >= before)) {
        throw new Error('Discord did not return a valid cursor for the remaining pinned messages.');
      }
      before = nextBefore;
    }
  }

  const toolHandlers = {
    get_server_channel_messages: async ({ channel_id: channelId, limit = 20 } = {}) => {
      ensureAccess();
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Limit must be from 1 to 50.');
      const targetChannel = await fetchTargetChannel(channelId);
      await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);
      const messages = await targetChannel.messages.fetch({ limit });
      return {
        success: true,
        channelId: targetChannel.id,
        count: messages.size,
        messages: [...messages.values()].map(serializeMessage),
      };
    },

    send_server_channel_message: async ({ channel_id: channelId, content } = {}) => {
      ensureAccess();
      if (typeof content !== 'string' || !content.trim() || content.length > 2000) {
        throw new Error('Message content must contain 1 to 2000 characters.');
      }
      const targetChannel = await fetchTargetChannel(channelId);
      await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.SendMessages]);
      const sentMessage = await targetChannel.send({
        content,
        allowedMentions: { parse: [], repliedUser: false },
      });
      const verifiedMessage = await targetChannel.messages.fetch({ message: sentMessage.id, force: true });
      if (!verifiedMessage) throw new Error('Message was sent, but Discord did not return it for verification.');
      return { success: true, message: serializeMessage(verifiedMessage) };
    },

    edit_server_channel_message: async ({ channel_id: channelId, message_id: messageId, content } = {}) => {
      ensureAccess();
      if (!isSnowflake(messageId)) throw new Error('Provide a valid Discord message ID.');
      if (typeof content !== 'string' || !content.trim() || content.length > 2000) {
        throw new Error('Message content must contain 1 to 2000 characters.');
      }
      const targetChannel = await fetchTargetChannel(channelId);
      const botMember = await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);
      const targetMessage = await targetChannel.messages.fetch(messageId);
      if (!targetMessage) throw new Error('Message not found in the selected channel.');
      if (targetMessage.author.id !== botMember.id) throw new Error('The bot can edit only its own messages.');
      await targetMessage.edit({
        content,
        allowedMentions: { parse: [], repliedUser: false },
      });
      const verifiedMessage = await targetChannel.messages.fetch({ message: messageId, force: true });
      if (!verifiedMessage) throw new Error('Message was edited, but Discord did not return it for verification.');
      return { success: true, message: serializeMessage(verifiedMessage) };
    },

    get_server_channel_pins: async ({ channel_id: channelId } = {}) => {
      ensureAccess();
      const targetChannel = await fetchTargetChannel(channelId);
      await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);
      const pins = await fetchChannelPins(targetChannel);
      return {
        success: true,
        channelId: targetChannel.id,
        count: pins.size,
        messages: [...pins.values()].map(serializeMessage),
      };
    },

    pin_server_channel_message: async ({ channel_id: channelId, message_id: messageId } = {}) => {
      ensureAccess();
      if (!isSnowflake(messageId)) throw new Error('Provide a valid Discord message ID.');
      const targetChannel = await fetchTargetChannel(channelId);
      const botMember = await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);
      const targetMessage = await targetChannel.messages.fetch(messageId);
      if (!targetMessage) throw new Error('Message not found in the selected channel.');
      if (!targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.PinMessages)) {
        throw new Error('The bot needs Pin Messages permission to pin messages.');
      }
      await targetMessage.pin(`Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedPins = await fetchChannelPins(targetChannel, messageId);
      if (!verifiedPins.has(messageId)) throw new Error('Message was pinned, but Discord did not return it in the pinned messages.');
      return { success: true, message: serializeMessage(verifiedPins.get(messageId)) };
    },

    unpin_server_channel_message: async ({ channel_id: channelId, message_id: messageId } = {}) => {
      ensureAccess();
      if (!isSnowflake(messageId)) throw new Error('Provide a valid Discord message ID.');
      const targetChannel = await fetchTargetChannel(channelId);
      const botMember = await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);
      const targetMessage = await targetChannel.messages.fetch(messageId);
      if (!targetMessage) throw new Error('Message not found in the selected channel.');
      if (!targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.PinMessages)) {
        throw new Error('The bot needs Pin Messages permission to unpin messages.');
      }
      await targetMessage.unpin(`Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedPins = await fetchChannelPins(targetChannel, messageId);
      if (verifiedPins.has(messageId)) throw new Error('Message was unpinned, but Discord still returned it in the pinned messages.');
      return { success: true, unpinned: true, messageId, channelId: targetChannel.id };
    },

    delete_server_channel_message: async ({ channel_id: channelId, message_id: messageId, count } = {}) => {
      ensureAccess();
      if ((messageId === undefined) === (count === undefined)) {
        throw new Error('Provide either message_id for one message or count for the most recent messages, but not both.');
      }
      const targetChannel = await fetchTargetChannel(channelId);
      const botMember = await requireBotChannelPermissions(targetChannel, [PermissionFlagsBits.ReadMessageHistory]);

      if (count !== undefined) {
        if (!Number.isInteger(count) || count < 1 || count > 50) {
          throw new Error('Count must be from 1 to 50.');
        }
        if (!targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages)) {
          throw new Error('The bot needs Manage Messages permission to delete recent messages regardless of author.');
        }

        const messagesToDelete = [];
        let before;
        let scannedCount = 0;
        const scanLimit = 1000;

        while (messagesToDelete.length < count && scannedCount < scanLimit) {
          const page = await targetChannel.messages.fetch({
            limit: Math.min(100, scanLimit - scannedCount),
            ...(before ? { before } : {}),
          });
          if (page.size === 0) break;

          const orderedMessages = [...page.values()].sort((left, right) => right.createdTimestamp - left.createdTimestamp);
          const eligibleMessages = orderedMessages.filter((message) => !toolTraceMessageIds.has(message.id));
          messagesToDelete.push(...eligibleMessages.slice(0, count - messagesToDelete.length));
          scannedCount += page.size;
          before = orderedMessages[orderedMessages.length - 1].id;
        }

        for (const message of messagesToDelete) {
          await message.delete();
        }

        return {
          success: true,
          channelId: targetChannel.id,
          requestedCount: count,
          deletedCount: messagesToDelete.length,
          deletedMessageIds: messagesToDelete.map((message) => message.id),
          scanLimitReached: scannedCount >= scanLimit && messagesToDelete.length < count,
        };
      }

      if (!isSnowflake(messageId)) throw new Error('Provide a valid Discord message ID.');
      const targetMessage = await targetChannel.messages.fetch(messageId);
      if (!targetMessage) throw new Error('Message not found in the selected channel.');
      const canDeleteOwn = targetMessage.author.id === botMember.id;
      if (!canDeleteOwn && !targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageMessages)) {
        throw new Error('The bot needs Manage Messages permission to delete another user’s message.');
      }
      await targetMessage.delete();
      const verifiedMessage = await targetChannel.messages.fetch({ message: messageId, force: true }).catch((error) => {
        if (error.code === 10008) return null;
        throw error;
      });
      if (verifiedMessage) throw new Error('Message deletion was requested, but Discord still returned the message.');
      return { success: true, deleted: true, channelId: targetChannel.id, messageId };
    },
  };

  return {
    toolDefinitions: [
      getMessagesDefinition,
      sendMessageDefinition,
      editMessageDefinition,
      pinnedMessagesDefinition,
      pinMessageDefinition,
      unpinMessageDefinition,
      deleteMessageDefinition,
    ],
    toolHandlers,
  };
}

module.exports = { createServerMessageToolSet };
