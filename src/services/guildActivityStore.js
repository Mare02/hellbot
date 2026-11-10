const { profileEnvSchema } = require('./config/schema');

const guildIdSchema = (value) => {
  if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)) {
    throw new Error('Guild ID must be a Discord ID containing 17 to 20 digits.');
  }
  return value;
};

const interactionTypeSchema = (value) => {
  if (typeof value !== 'string' || !/^[a-z][a-zA-Z]{0,39}$/.test(value)) {
    throw new Error('Guild interaction type is invalid.');
  }
  return value;
};

function createGuildActivityStore(database) {
  const upsert = database.prepare(`
    INSERT INTO guild_activity (profile_id, guild_id, last_interaction_at, interaction_type)
    SELECT id, @guildId, @lastInteractionAt, @interactionType
    FROM profiles WHERE env = @profile
    ON CONFLICT(profile_id, guild_id) DO UPDATE SET
      last_interaction_at = excluded.last_interaction_at,
      interaction_type = excluded.interaction_type
  `);
  const findByProfile = database.prepare(`
    SELECT a.guild_id AS guildId,
      a.last_interaction_at AS lastInteractionAt,
      a.interaction_type AS lastInteractionType
    FROM guild_activity a
    JOIN profiles p ON p.id = a.profile_id
    WHERE p.env = ?
    ORDER BY a.last_interaction_at DESC
  `);

  return {
    record(profile, guildId, interactionType) {
      const result = upsert.run({
        profile: profileEnvSchema.parse(profile),
        guildId: guildIdSchema(guildId),
        lastInteractionAt: new Date().toISOString(),
        interactionType: interactionTypeSchema(interactionType),
      });
      if (!result.changes) throw new Error('The bot profile was not found.');
    },
    list(profile) {
      return findByProfile.all(profileEnvSchema.parse(profile));
    },
  };
}

module.exports = { createGuildActivityStore };
