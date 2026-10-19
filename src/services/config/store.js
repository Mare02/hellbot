const { z } = require('zod');
const { profileEnvSchema, parseProfileConfig } = require('./schema');

const actorSchema = z.string().trim().min(1).max(200);
const historyFiltersSchema = z.strictObject({
  env: z.enum(['dev', 'prod', 'shared']).optional(),
  action: z.string().max(100).optional(),
  actor: z.string().max(200).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  includeShared: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidPatch(message) {
  return new z.ZodError([{ code: 'custom', path: [], message }]);
}

function mergePatch(current, patch) {
  if (!isObject(patch) || ![Object.prototype, null].includes(Object.getPrototypeOf(patch))) {
    throw invalidPatch('Configuration changes must be plain objects.');
  }
  const merged = { ...current };
  for (const key of Object.keys(patch)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !Object.hasOwn(current, key)) {
      throw invalidPatch('Unknown configuration field.');
    }
    if (isObject(current[key])) {
      merged[key] = mergePatch(current[key], patch[key]);
    } else {
      merged[key] = patch[key];
    }
  }
  return merged;
}

function changedValues(before, after, prefix = '') {
  const changes = [];
  for (const key of Object.keys(after)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isObject(after[key])) {
      changes.push(...changedValues(isObject(before?.[key]) ? before[key] : {}, after[key], path));
    } else if (before?.[key] !== after[key]) {
      changes.push({ path, before: before?.[key] ?? null, after: after[key] });
    }
  }
  return changes;
}

function historyEvent(row) {
  return {
    id: row.id,
    env: row.env || 'shared',
    profileName: row.profile_name || null,
    action: row.action,
    changedPaths: row.changed_paths_json ? JSON.parse(row.changed_paths_json) : [],
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    actor: row.actor,
    createdAt: row.created_at,
  };
}

function createConfigStore(database) {
  const findConfig = database.prepare(`
    SELECT p.id AS profile_id, pc.config_json FROM profiles p
    LEFT JOIN profile_configs pc ON pc.profile_id = p.id WHERE p.env = ?
  `);

  function load(env) {
    const profileEnv = profileEnvSchema.parse(env);
    const row = findConfig.get(profileEnv);
    if (!row?.config_json)
      throw new Error('Profile configuration is missing. Run the explicit configuration import.');
    return {
      profileId: row.profile_id,
      config: parseProfileConfig(profileEnv, JSON.parse(row.config_json)),
    };
  }

  return {
    updateProfileImageUrl(env, imageUrl) {
      const profile = profileEnvSchema.parse(env);
      const url = z
        .string()
        .url()
        .refine((value) => {
          const parsed = new URL(value);
          return (
            parsed.protocol === 'https:' &&
            ['cdn.discordapp.com', 'media.discordapp.net'].includes(parsed.hostname)
          );
        }, 'Expected a Discord CDN image URL.')
        .nullable()
        .parse(imageUrl);
      return (
        database
          .prepare(
            `UPDATE profiles SET profile_image_url = ?, updated_at = ?
           WHERE env = ? AND profile_image_url IS NOT ?`
          )
          .run(url, new Date().toISOString(), profile, url).changes > 0
      );
    },
    listProfiles() {
      return database
        .prepare(
          `SELECT id, env, name, profile_image_url AS profileImageUrl,
        created_at AS createdAt, updated_at AS updatedAt FROM profiles ORDER BY id`
        )
        .all();
    },
    read(env) {
      return load(env).config;
    },
    patch(env, partial, actor) {
      const identity = actorSchema.parse(actor);
      return database
        .transaction(() => {
          const { profileId, config: before } = load(env);
          const config = parseProfileConfig(env, mergePatch(before, partial));
          const changedPaths = changedValues(before, config).map((change) => change.path);
          if (!changedPaths.length) return { config, changedPaths, changed: false };
          const timestamp = new Date().toISOString();
          const snapshot = JSON.stringify(config);
          database
            .prepare(
              'UPDATE profile_configs SET config_json = ?, updated_at = ? WHERE profile_id = ?'
            )
            .run(snapshot, timestamp, profileId);
          database
            .prepare(
              `INSERT INTO config_history
          (profile_id, action, changed_paths_json, config_snapshot_json, actor, created_at)
          VALUES (?, 'config_updated', ?, ?, ?, ?)`
            )
            .run(profileId, JSON.stringify(changedPaths), snapshot, identity, timestamp);
          return { config, changedPaths, changed: true };
        })
        .immediate();
    },
    listHistory(input = {}) {
      const filters = historyFiltersSchema.parse(input);
      const conditions = [];
      const params = [];
      if (filters.env === 'shared') conditions.push('h.profile_id IS NULL');
      else if (filters.env) {
        conditions.push(filters.includeShared ? '(p.env = ? OR h.profile_id IS NULL)' : 'p.env = ?');
        params.push(filters.env);
      }
      for (const [key, column, operator] of [
        ['action', 'h.action', '='],
        ['actor', 'h.actor', '='],
        ['from', 'h.created_at', '>='],
        ['to', 'h.created_at', '<='],
      ]) {
        if (filters[key]) {
          conditions.push(`${column} ${operator} ?`);
          params.push(filters[key]);
        }
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const join = 'FROM config_history h LEFT JOIN profiles p ON p.id = h.profile_id';
      const total = database
        .prepare(`SELECT count(*) AS total ${join} ${where}`)
        .get(...params).total;
      const rows = database
        .prepare(
          `SELECT h.*, p.env, p.name AS profile_name ${join} ${where}
        ORDER BY h.created_at DESC, h.id DESC LIMIT ? OFFSET ?`
        )
        .all(...params, filters.pageSize, (filters.page - 1) * filters.pageSize);
      return {
        items: rows.map(historyEvent),
        total,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    },
    historyDetail(id) {
      const historyId = z.coerce.number().int().positive().parse(id);
      const row = database
        .prepare(
          `SELECT h.*, p.env, p.name AS profile_name
        FROM config_history h LEFT JOIN profiles p ON p.id = h.profile_id WHERE h.id = ?`
        )
        .get(historyId);
      if (!row) return null;
      let changes = [];
      if (row.config_snapshot_json) {
        const previous = database
          .prepare(
            `SELECT config_snapshot_json FROM config_history
          WHERE profile_id = ? AND id < ? AND config_snapshot_json IS NOT NULL ORDER BY id DESC LIMIT 1`
          )
          .get(row.profile_id, row.id);
        const before = previous
          ? parseProfileConfig(row.env, JSON.parse(previous.config_snapshot_json))
          : {};
        const after = parseProfileConfig(row.env, JSON.parse(row.config_snapshot_json));
        changes = changedValues(before, after);
      }
      return { event: historyEvent(row), changes };
    },
  };
}

module.exports = { createConfigStore };
