const { z } = require('zod');
const { profileEnvSchema } = require('../config/schema');

const releaseSchema = z.strictObject({
  profile: profileEnvSchema,
  sha: z.string().regex(/^[a-f0-9]{40}$/),
  runId: z.string().regex(/^[1-9]\d*$/).nullable().default(null),
  attempt: z.coerce.number().int().positive().default(1),
});

function readRelease(database, profile) {
  return database.prepare(`
    SELECT sha, run_id AS runId, run_attempt AS attempt, verified_at AS verifiedAt
    FROM deployment_release WHERE profile = ?
  `).get(profileEnvSchema.parse(profile)) || null;
}

function recordRelease(database, input) {
  const release = releaseSchema.parse(input);
  const verifiedAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO deployment_release (profile, sha, run_id, run_attempt, verified_at)
    VALUES (@profile, @sha, @runId, @attempt, @verifiedAt)
    ON CONFLICT(profile) DO UPDATE SET
      sha = excluded.sha,
      run_id = excluded.run_id,
      run_attempt = excluded.run_attempt,
      verified_at = excluded.verified_at
  `).run({ ...release, verifiedAt });
  return readRelease(database, release.profile);
}

module.exports = { readRelease, recordRelease };
