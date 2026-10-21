-- Convert the verified production anchor; never guess the ID of another named role.
-- Refuse unmapped enabled production configurations rather than silently changing role placement.
CREATE TEMP TABLE role_request_anchor_backfill (
  profile_id INTEGER PRIMARY KEY,
  env TEXT NOT NULL,
  previous_json TEXT NOT NULL,
  next_json TEXT NOT NULL,
  CHECK (
    env != 'prod'
    OR COALESCE(json_extract(next_json, '$.features.roleRequests'), 1) = 0
    OR json_type(next_json, '$.roleRequests.anchorRoleId') = 'text'
  )
);

INSERT INTO role_request_anchor_backfill (profile_id, env, previous_json, next_json)
SELECT pc.profile_id, p.env, pc.config_json,
  json_set(
    json_remove(pc.config_json, '$.roleRequests.anchorRoleName'),
    '$.roleRequests.anchorRoleId',
    CASE
      WHEN json_type(pc.config_json, '$.roleRequests.anchorRoleId') = 'text'
        THEN json_extract(pc.config_json, '$.roleRequests.anchorRoleId')
      WHEN p.env = 'prod'
        AND json_extract(pc.config_json, '$.homeServerId') = '720011764934115400'
        AND json_extract(pc.config_json, '$.roleRequests.anchorRoleName') = 'God Modder'
        THEN '1553854743384957010'
      ELSE NULL
    END
  )
FROM profile_configs pc JOIN profiles p ON p.id = pc.profile_id
WHERE json_type(pc.config_json, '$.roleRequests.anchorRoleName') IS NOT NULL
   OR json_type(pc.config_json, '$.roleRequests.anchorRoleId') IS NULL;

INSERT INTO config_history
  (profile_id, action, changed_paths_json, config_snapshot_json, actor)
SELECT profile_id, 'config_migrated',
  '["roleRequests.anchorRoleName","roleRequests.anchorRoleId"]',
  next_json, 'migration:006RoleRequestAnchorId'
FROM role_request_anchor_backfill;

UPDATE profile_configs
SET config_json = (SELECT next_json FROM role_request_anchor_backfill WHERE profile_id = profile_configs.profile_id),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE profile_id IN (SELECT profile_id FROM role_request_anchor_backfill);

DROP TABLE role_request_anchor_backfill;
