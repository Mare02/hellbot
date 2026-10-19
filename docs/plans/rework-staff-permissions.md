# Rework Staff Permissions

## Status

Implemented on `codex/rework-staff-permissions`. Local syntax and command registration checks are complete; live Discord verification and deployment are pending.

## Goal

Remove the staff user-ID snapshots stored in environment variables and stop synchronizing Discord staff members into `.env`. Hellbot should authorize users from their current Discord member context and Discord permissions.

## Implementation before this rework

- `src/utils/staffIds.js` reads `UNLOCKED`, `ADMINS`, and `MODERATORS` from the environment as user-ID lists.
- `src/utils/roles.js` maps a user ID to one of four Hellbot levels: `owner`, `unlocked`, `admin`, or `moderator`.
- `src/commands/syncserverstaff.js` discovers members from configured Discord role IDs and writes those user IDs back to `.env`.
- Both prefix and slash command listeners pass only the user ID to the permission check. The member's current roles and permissions are not used by that shared check.
- `headAdmin` and `admin` are collapsed to the same Hellbot `admin` level by the sync command. `headModerator` and `moderator` are likewise collapsed to `moderator`.
- Several moderation commands already perform additional Discord permission checks, such as `Ban Members`, `Kick Members`, and `Mute Members`.
- The `staffMember` role and other `config.staffRoleIds` are separate from the environment-backed staff user lists. Some are used for role-request mentions or other role-based features and must be audited separately before removal.

## Agreed implementation

1. Remove the `savechat` command as part of this rework. Do not retain it or define a replacement authorization policy.
2. Require Discord's `Administrator` permission for `dm`, `logout`, `mastercreation`, `masterphoto`, `uniquecreation`, and direct invocations of `syslog`. Require the configured owner identity for `updateslashcommands`.
3. Replace the generic Hellbot staff-level check with explicit authorization for each user-invoked command. Check the invoking member's effective Discord permissions: `Ban Members` for `ban` and `unban`, `Kick Members` for `kick`, `Moderate Members` for `mute` and `unmute`, and `Manage Messages` for `deletemsg`. Use Discord.js's aggregate member permissions, which combine grants from all of the member's roles; do not manually check only the configured `Moderator` or `Head Moderator` role IDs for these permission-based commands. Anyone whose combined permissions include the required permission passes that command's check. A staff role without the required permission does not grant access to that action; do not require `Administrator` for these moderation commands.
4. Keep `freewill` and `newticketquestion` as trigger-only behavior, not public commands. `freewill` runs from its automatic message trigger. `newticketquestion` runs when a ticket channel is created; remove its current prefix-command exposure. Neither trigger should require a staff user's permission.
5. Keep `syslog` available as an internal helper for moderation-command logging. The `Administrator` restriction applies to a user's direct command invocation, not to internal calls made after an authorized command succeeds.
6. Make AI memory available to all server members without a staff, owner, or `Manage Guild` gate. Preserve the existing channel visibility and history checks so users and the bot can only access memory from channels they can read. Users may write, update, or delete memories only when they explicitly request that action.
7. Preserve command-specific operational checks. A user's permission does not replace checking that the bot itself has the required permission or role hierarchy to perform the action.
8. Update `/help` so it reflects the effective authorization policy instead of the old Hellbot staff tiers, and ensure trigger-only behavior is not listed as a public command.
9. Remove `syncserverstaff`, `staffIds.js`, and the `UNLOCKED`, `ADMINS`, and `MODERATORS` environment variables once all consumers have been migrated.

The Discord `Administrator` permission is a broad grant. It is suitable for truly administrator-only commands such as `dm`, but should not automatically be required for every moderation action if narrower Discord permissions are sufficient.

## Authorization migration inventory

Current command metadata uses these Hellbot levels:

| Current level | Commands identified | Migration decision |
| --- | --- | --- |
| `moderator` | `ban`, `kick`, `mute`, `unmute`, `unban`, `deletemsg` | Require the action's narrow effective Discord permission: `Ban Members`, `Kick Members`, `Moderate Members`, or `Manage Messages`, respectively. `Moderator` and `Head Moderator` receive access only if their effective permissions include the required permission. |
| `moderator` | `mastercreation`, `masterphoto`, `uniquecreation`, `syslog` | Require effective Discord `Administrator` permission for direct invocations. Keep `syslog` internal calls usable by authorized moderation commands. |
| `moderator` | `freewill`, `newticketquestion` | Trigger-only behavior; exclude from public command authorization and `/help`. Remove `newticketquestion` from prefix-command exposure. |
| `admin` | `dm`, `logout` | Require effective Discord `Administrator` permission. |
| `admin` | `updateslashcommands` | Require `config.owner.id` identity; do not grant access to all members with `Administrator`. |
| `unlocked` | `syncserverstaff` | Remove this command along with the user-ID synchronization mechanism. |
| `owner` | `savechat` | Remove the command. It is in scope for deletion and must not be retained under a replacement authorization policy. |

The inventory records the previous command metadata and the implemented authorization policy. Shared authorization applies to direct user invocations; internal helpers and trigger-only handlers keep their separate entry points.

## Owner and role configuration boundaries

- Removing the staff user-ID lists does not by itself remove `config.owner.id`. Owner identity is used by other sensitive functionality, including AI server tools, and should be reviewed as a separate decision.
- Removing `UNLOCKED`/`ADMINS`/`MODERATORS` does not imply removing `config.staffRoleIds`. Those Discord role IDs are still used by features such as role-request notifications and need a separate consumer audit. AI memory access must no longer depend on these staff role IDs.
- Dashboard access authorization is separate from Discord command authorization. A Discord server permission should not automatically grant access to the private dashboard or its secrets.

## Implementation considerations

- Pass the relevant Discord member/context to the shared authorization layer from both `src/listeners/onInteractionCreate.js` and `src/listeners/onNewMessageCreate.js`.
- Ensure prefix and slash checks use the invoking member's effective permissions for the relevant guild/channel, including grants accumulated from all of the member's roles, so both entry points reflect the permissions Discord actually grants to that member.
- Apply these guild permission rules in every server where the bot is installed, using the invoking member's permissions in that server. Deny permission-based commands when invoked outside a guild, where no guild member permissions are available.
- `updateslashcommands` is also invoked directly by the deployment workflow with `isCalledAsJob = true`. Keep that non-user deployment path working while enforcing owner-only access for direct prefix invocation.
- Keep trigger-only handlers out of the public command registry where possible; in particular, `newticketquestion` is currently in the prefix command registry even though it is also called by the ticket-channel-created listener.
- Update `AGENTS.MD` to match this permission model: command permissions use the invoking member's aggregate Discord permissions, while configured staff role IDs remain for their separate feature uses.
- Handle commands invoked outside a guild explicitly; member-based permission checks are only available in a guild context. Retain an explicit owner exception only where the feature requires it.
- Use Discord.js permission flags rather than string names where practical, and keep user permissions distinct from the bot's own permissions.
- Update help output and any command registration metadata together with runtime enforcement so the UI does not advertise commands the user cannot run.
- Do not query the configuration database for every authorization check. The active permission configuration can be read from the runtime configuration snapshot; Discord member permissions/roles come from the interaction or message context.

## Completion criteria

- Prefix and slash command authorization no longer depends on `UNLOCKED`, `ADMINS`, or `MODERATORS` user-ID lists.
- `syncserverstaff` and its staff synchronization mechanism are removed.
- `savechat` is removed.
- `freewill` and `newticketquestion` remain trigger-only and are not exposed as public commands.
- `updateslashcommands` is owner-only; `logout`, `dm`, `mastercreation`, `masterphoto`, `uniquecreation`, and direct `syslog` calls require effective `Administrator` permission.
- Moderation actions require their corresponding narrow Discord permissions, and fail authorization when the member lacks them.
- Permission-based authorization uses Discord.js's aggregate member permissions across all assigned roles, rather than checking one staff role by ID or name.
- AI memory tools are available to all server members without staff authorization, while channel visibility and history checks remain enforced.
- Memory writes, updates, and deletion remain available only after an explicit request from the user.
- `updateslashcommands` remains owner-only for direct invocation and usable by the deployment workflow.
- Permission-based commands work in every guild where the bot is installed and deny invocations without guild member permissions.
- `AGENTS.MD` reflects the implemented command permission model and separate configured role uses.
- Every command currently using `command.perm` has an explicit, documented Discord-based authorization rule.
- Existing owner-only and configured-role-based service behavior is preserved unless this plan explicitly changes it; AI memory is the explicit exception and must be available to all server members, while dashboard access remains separate.
- `/help` reports access consistently with actual enforcement.
