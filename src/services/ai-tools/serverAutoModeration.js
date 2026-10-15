const {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { assertAuthorizedServer, canUseServerTools } = require('./serverToolsAccess');

const triggerTypes = {
  keyword: AutoModerationRuleTriggerType.Keyword,
  spam: AutoModerationRuleTriggerType.Spam,
  keyword_preset: AutoModerationRuleTriggerType.KeywordPreset,
  mention_spam: AutoModerationRuleTriggerType.MentionSpam,
};
const presetTypes = Object.fromEntries(
  Object.entries(AutoModerationRuleKeywordPresetType).filter(([key]) => Number.isNaN(Number(key)))
    .map(([key, value]) => [key.toLowerCase(), value])
);
const actionTypes = {
  block_message: AutoModerationActionType.BlockMessage,
  send_alert: AutoModerationActionType.SendAlertMessage,
  timeout: AutoModerationActionType.Timeout,
};

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_server_automod_rules',
      description: 'List AutoMod rules configured for the server. Requires Manage Server permission for the bot.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_server_automod_rule',
      description: 'Get one AutoMod rule by its exact rule ID.',
      parameters: {
        type: 'object',
        properties: { rule_id: { type: 'string', description: 'Exact AutoMod rule ID.' } },
        required: ['rule_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_server_automod_rule',
      description: 'Create a message-send AutoMod rule. Supported triggers: keyword, spam, keyword_preset, and mention_spam. Choose one or more actions. Only create rules explicitly requested by the owner.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          trigger_type: { type: 'string', enum: Object.keys(triggerTypes) },
          keywords: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 100 },
          presets: { type: 'array', items: { type: 'string', enum: Object.keys(presetTypes) }, uniqueItems: true, maxItems: 3 },
          allow_list: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 100 },
          mention_total_limit: { type: 'integer', minimum: 1, maximum: 50 },
          actions: { type: 'array', items: { type: 'string', enum: Object.keys(actionTypes) }, uniqueItems: true, minItems: 1, maxItems: 3 },
          alert_channel_id: { type: 'string', description: 'Text channel ID required when actions contains send_alert.' },
          timeout_seconds: { type: 'integer', minimum: 60, maximum: 2419200, description: 'Required when actions contains timeout; maximum 28 days.' },
          enabled: { type: 'boolean' },
          exempt_role_ids: { type: 'array', items: { type: 'string' }, maxItems: 20 },
          exempt_channel_ids: { type: 'array', items: { type: 'string' }, maxItems: 50 },
        },
        required: ['name', 'trigger_type', 'actions'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_server_automod_rule',
      description: 'Edit a server AutoMod rule by exact ID. Trigger type cannot be changed after creation. Use get_server_automod_rule first; only provide fields the owner requested, then verify.',
      parameters: {
        type: 'object',
        properties: {
          rule_id: { type: 'string' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          keywords: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 100 },
          presets: { type: 'array', items: { type: 'string', enum: Object.keys(presetTypes) }, uniqueItems: true, maxItems: 3 },
          allow_list: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 60 }, maxItems: 100 },
          mention_total_limit: { type: 'integer', minimum: 1, maximum: 50 },
          actions: { type: 'array', items: { type: 'string', enum: Object.keys(actionTypes) }, uniqueItems: true, minItems: 1, maxItems: 3 },
          alert_channel_id: { type: 'string' },
          timeout_seconds: { type: 'integer', minimum: 60, maximum: 2419200 },
          enabled: { type: 'boolean' },
          exempt_role_ids: { type: 'array', items: { type: 'string' }, maxItems: 20 },
          exempt_channel_ids: { type: 'array', items: { type: 'string' }, maxItems: 50 },
        },
        required: ['rule_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_server_automod_rule',
      description: 'Permanently delete an AutoMod rule by exact ID. Only delete when explicitly requested.',
      parameters: {
        type: 'object',
        properties: { rule_id: { type: 'string' } },
        required: ['rule_id'],
        additionalProperties: false,
      },
    },
  },
];

function isSnowflake(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

function serializeRule(rule) {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    eventType: AutoModerationRuleEventType[rule.eventType] || rule.eventType,
    triggerType: AutoModerationRuleTriggerType[rule.triggerType] || rule.triggerType,
    triggerMetadata: {
      keywords: rule.triggerMetadata?.keywordFilter || [],
      regexPatterns: rule.triggerMetadata?.regexPatterns || [],
      presets: (rule.triggerMetadata?.presets || []).map((preset) => AutoModerationRuleKeywordPresetType[preset] || preset),
      allowList: rule.triggerMetadata?.allowList || [],
      mentionTotalLimit: rule.triggerMetadata?.mentionTotalLimit ?? null,
    },
    actions: (rule.actions || []).map((action) => ({
      type: AutoModerationActionType[action.type] || action.type,
      channelId: action.metadata?.channelId || null,
      durationSeconds: action.metadata?.durationSeconds || null,
      customMessage: action.metadata?.customMessage || null,
    })),
    exemptRoleIds: rule.exemptRoles?.map((role) => role.id) || [],
    exemptChannelIds: rule.exemptChannels?.map((channel) => channel.id) || [],
  };
}

function createServerAutoModerationToolSet({ channel, user } = {}) {
  if (!canUseServerTools(channel, user)) return { toolDefinitions: [], toolHandlers: {} };
  const guild = channel.guild;
  const ensureAccess = () => assertAuthorizedServer(guild, user);

  async function requireManageGuild() {
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
      throw new Error('The bot needs Manage Server permission to manage AutoMod rules.');
    }
  }

  async function resolveExemptions(roleIds = [], channelIds = []) {
    if (!Array.isArray(roleIds) || roleIds.length > 20 || roleIds.some((id) => !isSnowflake(id))) {
      throw new Error('Provide up to 20 valid exempt role IDs.');
    }
    if (!Array.isArray(channelIds) || channelIds.length > 50 || channelIds.some((id) => !isSnowflake(id))) {
      throw new Error('Provide up to 50 valid exempt channel IDs.');
    }
    const [roles, channels] = await Promise.all([
      Promise.all(roleIds.map((id) => guild.roles.fetch(id))),
      Promise.all(channelIds.map((id) => guild.channels.fetch(id))),
    ]);
    if (roles.some((role) => !role)) throw new Error('An exempt role was not found in the configured server.');
    if (channels.some((target) => !target)) throw new Error('An exempt channel was not found in the configured server.');
    return { exemptRoles: roles, exemptChannels: channels };
  }

  async function buildTriggerMetadata(triggerType, input, previous = {}) {
    const metadata = {};
    const keywords = input.keywords ?? previous.keywordFilter;
    const presets = input.presets;
    const allowList = input.allow_list ?? previous.allowList ?? [];
    if (triggerType === AutoModerationRuleTriggerType.Keyword) {
      if (!Array.isArray(keywords) || keywords.length < 1 || keywords.length > 100
        || keywords.some((value) => typeof value !== 'string' || !value.trim() || value.length > 60)) {
        throw new Error('Keyword rules need 1 to 100 keywords, each 1 to 60 characters.');
      }
      metadata.keywordFilter = keywords.map((value) => value.trim());
      metadata.allowList = validateStringList(allowList, 'allow_list');
    } else if (triggerType === AutoModerationRuleTriggerType.KeywordPreset) {
      const resolvedPresets = presets ?? previous.presets?.map((preset) => AutoModerationRuleKeywordPresetType[preset]?.toLowerCase() || String(preset));
      if (!Array.isArray(resolvedPresets) || resolvedPresets.length < 1 || resolvedPresets.length > 3
        || resolvedPresets.some((preset) => !Object.hasOwn(presetTypes, preset))) {
        throw new Error(`keyword_preset rules need one or more presets: ${Object.keys(presetTypes).join(', ')}.`);
      }
      metadata.presets = resolvedPresets.map((preset) => presetTypes[preset]);
      metadata.allowList = validateStringList(allowList, 'allow_list');
    } else if (triggerType === AutoModerationRuleTriggerType.MentionSpam) {
      const mentionTotalLimit = input.mention_total_limit ?? previous.mentionTotalLimit;
      if (!Number.isInteger(mentionTotalLimit) || mentionTotalLimit < 1 || mentionTotalLimit > 50) {
        throw new Error('mention_spam rules need mention_total_limit from 1 to 50.');
      }
      metadata.mentionTotalLimit = mentionTotalLimit;
    } else if (triggerType === AutoModerationRuleTriggerType.Spam && (keywords || presets || input.mention_total_limit !== undefined || input.allow_list !== undefined)) {
      throw new Error('The spam trigger does not accept keywords, presets, mention limits, or allow lists.');
    }
    return metadata;
  }

  function validateStringList(values, label) {
    if (!Array.isArray(values) || values.length > 100 || values.some((value) => typeof value !== 'string' || !value.trim() || value.length > 60)) {
      throw new Error(`${label} must contain up to 100 non-empty strings, each at most 60 characters.`);
    }
    return values.map((value) => value.trim());
  }

  async function buildActions(input, previousActions = []) {
    const actionNames = input.actions ?? previousActions.map((action) => {
      const name = AutoModerationActionType[action.type];
      return name === 'BlockMessage' ? 'block_message' : name === 'SendAlertMessage' ? 'send_alert' : name === 'Timeout' ? 'timeout' : null;
    }).filter(Boolean);
    if (!Array.isArray(actionNames) || actionNames.length < 1 || actionNames.length > 3
      || actionNames.some((name) => !Object.hasOwn(actionTypes, name))
      || new Set(actionNames).size !== actionNames.length) {
      throw new Error(`actions must contain one or more unique values: ${Object.keys(actionTypes).join(', ')}.`);
    }
    const alertAction = actionNames.includes('send_alert');
    const timeoutAction = actionNames.includes('timeout');
    const alertChannelId = input.alert_channel_id ?? previousActions.find((action) => action.type === AutoModerationActionType.SendAlertMessage)?.metadata?.channelId;
    const timeoutSeconds = input.timeout_seconds ?? previousActions.find((action) => action.type === AutoModerationActionType.Timeout)?.metadata?.durationSeconds;
    let alertChannel = null;
    if (alertAction) {
      if (!isSnowflake(alertChannelId)) throw new Error('send_alert requires a valid alert_channel_id.');
      alertChannel = await guild.channels.fetch(alertChannelId);
      if (!alertChannel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(alertChannel.type)) {
        throw new Error('alert_channel_id must be a text or announcement channel in the configured server.');
      }
    } else if (input.alert_channel_id !== undefined) {
      throw new Error('alert_channel_id can only be provided when actions includes send_alert.');
    }
    if (timeoutAction && (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 60 || timeoutSeconds > 2419200)) {
      throw new Error('timeout requires timeout_seconds from 60 to 2419200.');
    }
    if (!timeoutAction && input.timeout_seconds !== undefined) throw new Error('timeout_seconds can only be provided when actions includes timeout.');
    return actionNames.map((name) => ({
      type: actionTypes[name],
      ...(name === 'send_alert' ? { metadata: { channel: alertChannel } } : {}),
      ...(name === 'timeout' ? { metadata: { durationSeconds: timeoutSeconds } } : {}),
    }));
  }

  async function resolveRuleTarget(ruleId) {
    if (!isSnowflake(ruleId)) throw new Error('Provide a valid AutoMod rule ID.');
    const rule = await guild.autoModerationRules.fetch({ autoModerationRule: ruleId, force: true });
    if (!rule) throw new Error('AutoMod rule not found in the configured server.');
    return rule;
  }

  const toolHandlers = {
    get_server_automod_rules: async () => {
      ensureAccess();
      await requireManageGuild();
      const rules = await guild.autoModerationRules.fetch();
      return { success: true, count: rules.size, rules: [...rules.values()].map(serializeRule) };
    },

    get_server_automod_rule: async ({ rule_id: ruleId } = {}) => {
      ensureAccess();
      await requireManageGuild();
      const rule = await resolveRuleTarget(ruleId);
      return { success: true, rule: serializeRule(rule) };
    },

    create_server_automod_rule: async ({ name, trigger_type: triggerTypeName, actions: actionNames, enabled = true, exempt_role_ids: roleIds = [], exempt_channel_ids: channelIds = [], ...triggerInput } = {}) => {
      ensureAccess();
      await requireManageGuild();
      if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Rule name must contain 1 to 100 characters.');
      if (typeof enabled !== 'boolean') throw new Error('enabled must be true or false.');
      if (!Object.hasOwn(triggerTypes, triggerTypeName)) throw new Error(`trigger_type must be one of: ${Object.keys(triggerTypes).join(', ')}.`);
      const triggerType = triggerTypes[triggerTypeName];
      const [triggerMetadata, actions, exemptions] = await Promise.all([
        buildTriggerMetadata(triggerType, triggerInput),
        buildActions({ ...triggerInput, actions: actionNames }),
        resolveExemptions(roleIds, channelIds),
      ]);
      const created = await guild.autoModerationRules.create({
        name: name.trim(),
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType,
        triggerMetadata,
        actions,
        enabled,
        ...exemptions,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verified = await guild.autoModerationRules.fetch({ autoModerationRule: created.id, force: true });
      if (!verified) throw new Error('AutoMod rule was created, but Discord did not return it for verification.');
      return { success: true, rule: serializeRule(verified) };
    },

    edit_server_automod_rule: async ({ rule_id: ruleId, ...requestedChanges } = {}) => {
      ensureAccess();
      await requireManageGuild();
      const target = await resolveRuleTarget(ruleId);
      const changes = {};
      if (Object.hasOwn(requestedChanges, 'name')) {
        if (typeof requestedChanges.name !== 'string' || !requestedChanges.name.trim() || requestedChanges.name.length > 100) throw new Error('Rule name must contain 1 to 100 characters.');
        changes.name = requestedChanges.name.trim();
      }
      if (Object.hasOwn(requestedChanges, 'enabled')) {
        if (typeof requestedChanges.enabled !== 'boolean') throw new Error('enabled must be true or false.');
        changes.enabled = requestedChanges.enabled;
      }
      const metadataWasChanged = ['keywords', 'presets', 'allow_list', 'mention_total_limit'].some((key) => Object.hasOwn(requestedChanges, key));
      if (metadataWasChanged) {
        changes.triggerMetadata = await buildTriggerMetadata(target.triggerType, requestedChanges, target.triggerMetadata);
      }
      if (Object.hasOwn(requestedChanges, 'actions') || Object.hasOwn(requestedChanges, 'alert_channel_id') || Object.hasOwn(requestedChanges, 'timeout_seconds')) {
        changes.actions = await buildActions(requestedChanges, target.actions);
      }
      if (Object.hasOwn(requestedChanges, 'exempt_role_ids') || Object.hasOwn(requestedChanges, 'exempt_channel_ids')) {
        const exemptions = await resolveExemptions(
          requestedChanges.exempt_role_ids ?? target.exemptRoles.map((role) => role.id),
          requestedChanges.exempt_channel_ids ?? target.exemptChannels.map((targetChannel) => targetChannel.id)
        );
        Object.assign(changes, exemptions);
      }
      if (Object.keys(changes).length === 0) throw new Error('Provide at least one AutoMod field to edit.');
      const edited = await guild.autoModerationRules.edit(target, {
        ...changes,
        reason: `Requested by Hellbot owner ${user.id} through AI server tools`,
      });
      const verified = await guild.autoModerationRules.fetch({ autoModerationRule: target.id, force: true });
      if (!verified || verified.name !== edited.name) throw new Error('AutoMod rule was edited, but Discord did not return the updated rule.');
      return { success: true, rule: serializeRule(verified) };
    },

    delete_server_automod_rule: async ({ rule_id: ruleId } = {}) => {
      ensureAccess();
      await requireManageGuild();
      const target = await resolveRuleTarget(ruleId);
      const removed = serializeRule(target);
      await guild.autoModerationRules.delete(target, `Requested by Hellbot owner ${user.id} through AI server tools`);
      const verifiedRules = await guild.autoModerationRules.fetch();
      if (verifiedRules.has(target.id)) throw new Error('AutoMod rule deletion was requested, but Discord still returned the rule.');
      return { success: true, deleted: true, rule: removed };
    },
  };

  return { toolDefinitions, toolHandlers };
}

module.exports = { createServerAutoModerationToolSet };
