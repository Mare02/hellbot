// Explicit registry of dashboard-configurable AI tools. Register new tools here before exposing them.
module.exports = Object.freeze([
  {
    name: 'get_chat_context',
    description:
      'Fetch recent messages from the current Discord channel, including text, embeds, and metadata (ID, filename, MIME type, size, and URL) for every attachment. Image-only messages are included. When a request depends on an earlier image, use the attachment metadata to identify its message and attachment IDs, then call this tool again with those IDs to inspect that image visually.',
    group: 'Chat',
  },
  {
    name: 'get_current_weather',
    description: 'Get the current weather for a city using Open-Meteo.',
    group: 'Chat',
  },
  {
    name: 'get_exchange_rates',
    description:
      'Get exchange rates for a base currency and one or more target currencies using ExchangeRate-API.',
    group: 'Chat',
  },
  {
    name: 'get_forecast',
    description: 'Get the 7-day weather forecast for a city using Open-Meteo.',
    group: 'Chat',
  },
  {
    name: 'forget_memory',
    description:
      'Remove one or more accessible memories only when the current user explicitly asks you to forget them. Use exact IDs returned by search_memory and include only memories covered by that request. Provide either ids for a batch or id for one memory, never both. Missing IDs are ignored and the remaining existing memories are deleted. If any existing requested memory is inaccessible, nothing is deleted. Confirm only the IDs actually deleted in a successful result; count 0 means nothing was deleted.',
    group: 'Memory',
  },
  {
    name: 'save_memory',
    description:
      "Use only when the user explicitly asks to remember, save, store, track, or add information to a list for future use, or uses clearly equivalent wording. A request for help, a tutorial, advice, planning, or a statement like \"I will do it later\" is not permission to save or create a task. Never infer save intent from the content alone. If the user did not explicitly ask to retain it, do not call this tool. If the requested content is incomplete or depends on a reference to earlier conversation, first call get_chat_context to resolve the intended content from recent messages. Prefer the user's relevant statement over Hellbot's reply; do not save Hellbot's reply unless clearly requested. If context remains ambiguous, ask a concise clarification and do not guess/save yet. If the explicit save request is clear, save directly. For an explicitly requested saved item, set kind to task for planned work/action items (status starts open); otherwise choose fact, preference, instruction, or note. Preserve the requested meaning in content.",
    group: 'Memory',
  },
  {
    name: 'search_memory',
    description:
      'For every genuine information-seeking question or request, call this as the first and only tool in its call. After its result returns, always call get_chat_context as a separate second tool, even if no relevant saved notes were found. Applies to general information, advice, decisions, Hellbot, the user, server facts, history, tasks, preferences, and saved notes. Skip greetings, banter, reactions, statements, and obvious rhetorical questions. For open task lists, use kind task, status open, empty query, and limit 10. For specific task/history questions, use kind task and relevant terms without a status filter unless asked. For "what do you remember/save?", use an empty query and limit 10 with no kind/status filters. Matches words, not semantic meaning; try alternate keywords if nothing matches.',
    group: 'Memory',
  },
  {
    name: 'update_memory',
    description:
      'Change an accessible saved memory only when the current user explicitly requests a correction, reclassification, or task-status change. Preserve kind/status unless the user asks to change them. Tasks may have status open, done, or cancelled.',
    group: 'Memory',
  },
  {
    name: 'create_server_automod_rule',
    description:
      'Create a message-send AutoMod rule. Supported triggers: keyword, spam, keyword_preset, and mention_spam. Choose one or more actions. Only create rules explicitly requested by the owner.',
    group: 'Guild management',
  },
  {
    name: 'create_server_channel',
    description:
      'Create a text, announcement, voice, category, forum, or stage channel in the configured Hellbot server. Forum channels require a topic. Only create a channel explicitly requested by the user. Use get_server_channels to find a parent category ID. After creation, inspect the returned channel details.',
    group: 'Guild management',
  },
  {
    name: 'create_server_emoji',
    description:
      'Upload a custom emoji from an HTTPS PNG, JPEG, GIF, or WebP image hosted on Discord CDN. Only create when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'create_server_invite',
    description:
      'Create a Discord invite for a text, announcement, forum, voice, or stage channel. Only create an invite when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'create_server_role',
    description:
      'Create a role in the configured Hellbot server. Only create a role the user explicitly requested. Optional permission names grant server-wide permissions. After creation, call get_server_role to verify.',
    group: 'Guild management',
  },
  {
    name: 'create_server_scheduled_event',
    description:
      'Create a guild-only scheduled Discord event. Use entity_type external with a location, or voice/stage with a compatible channel ID. Start time must be in the future.',
    group: 'Guild management',
  },
  {
    name: 'create_server_sticker',
    description:
      'Upload a custom static PNG sticker from an HTTPS PNG image hosted on Discord CDN. tags must be a related Unicode emoji such as 👋. Only create when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'create_server_thread',
    description:
      'Create a thread in a text/announcement channel or a post in a forum channel. Only create what the owner explicitly requested. For an existing message, supply message_id; announcement channels require it. Standalone text threads default to public. Forum posts require content and may require tag_ids from get_server_channel. Use the returned thread ID with message tools. A successful result confirms creation; do not create it again.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_automod_rule',
    description:
      'Permanently delete an AutoMod rule by exact ID. Only delete when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_channel',
    description:
      'Permanently delete one channel in the configured Hellbot server by its exact channel ID. This cannot be undone. Only delete a channel when the owner explicitly asks for that channel to be deleted.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_channel_message',
    description:
      'Permanently delete either one specific message by message_id or the most recent count deletable messages in a text/announcement channel, thread, or forum post, regardless of author. Skips undeletable system messages. Deleting recent messages requires Manage Messages permission. This cannot be undone. Only delete when the owner explicitly requests it. If deletion stops with an error, use deletedMessageIds and deletedCount to report partial progress; never retry the original count blindly.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_emoji',
    description:
      'Permanently delete a custom emoji from the configured server. Only delete when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_invite',
    description:
      'Revoke an active server invite by its exact code. This cannot be undone. Only revoke when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_role',
    description:
      'Permanently delete a role from the configured Hellbot server. This removes it from every member and cannot be undone. Only delete when the owner explicitly requests deletion of that role.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_scheduled_event',
    description:
      'Permanently delete a scheduled event by exact event ID. Only delete when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'delete_server_sticker',
    description:
      'Permanently delete a custom sticker from the configured server. Only delete when explicitly requested.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_automod_rule',
    description:
      'Edit a server AutoMod rule by exact ID. Trigger type cannot be changed after creation. Use get_server_automod_rule first; only provide fields the owner requested, then verify.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_channel',
    description:
      'Edit a channel in the configured Hellbot server by exact ID. Only change fields the user explicitly requested. Supported fields: name, topic, slowmode_seconds (0-21600), nsfw, position, and parent_id to move it into a category or null to remove it from its current category. Moving a channel preserves its existing permission overwrites. After a successful edit, call get_server_channel to independently verify the result.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_channel_message',
    description:
      'Edit the text of one message authored by Hellbot in a text/announcement channel, thread, or forum post. Use get_server_channel_messages to find its exact message ID. Only make changes explicitly requested by the user. Archived threads are unarchived when Discord permits it.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_channel_permissions',
    description:
      'Set channel permission overwrites for one role or member. Use allow, deny, or inherit arrays with exact Discord permission names. For visibility, set ViewChannel to allow or deny. Unspecified permissions stay unchanged. Use get_server_channel to inspect overwrites and verify the result.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_emoji',
    description: 'Rename a custom emoji in the configured server by exact emoji ID.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_info',
    description:
      'Edit basic settings for the configured Hellbot server. Only change settings explicitly requested by the user. Supports name, description, icon, banner, preferred locale, verification level, default message notifications, explicit content filter, AFK timeout and channel, system channel, rules channel, and public updates channel. When the user attached the requested icon image to the current prompt, set use_prompt_image_for_icon to true. For an image found through get_chat_context, pass its exact messageId and attachment ID in icon_source_message_id and icon_source_attachment_id. Use an empty channel ID to clear an optional channel. After editing, call get_server_info to verify.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_member',
    description:
      "Change a member's server nickname and/or assigned roles in the configured Hellbot server. Only make changes explicitly requested by the user. Add/remove exact role IDs obtained from get_server_member or get_server_roles. After editing, call get_server_member to verify.",
    group: 'Guild management',
  },
  {
    name: 'edit_server_role',
    description:
      'Edit a role in the configured Hellbot server by exact ID. Only make changes explicitly requested by the user. You may set its name, color, hoist, mentionable, and add or remove named permissions. Permission changes are server-wide. After editing, call get_server_role to verify the result.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_scheduled_event',
    description:
      'Edit a scheduled event by exact event ID. Provide only fields the owner asked to change. Use get_server_scheduled_events first and verify after editing.',
    group: 'Guild management',
  },
  {
    name: 'edit_server_sticker',
    description: 'Edit the name, description, or tags of a custom sticker by exact sticker ID.',
    group: 'Guild management',
  },
  {
    name: 'get_server_activity',
    description:
      'Summarize current member count, recent joins among scanned current members, and recent audit-log activity. Discord does not expose voluntary leave history. Check memberScan.scanComplete before treating join counts as complete, and auditLog.pagination.mayHaveMore before treating audit counts as complete. Use get_server_audit_log to continue incomplete audit results.',
    group: 'Guild management',
  },
  {
    name: 'get_server_audit_log',
    description:
      'Read Discord audit log entries using native user, action-type, and entry-ID filters. Logs cover moderation and server changes, not voluntary member departures, and are retained for 45 days. Results are newest first, or oldest first when after is supplied. If pagination.mayHaveMore is true, continue with nextBefore or nextAfter and the same filters. Requires View Audit Log.',
    group: 'Guild management',
  },
  {
    name: 'get_server_automod_rule',
    description: 'Get one AutoMod rule by its exact rule ID.',
    group: 'Guild management',
  },
  {
    name: 'get_server_automod_rules',
    description:
      'List AutoMod rules configured for the server. Requires Manage Server permission for the bot.',
    group: 'Guild management',
  },
  {
    name: 'get_server_channel',
    description:
      'Get the current details and permission overwrites for one channel in the configured Hellbot server by its exact channel ID. Use after editing to verify the saved state.',
    group: 'Guild management',
  },
  {
    name: 'get_server_channel_messages',
    description:
      'Fetch messages newest first from a text/announcement channel, thread, or forum post in the configured Hellbot server, optionally within a date range. Use this to find a bot-authored message before editing it. Check truncated before treating results as the complete range.',
    group: 'Guild management',
  },
  {
    name: 'get_server_channel_pins',
    description:
      'List pinned messages in a text/announcement channel, thread, or forum post in the configured Hellbot server.',
    group: 'Guild management',
  },
  {
    name: 'get_server_channels',
    description:
      'List channels in the configured Hellbot server. Use this first to find a channel ID before inspecting or editing a channel. For large results, use offset to continue.',
    group: 'Guild management',
  },
  {
    name: 'get_server_expressions',
    description: 'List custom emojis and stickers in the configured Hellbot server.',
    group: 'Guild management',
  },
  {
    name: 'get_server_info',
    description:
      'Get the current basic settings for the configured Hellbot server. Use after editing to verify saved values.',
    group: 'Guild management',
  },
  {
    name: 'get_server_invites',
    description:
      'List active invites for the configured Hellbot server. Requires Manage Server permission for the bot.',
    group: 'Guild management',
  },
  {
    name: 'get_server_member',
    description:
      'Get current account, server nickname, and assigned-role details for one member by exact Discord user ID.',
    group: 'Guild management',
  },
  {
    name: 'get_server_role',
    description:
      'Get the current details and permissions for one role in the configured Hellbot server by exact role ID.',
    group: 'Guild management',
  },
  {
    name: 'get_server_roles',
    description:
      'List roles in the configured Hellbot server. Use this first to find a role ID before inspecting or editing a role.',
    group: 'Guild management',
  },
  {
    name: 'get_server_scheduled_events',
    description: 'List scheduled events in the configured Hellbot server.',
    group: 'Guild management',
  },
  {
    name: 'get_server_threads',
    description:
      'Discover existing threads or forum/media posts under one parent channel in the configured Hellbot server. Active lists include only threads the bot can access. Private scopes work only in text channels; archived_private requires Manage Threads, while joined_archived_private lists only private threads the bot has joined. Use returned thread IDs with message tools. This never creates, joins, or unarchives a thread. Follow hasMore and nextOffset or nextBefore to continue.',
    group: 'Guild management',
  },
  {
    name: 'list_server_members',
    description:
      'List current members in the configured Hellbot server, optionally matching an exact role or having no assigned roles other than @everyone. Includes bots. Scans up to 5000 members per call using fresh Discord pages, not the member cache. If scanComplete is false, continue with nextAfterUserId as after_user_id and the same filters; never treat a partial page as the full membership or total match count.',
    group: 'Guild management',
  },
  {
    name: 'pin_server_channel_message',
    description:
      'Pin one message in a text/announcement channel, thread, or forum post. Only pin when explicitly requested. Find the exact message ID with get_server_channel_messages first. Archived threads are unarchived when Discord permits it.',
    group: 'Guild management',
  },
  {
    name: 'remove_server_channel_permission_overwrite',
    description:
      'Remove every channel-specific permission overwrite for one role or member, making permissions inherit from the server and parent category. Use get_server_channel to verify.',
    group: 'Guild management',
  },
  {
    name: 'search_server_members',
    description:
      'Search members in the configured Hellbot server by username or server nickname. Use the returned user ID with get_server_member or edit_server_member.',
    group: 'Guild management',
  },
  {
    name: 'send_server_channel_message',
    description:
      'Send a text message to a text/announcement channel, thread, or forum post in the configured Hellbot server. Only post content explicitly requested by the user. Sending may unarchive a thread. Mentions are sent without ping notifications.',
    group: 'Guild management',
  },
  {
    name: 'sync_server_channel_permissions',
    description:
      "Copy permission overwrites from a channel's parent category. This replaces that channel's current overwrites with the category's overwrites. Use get_server_channel to verify.",
    group: 'Guild management',
  },
  {
    name: 'unpin_server_channel_message',
    description:
      'Remove one message from a channel’s pins. Find the exact message ID with get_server_channel_messages or get_server_channel_pins first. Archived threads are unarchived when Discord permits it.',
    group: 'Guild management',
  },
]);
