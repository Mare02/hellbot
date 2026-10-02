# AI server memory

Hellbot exposes `search_memory`, `save_memory`, `update_memory`, and `forget_memory` to the existing AI tool loop. For every genuine information-seeking question, the prompt requires `search_memory` followed by `get_chat_context`, even if the memory search returns no notes or already found relevant notes. Greetings, banter, statements, and obvious rhetorical questions skip both read tools. Saved notes are added to the conversation only when a tool call returns them. The model interprets natural requests such as “remember that game night is Friday” or “forget the old game night schedule.” There are no additional Discord commands.

Memory is available in mentions, replies to Hellbot, and `askai` (including its slash command). Random `freewill` participation and scheduled jobs do not receive memory tools. Direct messages do not receive memory tools.

## Storage

Each guild has a Markdown file at `<memory-root>/<guild-id>/memory.md`. The default root is `~/.local/share/hellbot/memory`, resolved from the operating system account running the bot. Set `HELLBOT_MEMORY_DIR` to override it, for example for development.

On the production VPS, the home server's file is:

```
/home/hellbot/.local/share/hellbot/memory/720011764934115400/memory.md
```

The empty file contains `# Hellbot memories` followed by a blank line. Other guild files are created on their first successful save. Files stay outside the Git checkout so deployments do not replace them. Include this directory in the VPS backup procedure. Creating storage does not deploy the feature; the code on `feature/ai-memory` must be deployed and the bot restarted for the tools to become available.

Each entry has a UUID heading, structured metadata, and the original memory text. The metadata gives the AI an explicit category instead of making it infer what an unstructured paragraph represents:

```markdown
# Hellbot memories

## 7d402aae-f97c-49c9-9f47-18cccf1936b8
<!-- metadata: {"kind":"task","status":"open","channelId":"1324427229790343303","authorId":"652993719808557087","messageId":"1555305254675812485","createdAt":"2026-10-01T19:47:50.519Z","updatedAt":"2026-10-01T19:47:50.519Z"} -->

add technical self awareness to ai service
```

`kind` is one of `task`, `fact`, `preference`, `instruction`, or `note`. Tasks also have a `status`: `open`, `done`, or `cancelled`. Other categories have no status. Memory text stays close to what the user said; the category and task state live in metadata and are returned alongside the text to the AI. Metadata also records the source channel, author, source Discord message or interaction ID, and timestamps. Corrections retain the creator and record `updatedBy`, while moving the source channel and event ID to the correction request.

Every entry must contain a valid `kind`; task entries must also have a valid status. There is no legacy or unclassified-entry fallback. Start with an empty memory file when enabling this format, then let Hellbot write categorized entries. Preserve headings, metadata comments, and blank lines if editing files manually; malformed files are rejected instead of overwritten.

## Access and behavior

The configured bot owner, members with Manage Server, and members with configured staff/admin/moderator roles can save, correct, or forget memories. The `unlocked` role alone does not grant memory edits. Other members get search only. Guild, user, channel, and event IDs are bound by the application, never chosen by the model.

Notes saved in channels readable by `@everyone` may be recalled across that guild. Notes in restricted channels and all threads are recalled only in their source channel/thread. Both the requester and bot must be able to view and read the source history. Private threads also require membership or Manage Threads. A correction adopts the current channel's visibility, preventing private corrections from retaining a public source.

When memory tools are available, the prompt tells the AI to make two separate, sequential read calls for every genuine information-seeking question: first `search_memory`, then `get_chat_context`, regardless of whether the memory search returned relevant notes. This ordering is prompt-guided, not hard-blocked by the application. For task-list questions, it searches with kind `task`, status `open`, an empty query, and limit 10. For questions asking what has been remembered or saved, it searches with an empty query to list recent accessible notes. The AI skips greetings, acknowledgements, conversational banter, statements, and obvious rhetorical questions. It saves only when the user explicitly asks to remember, save, store, track, or add information to a list for future use (or uses clearly equivalent wording). A request for help, a tutorial, advice, or planning—and a statement such as "I will do it later"—does not trigger saving or task creation. Future work is classified as a task only after an explicit save request. If explicitly requested content depends on earlier conversation, it uses `get_chat_context` to resolve the reference before saving; it asks only if the context remains ambiguous. It confirms only after a successful tool result. Relevant saved preferences and instructions can guide future replies, while system/developer rules, permissions, safety rules, and newer explicit requests take precedence. The application enforces roles and source visibility independently of the model's instructions. Both read calls are still model-triggered; the model may fail to call them, and no memory is read or sent to the model unless it makes the corresponding tool call.

## Limits

- Search uses Unicode word matching, not embeddings or semantic similarity. A short query containing the important names/terms works best. An empty query returns the most recently updated accessible entries.
- Task searches filter by category and task status; task listings use `kind=task`, `status=open`, and an empty query.
- A search returns up to 10 entries (5 by default).
- Each entry contains at most 2,000 characters; each guild file holds at most 500 entries and 1 MiB.
- Identical notes in the same channel are deduplicated after case/whitespace normalization.
- Saving an identical closed task again reopens it and records the new save event.
- Writes use temporary files and atomic replacement. Mutations are serialized within one bot process; run only one writer process per memory directory. Direct manual edits should be made while that writer is stopped.
- Guild memory directories are `0700`; memory files are `0600`. No additional package or database service is required.
