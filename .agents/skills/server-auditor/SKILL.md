---
name: server-auditor
description: Inspect Hellbot's Discord server or carry out explicitly requested server changes using this project's Discord.js bot.
---

# Server Auditor

Use this skill for Discord server lookups and explicitly requested management tasks in the Hellbot project, such as checking roles, auditing channel activity, creating roles, or changing role settings.

## Connect to the intended server

- Use the project's Discord.js v14 dependency and `src/utils/config.js`. The default production guild is `config.homeServerId`.
- For the real server, start every one-off Node process with `NODE_ENV=production` inline, for example `NODE_ENV=production node -e '...'`. This makes the project config select `DISCORD_TOKEN` even when the surrounding shell is in development mode. For an explicitly requested test-server task, use the development configuration instead.
- Load configuration through the project module; it loads dotenv. Never print, copy, or log `.env` values, the bot token, or API keys. Do not edit `.env` or leave a production environment override in the shell.
- Verify the logged-in bot identity and the fetched guild name and ID before reporting results or making changes. If the configured guild returns `Unknown Guild`, report that and inspect only the accessible guild names and IDs to diagnose which bot identity is active. Do not guess another target server.
- Use the minimum Gateway intents needed. Run one-off clients, not `src/main.js` or the persistent bot process, and always destroy the client in a `finally` block.

## Audit server data

- Resolve channels and roles by their live IDs or exact names. Channel names may include emoji or other Unicode characters; if a requested name has several plausible matches, show the matches and ask which one to use.
- Fetch only the data needed for the request. Do not print message contents when metadata such as author, timestamp, or count answers the question.
- For contributor rankings, use message count as the activity measure unless the user requests another measure. State the time window, exclude bot messages by default, and distinguish message activity from a broader judgment of prominence.
- For all-time channel counts, paginate backward through message history with batches of up to 100 until no older messages remain. Aggregate author and timestamp metadata; do not log or include message text in results. Report the oldest and newest messages reached, total messages counted, and any deleted or unresolvable accounts.
- Do not treat `role.members.size` as a complete membership count unless the required member intent was enabled and the guild member list was successfully fetched. Otherwise report the count as unavailable.

## Manage server state

- Make Discord changes only when the user has clearly requested the specific change. A question asking for advice or a lookup is not authorization to mutate the server. Do not ask for confirmation again when the requested target and change are already clear.
- Before role changes, verify `ManageRoles`, the bot's highest-role position, and the exact target roles. Create roles with no permissions unless the user specifies otherwise; never copy permissions from a related role by assumption. Do not assign a role to members unless asked.
- For a requested role order, re-fetch roles as positions change, then verify the final ordering. For requested colors, apply the exact chosen hex value and re-fetch to verify it.
- Do not send messages, delete content, ban or kick users, or change other server state unless that specific action was requested.

## Report results

- State which bot identity and guild were used, the exact scope or time window, and the observed result. Distinguish verified data from unavailable or incomplete data.
- For mutations, report the exact objects changed and verify their resulting state. Never claim success from a command that did not return a successful result.
