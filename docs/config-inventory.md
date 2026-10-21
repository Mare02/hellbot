# Configuration inventory and initial import

This inventory defines task 2 of the [dashboard implementation plan](plans/hellbot-dashboard-tasks.md).
It describes the current source consumers and the initial persisted contract.
Tasks 3–12 now connect these fields to ConfigService, live IPC updates and the
dashboard. Import is still explicit. See [local dashboard operation](dashboard.md).

## Profile configuration

`src/services/config/schema.js` validates the complete non-secret JSON document
for each profile. Every object rejects unknown fields. The stored shape is:

```text
disabledGuildIds
commandsPrefix
embedColor
ai.provider
ai.models.groq.text
ai.models.groq.vision
ai.models.google.text
ai.tools.<registeredToolName>
features.<supportedFeatureName>
behavior.randomReplyProbability
behavior.dailyQuoteSchedule
behavior.futureNewsSchedule
behavior.presenceRotationMinutes
roleRequests.requestChannelId
roleRequests.reviewChannelId
roleRequests.anchorRoleId
```

| Setting | Source and defaults | Current consumers | Intended runtime behavior |
| --- | --- | --- | --- |
| `disabledGuildIds` | Empty list by default; edited from the active profile's server list fetched through Discord.js REST and saved in SQLite | Message/slash interactions, guild events, scheduled guild broadcasts | Live after save and IPC reload; disabled servers cannot use bot commands or receive Hellbot workflows. |
| `commandsPrefix` | Legacy config: `dev::` for dev, `::` for prod | `listeners/onNewMessageCreate.js`, `commands/help.js`, `commands/info.js`, `commands/newticketquestion.js`, `services/roleRequests.js` | Live for subsequent messages and generated help. |
| `embedColor` | Legacy config: `#fc9803` | `commands/info.js`, `help.js`, `getcoin.js`, `latestnews.js`, `newticketquestion.js`, `serverinfo.js`, `syslog.js`, `uptime.js`; `services/roleRequests.js`; `jobs/dailyQuoteJob.js`, `dailyFutureNewsJob.js` | Live for new embeds after consumers use the snapshot. |
| `ai.provider` | `AI_PROVIDER`, normalized as today; fallback `groq` | `services/AIservice.js`, `services/chatContext.js`, `utils/aiPrompts.js` | Refresh the selected profile's AI client and media handling. |
| `ai.models.groq.text` | Legacy selected model when Groq is active; otherwise `aiModels.gpt_oss_120b` | `services/AIservice.js`, `commands/info.js`, `utils/aiPrompts.js` through `currentAiModel` | Apply to subsequent text requests. |
| `ai.models.google.text` | Legacy `currentGeminiModel` | Same active-model consumers; `services/geminiCompletion.js` receives the request model | Apply to subsequent Google requests. |
| `ai.models.groq.vision` | Existing hardcoded `aiModels.qwen3_8_27b` | Image requests and tool-image follow-ups in `services/AIservice.js` | Apply to subsequent vision requests. |
| `roleRequests.*` | Existing per-environment destinations and anchor name; dev anchor is null | Request creation, review interactions, role placement, and request instructions in `services/roleRequests.js` | Live for subsequent operations; preserve the workflow's permission and hierarchy checks. |

This is an explicit allowlist; the importer never serializes the full legacy
configuration object. No Discord token, owner field, generic server setting, or
provider key is allowed in the configuration document.

Model IDs are free-form validated strings; the dashboard does not maintain a provider model catalog.

## Prompts remain in code

Prompt management is deferred in the updated dashboard plan. Existing prompts in
`utils/aiPrompts.js` and `services/ai-tools/memory.js`, including their dynamic
provider/model/date context, remain unchanged. They are not imported into the
configuration document or history. The strict schema rejects a `prompts` field.

Tool definitions, tool descriptions, JSON response schemas, and per-message context
(referenced text, images, attachment warnings) also remain code-owned.

## Shared API secrets — task 4

| Environment source | Scope / current consumer | Planned storage |
| --- | --- | --- |
| `GROQ_API_KEY` | Shared; `services/AIservice.js` constructs a Groq client lazily | Shared encrypted `secrets` row with provider `groq`. |
| `GEMINI_API_KEY_1`, additional numbered keys; `GEMINI_API_KEY` fallback | Shared; explicit importer preserves ordering; `services/geminiCompletion.js` uses runtime key rotation | Multiple shared encrypted rows with provider `google`; preserve numeric order and existing fallback rules during import. |
| `EDENAI_API_KEY` | Shared; image generation in `services/AIservice.js` | Shared encrypted row with provider `edenai`. |
| `NEWS_API_KEY` | Shared by services in one installation; latest-news command | Encrypted provider `newsapi`; live update for the active bot. |
| `EXCHANGE_RATE_API_KEY` | Shared by services in one installation; exchange-rate AI tool | Encrypted provider `exchangerate`; live update for the active bot. |
| `NINJA_API_KEY` | Shared by services in one installation; daily quote job | Encrypted provider `apininjas`; live update for the active bot. |

Task 2 does not write these values to SQLite or print them. Task 4 adds encryption,
explicit key import and dashboard operations. Runtime reads keys only from the
database snapshot. Never put them into `config_json` or history.

## Editable Discord routing IDs

These root profile fields are editable in Bot settings, stored separately for dev
and prod, and live-applied through the RAM snapshot and IPC. Migration 002 adds
missing fields using existing constants without overwriting profile values.

| Fields | Consumer / behavior |
| --- | --- |
| `homeServerId`, `testingServerId` | Guild targeting in listeners, server tools, role requests, jobs and slash registration. New operations use current IDs; slash registration is explicit. |
| `verifyChannelId`, `generalChannelId`, `verifiedRoleId`, `verificationLogsChannelId` | Verification, welcome messages and verification logging. |
| `hellbotUpdatesChannelId` | Bot update announcements and slash registration notifications. |
| `masterCreationsChannelId`, `uniqueCreationsChannelId`, `masterPhotosChannelId` | Creation and photo forwarding commands. |
| `minecraftCategoryId` | Category excluded from ticket handling. |
| `staffMemberRoleId` | Role-request notification mention only; never a command permission gate. |
| `logChannelId` | Reserved editable value; currently no source consumer. Does not control dashboard error logs. |

## Values remaining outside editable profile configuration

| Values | Classification / consumers |
| --- | --- |
| `DISCORD_TOKEN`, `DEV_DISCORD_TOKEN` | Startup secrets; Discord login in `client.js` and REST client in `commands/slashCommands/updateslashcommands.js`. Keep existing dev fallback behavior for now. |
| `CLIENT_ID`, `DEV_CLIENT_ID`, `PUBLIC_KEY`, `PUBLIC_KEY_DEV` | Discord application startup identity. Application ID is used by slash registration and the derived invite link. |
| `NODE_ENV`, `isDevMode` | `NODE_ENV=development` selects dev; `NODE_ENV=production` selects prod. It also controls memory isolation, tool traces, guild targeting, ticket handling, and slash registration. Not an editable database setting. |
| `owner.id`, `owner.name` | Protected shared owner identity; `utils/permissions.js`, `services/ai-tools/guild/access.js`, and `commands/info.js`. No ordinary profile import or editable owner controls in this task. |
| `bot.name`, `bot.description`, `bot.version`, `bot.inviteLink` | Code-owned bot metadata and derived URL. Used by info/help, prompts, and update notices. |
| `discordMsgLengthLimit` | Discord/platform constant, not an editable application setting. |
| `BUGSNAG_API_KEY` | Startup error reporting in `main.js`; remains an environment secret. |
| `HELLBOT_MEMORY_DIR`, `HELLBOT_DATABASE_PATH`, `DASHBOARD_PORT` | Startup storage/listener settings. Remain process environment values. |
| Future database encryption key | Shared process environment secret, added with task 4. Never persisted alongside the encrypted values. |

### Implemented feature settings

The strict schema now includes `ai.tools`, eight supported `features` switches,
and four `behavior` timing/probability settings, connected to their consumers:

- Mention/reply AI handling and random freewill replies; probability is currently
  hardcoded to 0.05 in `listeners/onNewMessageCreate.js`.
- Role-request, verification, and ticket workflows.
- Daily quotes, currently scheduled at `0 8 * * *` in `kernel.js`; future news is
  currently commented out there.
- Presence rotation, currently every six hours in `jobs/funnyPresenceJob.js`, using
  `data/funnyStatuses.js`.

The listed values are defaults. Existing rows without these fields are normalized
in memory through validated defaults; startup does not overwrite their JSON. A
subsequent explicit save persists the full validated document and activity entry.
Tool toggles list only registered tools and preserve contextual access checks.

Other code-owned limits include AI tool-loop iterations, provider timeouts/retry
policy, reasoning settings, chat-context limits, and image size/MIME restrictions.
They stay in code until a separate consumer audit defines a safe setting contract.

## Defaults and initial import

`getConfigDefaults('dev' | 'prod')` builds and validates a fresh configuration
without reading the environment or database. `createInitialConfig(profile, env)`
uses the same mapping with explicitly supplied legacy environment values.

The legacy factory accepts an environment object, so dev/prod snapshots can be
built in one import process without changing `process.env.NODE_ENV`, touching the
CommonJS module cache, or logging into Discord. `utils/config.js` still exports the
legacy runtime shape using the real process environment.

From the repository root, preview the active installation's settings (no database is opened):

```sh
npm run config:import -- --profile dev --dry-run
```

Apply it explicitly:

```sh
npm run config:import -- --profile dev --apply
```

Use `--profile prod` on the VPS. Do not import `all` for the local/VPS deployment:
each installation should initialize only its active profile. Without `--apply`,
the command always performs a dry run. The profile uses the current `AI_PROVIDER`
environment value as its initial provider. Later dashboard changes are scoped to
that installation's active profile.

All selected configurations are validated before database initialization. The
import then uses an immediate transaction to insert only missing configurations
and one `config_imported` history snapshot per inserted profile. Existing rows,
including invalid old rows, are preserved for explicit administrator handling.
Repeating the import does not change their values or timestamps and does not add
duplicate history entries. There is no force/overwrite mode.

History identifies the local operator as `cli:<OS username>`. Console output shows
field names and results, not configuration contents or credentials. Import is never
called by dashboard/bot startup; ordinary migrations only create the schema and
initial profile records.
