const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../utils/config');

const REQUEST_PREFIX = 'role_request';
const PROCESSING_REQUESTS = new Set();
const SUBMITTING_REQUESTS = new Set();
const HEX_COLOR_PATTERN = /^#?([\da-f]{6})$/i;
const INSTRUCTIONS_TITLE = 'Request a role';
const targetServerId = config.isDevMode ? config.testingServerId : config.homeServerId;

const fetchTextChannel = async (guild, channelId) => {
  if (!guild || !channelId) return null;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel?.isTextBased() ? channel : null;
};

const getRequestFields = message => {
  const lines = message.content?.split('\n') || [];
  const [title] = lines;
  const getField = name => {
    const plainPrefix = `${name}: `;
    const boldPrefix = `**${name}:** `;
    const italicPrefix = `*${name}:* `;
    const line = lines.find(value => value.startsWith(plainPrefix) ||
      value.startsWith(boldPrefix) || value.startsWith(italicPrefix));
    if (!line) return null;
    const prefix = line.startsWith(boldPrefix)
      ? boldPrefix
      : line.startsWith(italicPrefix)
        ? italicPrefix
        : plainPrefix;
    return line.slice(prefix.length);
  };
  const requesterText = getField('Requester');
  const requesterId = requesterText?.match(/^<@(\d{17,20})>$/)?.[1] ||
    getField('Requester ID') || requesterText?.match(/\((\d{17,20})\)$/)?.[1];
  const roleName = getField('Role name');
  const color = getField('Color');

  if ((title === 'Role request' || title === '**Role request**') &&
    /^\d{17,20}$/.test(requesterId || '') && roleName &&
    HEX_COLOR_PATTERN.test(color || '')) {
    return { requesterId, roleName, color };
  }

  const embed = message.embeds[0];
  if (!embed) return null;

  const fields = Object.fromEntries(
    embed.fields.map(field => [field.name, field.value])
  );
  const embedRequesterId = fields['Requester ID'] || fields.Requester?.match(/\((\d{17,20})\)$/)?.[1];
  const embedRoleName = fields['Role name'];
  const embedColor = fields.Color;
  if (!/^\d{17,20}$/.test(embedRequesterId || '') ||
    !embedRoleName || !HEX_COLOR_PATTERN.test(embedColor || '')) {
    return null;
  }

  return { requesterId: embedRequesterId, roleName: embedRoleName, color: embedColor };
};

const getRequestStatus = message => message.content?.match(/^Status: (.+)$/m)?.[1] ||
  message.embeds?.[0]?.footer?.text?.match(/^Status: (.+)$/)?.[1] || null;

const isResolved = message => Boolean(getRequestStatus(message));

const isFinalizedRequest = message => /^(Approved|Denied)\b/i.test(getRequestStatus(message) || '');

const hasPendingRequest = async (reviewChannel, requesterId, botId) => {
  let before;

  while (true) {
    const messages = await reviewChannel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    for (const message of messages.values()) {
      if (message.author.id !== botId || isFinalizedRequest(message)) continue;

      const requesterMention = `<@${requesterId}>`;
      if (!message.content?.includes(requesterMention) &&
        !message.embeds?.some(embed => embed.fields.some(field => field.value.includes(requesterId)))) {
        continue;
      }

      if (getRequestFields(message)?.requesterId === requesterId) return true;
    }

    if (messages.size < 100) return false;
    before = messages.reduce((oldest, message) =>
      BigInt(message.id) < BigInt(oldest.id) ? message : oldest
    ).id;
  }
};

const updateRequestStatus = async (message, status, allowedUserIds) => {
  const originalContent = message.content.split('\nStatus: ')[0];
  const content = `${originalContent ? `${originalContent}\n` : ''}Status: ${status}`;
  const rows = message.components.map(row => ActionRowBuilder.from(row).setComponents(
    row.components.map(component => ButtonBuilder.from(component).setDisabled(true))
  ));

  await message.edit({
    content,
    components: rows,
    allowedMentions: { users: allowedUserIds, parse: [] },
  });
};

const restoreRequestForRetry = async message => {
  const embed = message.embeds[0]?.toJSON();
  if (embed) delete embed.footer;
  const rows = message.components.map(row => ActionRowBuilder.from(row).setComponents(
    row.components.map(component => ButtonBuilder.from(component).setDisabled(false))
  ));

  await message.edit({
    content: message.content.split('\nStatus: ')[0],
    ...(embed ? { embeds: [embed] } : {}),
    components: rows,
  });
};

const sendOutcome = async (guild, request, content, shouldMention = false) => {
  const requestChannel = await fetchTextChannel(guild, config.roleRequests.requestChannelId);
  if (!requestChannel) throw new Error('The role-request channel is unavailable.');

  await requestChannel.send({
    content: `${shouldMention ? `<@${request.requesterId}> ` : ''}${content}`,
    allowedMentions: shouldMention
      ? { users: [request.requesterId], parse: [] }
      : { parse: [] },
  });
};

const replyToRequestContext = async (context, isSlashCommand, content) => {
  if (!isSlashCommand) {
    await context.reply(content);
    return;
  }

  if (context.deferred) await context.editReply({ content });
  else if (context.replied) await context.followUp({ content, ephemeral: true });
  else await context.reply({ content, ephemeral: true });
};

const requestRole = async (context, args = []) => {
  const isSlashCommand = typeof context.isChatInputCommand === 'function' && context.isChatInputCommand();
  const prefixCommand = `${config.commandsPrefix}request-role`;
  const usage = `Usage: /request-role name:<role name> color:<hex color> or ${prefixCommand} "role name" <hex color>. Example: ${prefixCommand} "Role name" #66CC99.`;
  let requestPosted = false;
  let submittingRequesterId = null;

  try {
    if (isSlashCommand) await context.deferReply({ ephemeral: true });

    const guild = context.guild;
    const guildId = isSlashCommand ? context.guildId : guild?.id;
    if (!guild || guildId !== targetServerId) {
      await replyToRequestContext(context, isSlashCommand, 'Role requests are only available in the configured server.');
      return;
    }

    const requestChannel = await fetchTextChannel(guild, config.roleRequests.requestChannelId);
    const channelId = isSlashCommand ? context.channelId : context.channel?.id;
    if (!requestChannel) {
      await replyToRequestContext(context, isSlashCommand, 'Role requests are temporarily unavailable. Please contact the staff team.');
      return;
    }
    if (channelId !== requestChannel.id) {
      await replyToRequestContext(
        context,
        isSlashCommand,
        `Please use /request-role or ${prefixCommand} in <#${requestChannel.id}>.`
      );
      return;
    }

    const prefixArgs = Array.isArray(args) ? args.filter(argument => argument.length > 0) : [];
    const prefixRoleName = prefixArgs.slice(0, -1).join(' ').trim();
    const roleName = isSlashCommand
      ? context.options?.getString?.('name')?.trim() || ''
      : prefixRoleName.replace(/^"([\s\S]*)"$/, '$1').trim();
    const requestedColor = isSlashCommand
      ? context.options?.getString?.('color')?.trim() || ''
      : prefixArgs[prefixArgs.length - 1]?.trim() || '';

    if (!roleName || !requestedColor) {
      await replyToRequestContext(context, isSlashCommand, `A role name and color are required. ${usage}`);
      return;
    }

    const colorMatch = requestedColor.match(HEX_COLOR_PATTERN);

    if (roleName.length < 1 || roleName.length > 100 || /^@everyone$/i.test(roleName)) {
      await replyToRequestContext(context, isSlashCommand, 'Role names must be 1–100 characters and cannot be @everyone.');
      return;
    }
    if (/[\r\n]/.test(roleName)) {
      await replyToRequestContext(context, isSlashCommand, 'Role names must fit on a single line.');
      return;
    }
    if (!colorMatch) {
      await replyToRequestContext(context, isSlashCommand, 'Enter a valid six-digit hex color, such as #FF8800.');
      return;
    }

    const anchorRole = config.isDevMode ? null : guild.roles.cache.find(
      role => role.name === config.roleRequests.anchorRoleName
    );
    const reviewChannel = await fetchTextChannel(guild, config.roleRequests.reviewChannelId);
    const botMember = guild.members.me;

    if ((!config.isDevMode && !anchorRole) || !reviewChannel || !botMember ||
      !botMember.permissions.has('ManageRoles') ||
      (anchorRole && botMember.roles.highest.comparePositionTo(anchorRole) <= 0)) {
      await replyToRequestContext(context, isSlashCommand, 'Role requests are temporarily unavailable. Please contact the staff team.');
      return;
    }

    const color = `#${colorMatch[1].toUpperCase()}`;
    const requester = isSlashCommand ? context.user : context.author;

    if (SUBMITTING_REQUESTS.has(requester.id)) {
      await replyToRequestContext(context, isSlashCommand, 'Your role request is being submitted. Please wait a moment.');
      return;
    }
    SUBMITTING_REQUESTS.add(requester.id);
    submittingRequesterId = requester.id;

    if (await hasPendingRequest(reviewChannel, requester.id, guild.client.user.id)) {
      await replyToRequestContext(
        context,
        isSlashCommand,
        'You already have a role request waiting for staff review. Please wait for it to be approved or denied before submitting another.'
      );
      return;
    }

    const content = [
      '**Role request**',
      `*Requester:* <@${requester.id}>`,
      `*Role name:* "${roleName}"`,
      `*Color:* ${color}`,
    ].join('\n');
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${REQUEST_PREFIX}:deny`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${REQUEST_PREFIX}:approve`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success)
    );

    await reviewChannel.send({
      content,
      components: [buttons],
      allowedMentions: { parse: [] },
    });
    requestPosted = true;
    await replyToRequestContext(context, isSlashCommand, 'Your role request was sent to the staff team.');
  } catch (error) {
    console.error('Failed to submit role request:', error);
    const response = requestPosted
      ? 'Your request reached staff, but I could not send the confirmation.'
      : 'Unable to submit your role request right now. Please try again later.';
    await replyToRequestContext(context, isSlashCommand, response);
  } finally {
    if (submittingRequesterId) SUBMITTING_REQUESTS.delete(submittingRequesterId);
  }
};

const openDenialModal = async interaction => {
  if (isResolved(interaction.message)) {
    await interaction.reply({ content: 'This request has already been reviewed.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${REQUEST_PREFIX}:deny-reason:${interaction.message.id}`)
    .setTitle('Deny role request')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for denial')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1)
        .setMaxLength(500)
        .setRequired(true)
    ));

  await interaction.showModal(modal);
};

const approveRequest = async interaction => {
  const lockKey = interaction.message.id;
  if (PROCESSING_REQUESTS.has(lockKey)) {
    await interaction.reply({ content: 'This request has already been reviewed or is being processed.', ephemeral: true });
    return;
  }

  PROCESSING_REQUESTS.add(lockKey);
  let requestClaimed = false;
  let requestCompleted = false;
  let roleCreated = false;
  let roleRolledBack = false;
  let message = null;
  try {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const reviewChannel = await fetchTextChannel(guild, config.roleRequests.reviewChannelId);
    message = await reviewChannel?.messages.fetch({ message: lockKey, force: true }).catch(() => null);
    const request = message && getRequestFields(message);
    if (!request || message.author.id !== interaction.client.user.id || isResolved(message)) {
      await interaction.editReply('This request is missing valid details or has already been reviewed.');
      return;
    }

    const existingRoles = await guild.roles.fetch();
    const anchorRole = config.isDevMode
      ? null
      : existingRoles.find(role => role.name === config.roleRequests.anchorRoleName);
    const botMember = guild.members.me;
    if ((!config.isDevMode && !anchorRole) || !botMember || !botMember.permissions.has('ManageRoles') ||
      (anchorRole && botMember.roles.highest.comparePositionTo(anchorRole) <= 0)) {
      await interaction.editReply('The configured anchor role is missing or above Hellbot in the role list.');
      return;
    }

    if (existingRoles.some(role => role.name === request.roleName && !role.managed)) {
      await interaction.editReply('A role with that name already exists. Please contact the requester before closing this request.');
      return;
    }

    const requester = await guild.members.fetch(request.requesterId).catch(() => null);
    if (!requester) {
      await interaction.editReply('The requester is no longer in the server, so this role cannot be assigned.');
      return;
    }

    const statusMentions = [interaction.user.id];
    await updateRequestStatus(message, `Processing approval by <@${interaction.user.id}>`, statusMentions);
    requestClaimed = true;
    const role = await guild.roles.create({
      name: request.roleName,
      color: request.color,
      reason: `Approved role request by ${request.requesterId}`,
    });
    roleCreated = true;

    try {
      if (!config.isDevMode) await role.setPosition(anchorRole.position + 1);
      await requester.roles.add(role, 'Approved role request');
    } catch (error) {
      try {
        await role.delete('Role request approval could not be completed');
        roleRolledBack = true;
      } catch (rollbackError) {
        console.error('Failed to remove role after incomplete approval:', rollbackError);
      }
      throw error;
    }

    await updateRequestStatus(message, `Approved by <@${interaction.user.id}>`, statusMentions);
    requestCompleted = true;
    let notificationFailed = false;
    try {
      await sendOutcome(
        guild,
        request,
        `Your role request for **"${request.roleName}"** was approved, and the role has been assigned to you.`,
        true
      );
    } catch (error) {
      console.error('Could not announce approved role request:', error);
      notificationFailed = true;
    }
    await interaction.editReply(notificationFailed
      ? `Created and assigned **"${request.roleName}"**, but could not notify the requester. Please notify them manually.`
      : `Created **"${request.roleName}"**, assigned it to the requester, and notified them.`
    );
  } catch (error) {
    console.error('Failed to approve role request:', error);
    let requestRestored = false;
    if (requestClaimed && message && (!roleCreated || roleRolledBack)) {
      try {
        await restoreRequestForRetry(message);
        requestRestored = true;
      } catch (restoreError) {
        console.error('Failed to restore role request for retry:', restoreError);
      }
    }
    if (interaction.deferred || interaction.replied) {
      const response = requestCompleted
        ? 'The request was marked approved. Staff should check the review message before taking further action.'
        : requestRestored
          ? 'Approval failed, but no role was assigned. The request is ready to retry.'
          : requestClaimed
            ? 'Approval stopped after the request was marked as processing. Staff must check the role and requester before taking further action.'
            : 'Unable to approve this role request. Check Hellbot’s role permissions and try again.';
      await interaction.editReply(response);
    } else {
      await interaction.reply({ content: 'Unable to approve this role request.', ephemeral: true });
    }
  } finally {
    PROCESSING_REQUESTS.delete(lockKey);
  }
};

const denyRequest = async interaction => {
  await interaction.deferReply({ ephemeral: true });
  const messageId = interaction.customId.split(':')[2];
  const reviewChannel = await fetchTextChannel(interaction.guild, config.roleRequests.reviewChannelId);
  const message = await reviewChannel?.messages.fetch({ message: messageId, force: true }).catch(() => null);
  const request = message && getRequestFields(message);

  if (!request || message.author.id !== interaction.client.user.id || isResolved(message)) {
    await interaction.editReply('This request is missing valid details or has already been reviewed.');
    return;
  }

  const lockKey = message.id;
  if (PROCESSING_REQUESTS.has(lockKey)) {
    await interaction.editReply('This request is already being processed.');
    return;
  }

  PROCESSING_REQUESTS.add(lockKey);
  let requestClaimed = false;
  let requestCompleted = false;
  let requesterNotified = false;
  try {
    const reason = interaction.fields.getTextInputValue('reason').trim();
    if (!reason) {
      await interaction.editReply('Please enter a reason for denying the request.');
      return;
    }
    const statusMentions = [interaction.user.id];
    await updateRequestStatus(message, `Processing denial by <@${interaction.user.id}>`, statusMentions);
    requestClaimed = true;
    await sendOutcome(interaction.guild, request,
      `Your role request for **"${request.roleName}"** was denied. Reason: ${reason}`,
      true
    );
    requesterNotified = true;
    await updateRequestStatus(message, `Denied by <@${interaction.user.id}>`, statusMentions);
    requestCompleted = true;
    await interaction.editReply('The requester was notified and the request was closed.');
  } catch (error) {
    console.error('Failed to deny role request:', error);
    if (interaction.deferred || interaction.replied) {
      const response = requestCompleted
        ? 'The requester was notified and the request was marked denied. Staff should verify the review message.'
        : requesterNotified
          ? 'The requester was notified, but the request could not be marked complete. Staff should verify its status before taking action.'
          : requestClaimed
            ? 'The request was marked as processing to prevent duplicate review, but the requester could not be notified. Staff must notify them manually.'
            : 'Unable to deny this role request right now.';
      await interaction.editReply(response);
    } else {
      await interaction.reply({ content: 'Unable to deny this role request right now.', ephemeral: true });
    }
  } finally {
    PROCESSING_REQUESTS.delete(lockKey);
  }
};

const handleInteraction = async interaction => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith(`${REQUEST_PREFIX}:`)) {
      if (interaction.guildId !== targetServerId) {
        await interaction.reply({ content: 'Role requests can only be reviewed in the configured server.', ephemeral: true });
        return;
      }
      if (!config.roleRequests.reviewChannelId ||
        interaction.channelId !== config.roleRequests.reviewChannelId) {
        await interaction.reply({ content: 'This button only works in the configured review channel.', ephemeral: true });
        return;
      }
      if (interaction.message.author.id !== interaction.client.user.id) {
        await interaction.reply({ content: 'This is not a Hellbot role request.', ephemeral: true });
        return;
      }
      if (interaction.customId === `${REQUEST_PREFIX}:approve`) {
        await approveRequest(interaction);
      } else if (interaction.customId === `${REQUEST_PREFIX}:deny`) {
        await openDenialModal(interaction);
      } else {
        await interaction.reply({ content: 'Unknown role review action.', ephemeral: true });
      }
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(`${REQUEST_PREFIX}:deny-reason:`)) {
      if (interaction.guildId !== targetServerId) {
        await interaction.reply({ content: 'Role requests can only be reviewed in the configured server.', ephemeral: true });
        return;
      }
      if (!config.roleRequests.reviewChannelId ||
        interaction.channelId !== config.roleRequests.reviewChannelId) {
        await interaction.reply({ content: 'This denial form is no longer valid.', ephemeral: true });
        return;
      }
      await denyRequest(interaction);
    }
  } catch (error) {
    console.error('Failed to handle role-request interaction:', error);
    const response = 'Unable to process this role request right now. Please contact staff.';
    if (interaction.deferred) await interaction.editReply(response).catch(() => {});
    else if (!interaction.replied) await interaction.reply({ content: response, ephemeral: true }).catch(() => {});
  }
};

const ensureInstructions = async guild => {
  const channel = await fetchTextChannel(guild, config.roleRequests.requestChannelId);
  if (!channel) return;

  const instructions = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(INSTRUCTIONS_TITLE)
    .setDescription([
      `Use **/request-role** or **${config.commandsPrefix}request-role** in this channel to ask for a role.`,
      'Prefix format: `' + config.commandsPrefix + 'request-role [role name] [role color]`.',
      'Example: `' + config.commandsPrefix + 'request-role "Role name" #66CC99`.',
      'Provide a role name and a six-digit hex color, such as `#FF8800`.',
      'Staff will review your request and assign the role if approved.',
    ].join('\n'));

  const pinnedMessages = await channel.messages.fetchPinned();
  const existingInstructions = await channel.messages.fetch({ limit: 50 });
  const instructionMessage = [...pinnedMessages.values(), ...existingInstructions.values()].find(message =>
    message.author.id === guild.client.user.id &&
    message.embeds[0]?.title === INSTRUCTIONS_TITLE
  );

  if (instructionMessage) {
    await instructionMessage.edit({ embeds: [instructions] });
    if (!instructionMessage.pinned) await instructionMessage.pin();
    return;
  }

  const message = await channel.send({ embeds: [instructions] });
  await message.pin();
};

module.exports = { handleInteraction, requestRole, ensureInstructions, targetServerId };
