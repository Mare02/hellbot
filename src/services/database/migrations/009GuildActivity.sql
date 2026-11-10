CREATE TABLE guild_activity (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL CHECK (
    length(guild_id) BETWEEN 17 AND 20 AND guild_id NOT GLOB '*[^0-9]*'
  ),
  last_interaction_at TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (length(interaction_type) BETWEEN 1 AND 40),
  PRIMARY KEY (profile_id, guild_id)
);

CREATE INDEX guild_activity_profile_time_idx
  ON guild_activity(profile_id, last_interaction_at DESC);
