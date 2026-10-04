const fs = require('node:fs/promises');
const { constants: fsConstants } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { isDevMode } = require('../utils/config');

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ENTRIES = 500;
const HEADER = '# Hellbot memories\n\n';
const MEMORY_KINDS = new Set(['task', 'fact', 'preference', 'instruction', 'note']);
const TASK_STATUSES = new Set(['open', 'done', 'cancelled']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mutationQueues = new Map();

function validateDiscordId(value, name) {
  if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)) {
    throw new Error(`${name} must be a Discord ID containing 17 to 20 digits.`);
  }
  return value;
}

function validateMemoryId(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new Error('Memory ID must be a UUID.');
  }
}

function validateContent(content) {
  if (typeof content !== 'string' || !content.trim() || content.length > 2000) {
    throw new Error('Memory content must contain 1 to 2000 characters.');
  }
  const trimmedContent = content.trim();
  if (/^##\s/m.test(trimmedContent) || /<!--\s*metadata\s*:/i.test(trimmedContent)) {
    throw new Error('Memory content contains a reserved Markdown delimiter.');
  }
  return trimmedContent;
}

function getMemoryPaths(guildId) {
  validateDiscordId(guildId, 'guildId');
  const root = process.env.HELLBOT_MEMORY_DIR || path.join(os.homedir(), '.local/share/hellbot/memory');
  return {
    root,
    filePath: path.join(root, isDevMode ? 'dev' : 'prod', guildId, 'memory.md'),
  };
}

function getMemoryFilePath(guildId) {
  return getMemoryPaths(guildId).filePath;
}

async function assertNotSymlink(targetPath, label) {
  try {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function assertDirectory(targetPath, label) {
  const stat = await fs.lstat(targetPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular directory.`);
  }
}

function validateEntry(entry) {
  validateMemoryId(entry.id);
  validateContent(entry.content);
  if (!MEMORY_KINDS.has(entry.kind)) {
    throw new Error('Invalid memory kind.');
  }
  if (entry.status != null && !TASK_STATUSES.has(entry.status)) {
    throw new Error('Invalid memory status.');
  }
  if (entry.kind === 'task' && entry.status == null) {
    throw new Error('Tasks must have a status.');
  }
  if (entry.kind !== 'task' && entry.status != null) {
    throw new Error('Only tasks may have a status.');
  }
  for (const key of ['channelId', 'authorId', 'messageId']) {
    validateDiscordId(entry[key], key);
  }
  if (entry.updatedBy !== undefined) {
    validateDiscordId(entry.updatedBy, 'updatedBy');
  }
  for (const key of ['createdAt', 'updatedAt']) {
    if (typeof entry[key] !== 'string' || !Number.isFinite(Date.parse(entry[key]))) {
      throw new Error(`Invalid memory ${key}.`);
    }
  }
}

function parseMemories(text) {
  if (!text.startsWith(HEADER)) {
    throw new Error('Invalid Markdown header.');
  }
  const body = text.slice(HEADER.length);
  if (!body) return [];
  const sections = body.split(/^## /m);
  if (sections.shift() !== '' || sections.length > MAX_ENTRIES) {
    throw new Error('Invalid memory sections or entry limit exceeded.');
  }
  const seenIds = new Set();
  return sections.map((section) => {
    const match = section.match(/^([^\n]+)\n<!-- metadata: (.+) -->\n\n([\s\S]+)\n\n$/);
    if (!match) throw new Error('Invalid memory section.');
    const metadata = JSON.parse(match[2]);
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('Invalid memory metadata.');
    }
    const entry = {
      id: match[1],
      content: match[3],
      kind: metadata.kind,
      status: metadata.status ?? null,
      channelId: metadata.channelId,
      authorId: metadata.authorId,
      messageId: metadata.messageId,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    };
    if (metadata.updatedBy !== undefined) entry.updatedBy = metadata.updatedBy;
    validateEntry(entry);
    if (seenIds.has(entry.id.toLowerCase())) throw new Error('Duplicate memory ID.');
    seenIds.add(entry.id.toLowerCase());
    return entry;
  });
}

async function readMemories(filePath, root) {
  let handle;
  try {
    const guildDirectory = path.dirname(filePath);
    const memoryRoot = path.dirname(guildDirectory);
    await assertNotSymlink(root, 'Memory base directory');
    await assertNotSymlink(memoryRoot, 'Memory root');
    await assertNotSymlink(guildDirectory, 'Guild memory directory');
    await assertNotSymlink(filePath, 'Memory file');
    handle = await fs.open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
      throw new Error('Memory file is not a regular file or exceeds 1 MB.');
    }
    const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_FILE_BYTES) throw new Error('Memory file exceeds 1 MB.');
    return parseMemories(buffer.subarray(0, length).toString('utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`Cannot read memory file: ${error.message}`, { cause: error });
  } finally {
    if (handle) await handle.close();
  }
}

async function writeMemories(filePath, entries, root) {
  if (entries.length > MAX_ENTRIES) throw new Error('Memory entry limit of 500 reached.');
  const text = HEADER + entries.map(({ id, content, kind, status, ...metadata }) => {
    if (kind !== null && kind !== undefined) metadata.kind = kind;
    if (status !== null && status !== undefined) metadata.status = status;
    return `## ${id}\n<!-- metadata: ${JSON.stringify(metadata)} -->\n\n${content}\n\n`;
  }).join('');
  if (Buffer.byteLength(text) > MAX_FILE_BYTES) throw new Error('Memory file exceeds 1 MB.');
  const directory = path.dirname(filePath);
  const memoryRoot = path.dirname(directory);
  await assertNotSymlink(root, 'Memory base directory');
  await assertNotSymlink(memoryRoot, 'Memory root');
  await assertNotSymlink(directory, 'Guild memory directory');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await assertDirectory(root, 'Memory base directory');
  await assertDirectory(memoryRoot, 'Memory root');
  await assertDirectory(directory, 'Guild memory directory');
  await assertNotSymlink(filePath, 'Memory file');
  await fs.chmod(directory, 0o700);
  const tempPath = path.join(directory, `.memory-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tempPath, text, { flag: 'wx', mode: 0o600 });
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

function mutateMemories(guildId, mutation) {
  const { filePath, root } = getMemoryPaths(guildId);
  const previous = mutationQueues.get(filePath) || Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    const entries = await readMemories(filePath, root);
    const { result, changed } = mutation(entries);
    if (changed) await writeMemories(filePath, entries, root);
    return result;
  });
  mutationQueues.set(filePath, operation);
  operation.finally(() => {
    if (mutationQueues.get(filePath) === operation) mutationQueues.delete(filePath);
  }).catch(() => {});
  return operation;
}

function normalize(content) {
  return content.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

async function searchMemories(guildId, { query = '', limit = 5, kind, status, allowedChannelIds } = {}) {
  const { filePath, root } = getMemoryPaths(guildId);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('Memory search limit must be between 1 and 10.');
  }
  if (typeof query !== 'string' || query.length > 2000) {
    throw new Error('Memory search query must be a string of at most 2000 characters.');
  }
  if (kind !== undefined && !MEMORY_KINDS.has(kind)) throw new Error('Invalid memory kind filter.');
  if (status !== undefined && !TASK_STATUSES.has(status)) throw new Error('Invalid memory status filter.');
  if (!allowedChannelIds) return [];
  if (!Array.isArray(allowedChannelIds)) throw new Error('allowedChannelIds must be an array.');
  const allowed = new Set(allowedChannelIds.map((id) => validateDiscordId(id, 'allowedChannelId')));
  if (!allowed.size) return [];
  const terms = [...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) || [])];
  const entries = await readMemories(filePath, root);
  const scoredEntries = entries.filter((entry) => allowed.has(entry.channelId)).map((entry) => {
    const words = new Set(normalize(entry.content).match(/[\p{L}\p{N}]+/gu) || []);
    return { entry, score: terms.filter((term) => words.has(term)).length };
  });
  const newestFirst = (a, b) => Date.parse(b.entry.updatedAt) - Date.parse(a.entry.updatedAt);

  return scoredEntries.filter(({ entry, score }) => {
    const matchesKind = kind === undefined || entry.kind === kind;
    const matchesStatus = status === undefined || (entry.kind === 'task' && entry.status === status);
    return matchesKind && matchesStatus && (!terms.length || score > 0);
  }).sort((a, b) => b.score - a.score || newestFirst(a, b))
    .slice(0, limit).map(({ entry }) => entry);
}

function saveMemory(guildId, { content, kind = 'note', channelId, authorId, messageId }) {
  const validatedContent = validateContent(content);
  if (!MEMORY_KINDS.has(kind)) throw new Error('Invalid memory kind.');
  validateDiscordId(channelId, 'channelId');
  validateDiscordId(authorId, 'authorId');
  validateDiscordId(messageId, 'messageId');
  return mutateMemories(guildId, (entries) => {
    const existing = entries.find((entry) => entry.channelId === channelId
      && entry.kind === kind && normalize(entry.content) === normalize(validatedContent));
    if (existing) {
      if (kind === 'task' && existing.status !== 'open') {
        Object.assign(existing, {
          status: 'open',
          messageId,
          updatedBy: authorId,
          updatedAt: new Date().toISOString(),
        });
        return { result: existing, changed: true };
      }
      return { result: existing, changed: false };
    }
    const now = new Date().toISOString();
    const entry = {
      id: randomUUID(), content: validatedContent, kind,
      ...(kind === 'task' ? { status: 'open' } : {}),
      channelId, authorId, messageId, createdAt: now, updatedAt: now,
    };
    entries.push(entry);
    return { result: entry, changed: true };
  });
}

function updateMemory(guildId, { id, content, kind, status, authorId, channelId, messageId, allowedChannelIds }) {
  validateMemoryId(id);
  const validatedContent = content === undefined ? undefined : validateContent(content);
  if (kind !== undefined && !MEMORY_KINDS.has(kind)) throw new Error('Invalid memory kind.');
  if (status !== undefined && !TASK_STATUSES.has(status)) throw new Error('Invalid memory status.');
  if (validatedContent === undefined && kind === undefined && status === undefined) {
    throw new Error('Provide content, kind, or status to update.');
  }
  validateDiscordId(authorId, 'authorId');
  validateDiscordId(channelId, 'channelId');
  validateDiscordId(messageId, 'messageId');
  if (!Array.isArray(allowedChannelIds) || !allowedChannelIds.length) {
    throw new Error('At least one readable source channel is required.');
  }
  const allowed = new Set(allowedChannelIds.map((channelId) => validateDiscordId(channelId, 'allowedChannelId')));
  return mutateMemories(guildId, (entries) => {
    const entry = entries.find((item) => item.id.toLowerCase() === id.toLowerCase());
    if (!entry) throw new Error('Memory not found.');
    if (!allowed.has(entry.channelId)) return { result: null, changed: false };
    const nextKind = kind === undefined ? entry.kind : kind;
    const nextStatus = status === undefined
      ? (kind === 'task' && entry.kind !== 'task'
        ? 'open'
        : (kind !== undefined && kind !== 'task' ? null : entry.status))
      : status;
    if (nextKind === 'task' && nextStatus == null) throw new Error('Tasks must have a status.');
    if (nextKind !== 'task' && nextStatus != null) throw new Error('Only tasks may have a status.');
    Object.assign(entry, {
      ...(validatedContent !== undefined ? { content: validatedContent } : {}),
      kind: nextKind,
      status: nextStatus,
      channelId,
      messageId,
      updatedBy: authorId,
      updatedAt: new Date().toISOString(),
    });
    return { result: entry, changed: true };
  });
}

function deleteMemory(guildId, { id, allowedChannelIds }) {
  validateMemoryId(id);
  if (!Array.isArray(allowedChannelIds) || !allowedChannelIds.length) {
    throw new Error('At least one readable source channel is required.');
  }
  const allowed = new Set(allowedChannelIds.map((channelId) => validateDiscordId(channelId, 'allowedChannelId')));
  return mutateMemories(guildId, (entries) => {
    const index = entries.findIndex((entry) => entry.id.toLowerCase() === id.toLowerCase());
    if (index === -1) throw new Error('Memory not found.');
    if (!allowed.has(entries[index].channelId)) return { result: null, changed: false };
    const [entry] = entries.splice(index, 1);
    return { result: entry, changed: true };
  });
}

module.exports = { searchMemories, saveMemory, updateMemory, deleteMemory, getMemoryFilePath };
