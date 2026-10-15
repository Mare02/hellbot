const {
  ChannelType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildVerificationLevel,
  Locale,
  PermissionFlagsBits,
} = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const verificationLevels = [0, 1, 2, 3, 4];
const notificationLevels = [0, 1];
const contentFilterLevels = [0, 1, 2];
const afkTimeouts = [60, 300, 900, 1800, 3600];
const locales = [...new Set(Object.values(Locale))];

const getGuildDefinition = {
  type: 'function',
  function: {
    name: 'get_server_info',
    description: 'Get the current basic settings for the configured Hellbot server. Use after editing to verify saved values.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
};

const imageUrlDescription = 'HTTPS image URL from cdn.discordapp.com or media.discordapp.net. Use "clear" to remove the current image.';

const editGuildDefinition = {
  type: 'function',
  function: {
    name: 'edit_server_info',
    description: 'Edit basic settings for the configured Hellbot server. Only change settings explicitly requested by the user. Supports name, description, icon, banner, preferred locale, verification level, default message notifications, explicit content filter, AFK timeout and channel, system channel, rules channel, and public updates channel. Use an empty channel ID to clear an optional channel. After editing, call get_server_info to verify.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100, description: 'New server name.' },
        description: { type: 'string', maxLength: 120, description: 'New server description. Use an empty string to clear it.' },
        preferred_locale: { type: 'string', enum: locales, description: 'Server preferred locale code.' },
        verification_level: { type: 'integer', enum: verificationLevels, description: 'Verification level: 0 none, 1 low, 2 medium, 3 high, 4 very high.' },
        default_message_notifications: { type: 'integer', enum: notificationLevels, description: 'Default notifications: 0 all messages, 1 only mentions.' },
        explicit_content_filter: { type: 'integer', enum: contentFilterLevels, description: 'Explicit content filter: 0 disabled, 1 members without roles, 2 all members.' },
        afk_timeout: { type: 'integer', enum: afkTimeouts, description: 'AFK timeout in seconds: 60, 300, 900, 1800, or 3600.' },
        icon_url: { type: 'string', maxLength: 2048, description: imageUrlDescription },
        banner_url: { type: 'string', maxLength: 2048, description: imageUrlDescription },
        afk_channel_id: { type: 'string', maxLength: 20, description: 'Voice channel ID for AFK moves, or an empty string to clear.' },
        system_channel_id: { type: 'string', maxLength: 20, description: 'Text or announcement channel ID for system messages, or an empty string to clear.' },
        rules_channel_id: { type: 'string', maxLength: 20, description: 'Text or announcement channel ID for server rules, or an empty string to clear.' },
        public_updates_channel_id: { type: 'string', maxLength: 20, description: 'Text or announcement channel ID for public updates, or an empty string to clear.' },
      },
      additionalProperties: false,
    },
  },
};

function serializeGuild(guild) {
  return {
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    iconUrl: guild.iconURL({ size: 1024 }),
    bannerUrl: guild.bannerURL({ size: 2048 }),
    description: guild.description || null,
    preferredLocale: guild.preferredLocale,
    verificationLevel: GuildVerificationLevel[guild.verificationLevel] || guild.verificationLevel,
    defaultMessageNotifications: GuildDefaultMessageNotifications[guild.defaultMessageNotifications]
      || guild.defaultMessageNotifications,
    explicitContentFilter: GuildExplicitContentFilter[guild.explicitContentFilter] || guild.explicitContentFilter,
    afkTimeout: guild.afkTimeout,
    afkChannelId: guild.afkChannelId,
    systemChannelId: guild.systemChannelId,
    rulesChannelId: guild.rulesChannelId,
    publicUpdatesChannelId: guild.publicUpdatesChannelId,
    premiumProgressBarEnabled: guild.premiumProgressBarEnabled,
    features: guild.features,
  };
}

async function downloadGuildImage(url, fieldName) {
  if (url === 'clear') return null;
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${fieldName} must be a valid HTTPS image URL.`);
  }
  if (parsedUrl.protocol !== 'https:' || !['cdn.discordapp.com', 'media.discordapp.net'].includes(parsedUrl.hostname)) {
    throw new Error(`${fieldName} must use cdn.discordapp.com or media.discordapp.net over HTTPS.`);
  }

  const response = await fetch(parsedUrl, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Discord image download failed for ${fieldName}.`);
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(contentType)) {
    throw new Error(`${fieldName} URL must return a PNG, JPEG, GIF, or WebP image.`);
  }
  const maxImageBytes = 8 * 1024 * 1024;
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxImageBytes) {
    throw new Error(`${fieldName} image must be 8 MB or smaller.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`${fieldName} image response was empty.`);
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > maxImageBytes) {
      await reader.cancel();
      throw new Error(`${fieldName} image must be 8 MB or smaller.`);
    }
    chunks.push(Buffer.from(value));
  }
  const image = Buffer.concat(chunks, totalBytes);
  if (image.length === 0) {
    throw new Error(`${fieldName} image must be between 1 byte and 8 MB.`);
  }
  return image;
}

function createServerGuildToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };

  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  const toolHandlers = {
    get_server_info: async () => {
      ensureAccess();
      const currentGuild = await guild.fetch(true);
      return { success: true, server: serializeGuild(currentGuild) };
    },

    edit_server_info: async (requestedChanges = {}) => {
      ensureAccess();
      const changes = {};

      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || requestedChanges.name.trim().length < 2 || requestedChanges.name.length > 100) {
          throw new Error('Server name must contain 2 to 100 characters.');
        }
        changes.name = requestedChanges.name.trim();
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'description')) {
        if (typeof requestedChanges.description !== 'string' || requestedChanges.description.length > 120) {
          throw new Error('Server description must be a string of at most 120 characters.');
        }
        changes.description = requestedChanges.description || null;
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'preferred_locale')) {
        if (!locales.includes(requestedChanges.preferred_locale)) throw new Error('Choose a supported Discord locale code.');
        changes.preferredLocale = requestedChanges.preferred_locale;
      }
      const enumFields = [
        ['verification_level', 'verificationLevel', GuildVerificationLevel],
        ['default_message_notifications', 'defaultMessageNotifications', GuildDefaultMessageNotifications],
        ['explicit_content_filter', 'explicitContentFilter', GuildExplicitContentFilter],
      ];
      for (const [inputName, optionName, values] of enumFields) {
        if (Object.prototype.hasOwnProperty.call(requestedChanges, inputName)) {
          const value = requestedChanges[inputName];
          if (!Number.isInteger(value) || typeof values[value] !== 'string') {
            throw new Error(`Invalid value for ${inputName}.`);
          }
          changes[optionName] = value;
        }
      }
      if (Object.prototype.hasOwnProperty.call(requestedChanges, 'afk_timeout')) {
        if (!afkTimeouts.includes(requestedChanges.afk_timeout)) {
          throw new Error('AFK timeout must be 60, 300, 900, 1800, or 3600 seconds.');
        }
        changes.afkTimeout = requestedChanges.afk_timeout;
      }
      const channelSettings = [
        ['afk_channel_id', 'afkChannel', 'voice'],
        ['system_channel_id', 'systemChannel', 'text'],
        ['rules_channel_id', 'rulesChannel', 'text'],
        ['public_updates_channel_id', 'publicUpdatesChannel', 'text'],
      ];
      for (const [inputName, optionName, expectedType] of channelSettings) {
        if (!Object.prototype.hasOwnProperty.call(requestedChanges, inputName)) continue;
        const channelId = requestedChanges[inputName];
        if (channelId === '') {
          changes[optionName] = null;
          continue;
        }
        if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) {
          throw new Error(`${inputName} must be a valid channel ID or an empty string to clear it.`);
        }
        const targetChannel = await guild.channels.fetch(channelId);
        const validType = targetChannel && (expectedType === 'voice'
          ? targetChannel.type === ChannelType.GuildVoice
          : targetChannel.type === ChannelType.GuildText || targetChannel.type === ChannelType.GuildAnnouncement);
        if (!validType) throw new Error(`${inputName} must reference a compatible channel in the configured server.`);
        changes[optionName] = targetChannel;
      }
      for (const [inputName, optionName] of [['icon_url', 'icon'], ['banner_url', 'banner']]) {
        if (!Object.prototype.hasOwnProperty.call(requestedChanges, inputName)) continue;
        if (typeof requestedChanges[inputName] !== 'string' || requestedChanges[inputName].length > 2048) {
          throw new Error(`${inputName} must be an image URL or "clear".`);
        }
        changes[optionName] = await downloadGuildImage(requestedChanges[inputName], inputName);
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one server setting to edit.');

      const botMember = guild.members.me || await guild.members.fetchMe();
      if (!botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
        throw new Error('The bot needs Manage Server permission to edit server settings.');
      }

      await guild.edit({
        ...changes,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verifiedGuild = await guild.fetch(true);
      return { success: true, server: serializeGuild(verifiedGuild) };
    },
  };

  return { toolDefinitions: [getGuildDefinition, editGuildDefinition], toolHandlers };
}

module.exports = { createServerGuildToolSet };
