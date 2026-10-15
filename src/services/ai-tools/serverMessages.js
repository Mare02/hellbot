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

function createServerMessageToolSet({ channel, user } = {}) {
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
      const verifiedMessage = await targetChannel.messages.fetch(sentMessage.id, { force: true });
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
      const verifiedMessage = await targetChannel.messages.fetch(messageId, { force: true });
      if (!verifiedMessage) throw new Error('Message was edited, but Discord did not return it for verification.');
      return { success: true, message: serializeMessage(verifiedMessage) };
    },
  };

  return { toolDefinitions: [getMessagesDefinition, sendMessageDefinition, editMessageDefinition], toolHandlers };
}

module.exports = { createServerMessageToolSet };
