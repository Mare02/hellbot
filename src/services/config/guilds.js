const { profileEnvSchema } = require('./schema');

function createGuildStore(database) {
  const findSnapshot = database.prepare(`
    SELECT g.guilds_json, g.synced_at FROM profile_guilds g
    JOIN profiles p ON p.id = g.profile_id WHERE p.env = ?
  `);
  const saveSnapshot = database.prepare(`
    INSERT INTO profile_guilds (profile_id, guilds_json, synced_at)
    SELECT id, ?, ? FROM profiles WHERE env = ?
    ON CONFLICT(profile_id) DO UPDATE SET
      guilds_json = excluded.guilds_json, synced_at = excluded.synced_at
  `);

  function read(env) {
    const row = findSnapshot.get(profileEnvSchema.parse(env));
    return row ? { guilds: JSON.parse(row.guilds_json), syncedAt: row.synced_at } : null;
  }

  return {
    read,
    save(env, guilds) {
      const profile = profileEnvSchema.parse(env);
      const timestamp = new Date().toISOString();
      if (!saveSnapshot.run(JSON.stringify(guilds), timestamp, profile).changes) {
        throw new Error('The bot profile was not found.');
      }
      return { guilds, syncedAt: timestamp };
    },
  };
}

module.exports = { createGuildStore };
