CREATE TEMP TABLE logout_message_removal AS
SELECT profile_id,
  config_json AS previous_json,
  json_remove(config_json, '$.behavior.logoutMessage') AS next_json
FROM profile_configs
WHERE json_type(config_json, '$.behavior.logoutMessage') IS NOT NULL;

INSERT INTO config_history
  (profile_id, action, changed_paths_json, config_snapshot_json, actor)
SELECT profile_id, 'config_migrated',
  '["behavior.logoutMessage"]', next_json, 'migration:008RemoveLogoutMessage'
FROM logout_message_removal;

UPDATE profile_configs
SET config_json = (
      SELECT next_json FROM logout_message_removal
      WHERE profile_id = profile_configs.profile_id
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE profile_id IN (SELECT profile_id FROM logout_message_removal);

DROP TABLE logout_message_removal;
