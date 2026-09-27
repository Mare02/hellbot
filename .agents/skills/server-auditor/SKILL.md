---
name: server-auditor
description: Use for any Hellbot Discord server task: inspect server state, answer server questions, or carry out requested changes through this project's Discord.js bot.
---

# Server Auditor

Use this as the general workflow for Discord-server requests in the Hellbot project. Apply it to the specific server, data, or change the user asks about; do not limit it to predefined task types.

## Connect to Discord

- Use the project's Discord.js v14 dependency and `src/utils/config.js`. When the user means the main Hellbot server, use `config.homeServerId`.
- For the real server, start each one-off Node process with `NODE_ENV=production` inline, for example `NODE_ENV=production node -e '...'`. This makes the project config select `DISCORD_TOKEN` even when the surrounding shell is in development mode. Use the development configuration only when the user targets the test server or asks for a development check.
- Load credentials through the project config and dotenv. Never print, copy, or log `.env` values, the bot token, or API keys. Do not edit `.env` or leave a production environment override in the shell.
- Verify the logged-in bot identity and target guild before acting or reporting. If the requested guild is unavailable, report that and use accessible guild names and IDs only to diagnose the issue; do not silently switch servers.
- Use a one-off client with the minimum required Gateway intents, not `src/main.js` or the persistent bot process. Always close it in a `finally` block.

## Handle the request

- Use the user's stated target and scope. If the intended server or target is genuinely ambiguous, identify the likely matches and ask which one they mean.
- Gather only the Discord data needed to answer the request. Keep sensitive information and message content out of logs and results unless the user specifically asks for that content and it is necessary to the task.
- Carry out only changes the user has requested. Advice or inspection requests do not by themselves authorize changes. When the requested change and target are clear, proceed without asking for redundant confirmation.
- Verify fetched information and completed changes against Discord's returned state. If permissions, access, or available data prevent completion, report the specific limitation rather than guessing.

## Report back

- State which bot identity and server were used, what scope was inspected or changed, and what the live result confirmed.
- Distinguish verified results from estimates, unavailable data, or incomplete history. Never claim a change succeeded unless Discord returned success and the resulting state was checked.
