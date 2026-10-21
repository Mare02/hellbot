const { z } = require('zod');
const { encryptSecret, decryptSecret } = require('./crypto');

const secretProviders = require('../../data/secretProviders');

const providerSchema = z.union([
  z.enum(secretProviders.map(({ id }) => id)),
  z.string().regex(/^custom_[a-z0-9_-]{2,40}$/),
]);
const actorSchema = z.string().trim().min(1).max(200);
const idSchema = z.coerce.number().int().positive();
const labelSchema = z.string().trim().min(1).max(120);
const valueSchema = z.string().trim().min(1).max(8192).regex(/^\S+$/);
const addSchema = z.strictObject({
  provider: providerSchema,
  label: labelSchema,
  value: valueSchema,
});
const replaceSchema = z
  .strictObject({ label: labelSchema.optional(), value: valueSchema.optional() })
  .refine(
    (input) => input.label !== undefined || input.value !== undefined,
    'Provide a label or key.'
  );
const envPrefixes = Object.fromEntries(secretProviders.map(({ id, envPrefix }) => [id, envPrefix]));

function getEnvSecrets(env) {
  return Object.fromEntries(
    Object.entries(envPrefixes).map(([provider, prefix]) => {
      const numbered = Object.keys(env)
        .filter(
          (name) =>
            name.startsWith(`${prefix}_`) && /^[1-9]\d*$/.test(name.slice(prefix.length + 1))
        )
        .sort(
          (first, second) =>
            Number(first.slice(prefix.length + 1)) - Number(second.slice(prefix.length + 1))
        )
        .map((name) => ({ label: name, value: env[name]?.trim() }))
        .filter((entry) => entry.value);
      const keys = numbered.length
        ? numbered
        : [{ label: prefix, value: env[prefix]?.trim() }].filter((entry) => entry.value);
      return [provider, keys.map((entry) => ({ ...entry, value: valueSchema.parse(entry.value) }))];
    })
  );
}

function metadata(row) {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createSecretStore(database) {
  const find = database.prepare('SELECT * FROM secrets WHERE id = ?');
  const insert = database.prepare(`INSERT INTO secrets
    (provider, label, encrypted_value, nonce, auth_tag, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const history = database.prepare(`INSERT INTO config_history
    (profile_id, action, metadata_json, actor, created_at) VALUES (NULL, ?, ?, ?, ?)`);

  function load(id) {
    const row = find.get(idSchema.parse(id));
    if (!row) throw new Error('API key was not found.');
    providerSchema.parse(row.provider);
    return row;
  }

  function audit(action, row, actor, extra = {}) {
    history.run(
      action,
      JSON.stringify({ provider: row.provider, secretId: row.id, ...extra }),
      actor,
      new Date().toISOString()
    );
  }

  function addKey(input, actor) {
    const { provider, label, value } = addSchema.parse(input);
    const encrypted = encryptSecret(provider, value);
    const timestamp = new Date().toISOString();
    const result = insert.run(
      provider,
      label,
      encrypted.encryptedValue,
      encrypted.nonce,
      encrypted.authTag,
      timestamp,
      timestamp
    );
    const row = load(Number(result.lastInsertRowid));
    audit('secret_added', row, actor);
    return metadata(row);
  }

  return {
    list() {
      return database
        .prepare(
          'SELECT id, provider, label, created_at, updated_at FROM secrets ORDER BY provider, id'
        )
        .all()
        .map(metadata);
    },
    readAll() {
      const values = Object.fromEntries(secretProviders.map(({ id }) => [id, []]));
      for (const row of database.prepare('SELECT * FROM secrets ORDER BY id').all()) {
        const provider = providerSchema.parse(row.provider);
        values[provider] ||= [];
        values[provider].push(decryptSecret(row));
      }
      return values;
    },
    readForEdit(id) {
      const row = load(id);
      return { ...metadata(row), value: decryptSecret(row) };
    },
    readForTest(id) {
      const row = load(id);
      return { provider: row.provider, value: decryptSecret(row) };
    },
    add(input, actor) {
      const identity = actorSchema.parse(actor);
      return database.transaction(() => addKey(input, identity)).immediate();
    },
    replace(id, input, actor) {
      const identity = actorSchema.parse(actor);
      const changes = replaceSchema.parse(input);
      return database
        .transaction(() => {
          const row = load(id);
          const label = changes.label ?? row.label;
          const valueChanged = changes.value !== undefined && changes.value !== decryptSecret(row);
          if (label === row.label && !valueChanged) return metadata(row);
          const encrypted = valueChanged
            ? encryptSecret(row.provider, changes.value)
            : {
                encryptedValue: row.encrypted_value,
                nonce: row.nonce,
                authTag: row.auth_tag,
              };
          database
            .prepare(
              `UPDATE secrets SET label = ?, encrypted_value = ?, nonce = ?, auth_tag = ?, updated_at = ? WHERE id = ?`
            )
            .run(
              label,
              encrypted.encryptedValue,
              encrypted.nonce,
              encrypted.authTag,
              new Date().toISOString(),
              row.id
            );
          const updated = load(row.id);
          audit('secret_replaced', updated, identity, {
            labelChanged: label !== row.label,
            valueChanged,
          });
          return metadata(updated);
        })
        .immediate();
    },
    remove(id, actor) {
      const identity = actorSchema.parse(actor);
      return database
        .transaction(() => {
          const row = load(id);
          database.prepare('DELETE FROM secrets WHERE id = ?').run(row.id);
          audit('secret_cleared', row, identity);
          return metadata(row);
        })
        .immediate();
    },
    recordTest(id, actor, success, expectedSecret) {
      const identity = actorSchema.parse(actor);
      const result = z.boolean().parse(success);
      return database
        .transaction(() => {
          const row = find.get(idSchema.parse(id));
          if (
            !row ||
            (expectedSecret &&
              (row.provider !== expectedSecret.provider ||
                decryptSecret(row) !== expectedSecret.value))
          )
            return false;
          audit('secret_tested', row, identity, { success: result });
          return true;
        })
        .immediate();
    },
    importFromEnv(env, actor) {
      const identity = actorSchema.parse(actor);
      const candidates = getEnvSecrets(env);
      return database
        .transaction(() =>
          Object.entries(candidates).map(([provider, keys]) => {
            if (
              database.prepare('SELECT 1 FROM secrets WHERE provider = ? LIMIT 1').get(provider)
            ) {
              return { provider, status: 'skipped', count: 0 };
            }
            for (const key of keys) addKey({ provider, ...key }, identity);
            return { provider, status: keys.length ? 'imported' : 'empty', count: keys.length };
          })
        )
        .immediate();
    },
  };
}

module.exports = { createSecretStore, getEnvSecrets };
