# Hellbot memory through Mem0 MCP

Hellbot connects to the [hosted Mem0 MCP server](https://docs.mem0.ai/platform/mem0-mcp) over Streamable HTTP using the official MCP JavaScript SDK. The existing Groq tool loop decides when to call the memory tools. No local Mem0 server or Python process is required.

## Configuration

Install dependencies with `npm ci` or `pnpm install --frozen-lockfile`. Use Node.js 20.3 or newer for `AbortSignal.any` support.

Set these in the bot's ignored `.env` file or deployment environment, then restart the bot:

```dotenv
MEM0_API_KEY=your_mem0_platform_api_key
MEM0_ENABLED=true
```

Get the API key from the [Mem0 dashboard](https://app.mem0.ai/dashboard/api-keys). Never commit it. `MEM0_ENABLED` defaults to enabled; set it to `false` to disable memory. Without a key, the existing AI tools continue working and the AI is told that long-term memory is unavailable.

The endpoint is `https://mcp.mem0.ai/mcp`. The bot authenticates with `Authorization: Bearer <MEM0_API_KEY>`; headless bot deployments do not use browser OAuth.

## Discord behavior

Memory is available to `/askai`, the equivalent prefix command, and messages that mention or reply to the bot. Random freewill responses and scheduled AI jobs have no memory access because they do not supply a requesting user.

Examples:

- `Remember that I prefer short answers.`
- `What answer style did I ask you to remember?`
- `Remember my task: update the server rules.`
- `Mark my server-rules task as completed.`
- `Forget my preference for short answers.`

The bot offers `add_memory`, `search_memories`, `get_memories`, `get_memory`, `update_memory`, `delete_memory`, and `get_event_status`, restricted to the subset available from the server. Bulk deletion, entity administration, and account-wide event history are not exposed.

Memories belong to the requesting Discord user in the current channel. They are not shared server-wide or recalled in another channel. Scope is assigned by the bot, not chosen by the model:

- `user_id`: `discord:<guild-id-or-dm>:<channel-id>:<discord-user-id>`
- `agent_id`: `hellbot:<development-or-production>:<discord-application-id-or-default>`

Every search/list includes both scope filters. Direct reads, updates, and deletes first fetch the memory and check both identifiers, failing closed if either is missing or different. The model cannot supply custom filters or another user's scope. Development and production use separate agent identifiers.

Writes store the concise requested text with `infer: false` and Discord source metadata. Channel history and complete conversations are not automatically uploaded. The prompt instructs the AI to save only when the requesting user explicitly asks, avoid secrets and other users' information, and treat retrieved memories as data. These content decisions are model instructions; scope enforcement is implemented in handlers.

## Reliability and verification

The connection is established lazily, shared between requests, and discovers the live tool names. Network requests have a 15-second timeout. Connection failures back off for 60 seconds and leave weather, exchange rates, and chat-context tools available. Failed mutations are not automatically retried. A pending operation must not be reported as saved; event-status checks are restricted to events returned during the current response.

To verify in the development server, save a harmless preference, ask about it in a later message in the same channel, then ask the bot to forget it. Confirm the record in the Mem0 dashboard. Ask from a different user or channel to verify isolation. This sends the requested memory text and Discord scope metadata to your Mem0 account.

The implementation does not migrate local Markdown memories. It is an independent integration based on `main`.
