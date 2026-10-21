const { z } = require('zod');
const { profileEnvSchema, profileConfigSchema } = require('./schema');

function importLegacyConfigs(database, configs, actor) {
  const validatedActor = z.string().trim().min(1).max(200).parse(actor);
  const entries = Object.entries(configs).map(([env, config]) => ({
    env: profileEnvSchema.parse(env),
    config: profileConfigSchema.parse(config),
  }));

  return database
    .transaction(() => {
      const findProfile = database.prepare('SELECT id FROM profiles WHERE env = ?');
      const findConfig = database.prepare('SELECT 1 FROM profile_configs WHERE profile_id = ?');
      const insertConfig = database.prepare(`
      INSERT INTO profile_configs (profile_id, config_json, updated_at) VALUES (?, ?, ?)
    `);
      const insertHistory = database.prepare(`
      INSERT INTO config_history
        (profile_id, action, changed_paths_json, config_snapshot_json, actor, created_at)
      VALUES (?, 'config_imported', ?, ?, ?, ?)
    `);
      const timestamp = new Date().toISOString();

      return entries.map(({ env, config }) => {
        const profile = findProfile.get(env);
        if (!profile) throw new Error('Required database profile is missing.');
        if (findConfig.get(profile.id)) return { env, status: 'skipped' };

        const snapshot = JSON.stringify(config);
        insertConfig.run(profile.id, snapshot, timestamp);
        insertHistory.run(
          profile.id,
          JSON.stringify(Object.keys(config)),
          snapshot,
          validatedActor,
          timestamp
        );

        return { env, status: 'imported' };
      });
    })
    .immediate();
}

module.exports = { importLegacyConfigs };
