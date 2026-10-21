-- Preserve existing profile values; import only newly editable Discord routing fields.
CREATE TEMP TABLE discord_routing_backfill AS
SELECT profile_id, config_json AS previous_json,
  json_insert(config_json,
    '$.homeServerId', '720011764934115400',
    '$.testingServerId', '1324427229278503043',
    '$.logChannelId', '732790467615391846',
    '$.verifyChannelId', '830224625350344724',
    '$.generalChannelId', '720011765672444007',
    '$.hellbotUpdatesChannelId', '1561754267457687643',
    '$.masterCreationsChannelId', '858872397935018024',
    '$.uniqueCreationsChannelId', '1331702240964116551',
    '$.masterPhotosChannelId', '1275913045981397105',
    '$.minecraftCategoryId', '1402414837669040140',
    '$.staffMemberRoleId', '943531442368041010',
    '$.verifiedRoleId', '1051882112057348146',
    '$.verificationLogsChannelId', '1331713982687350834'
  ) AS next_json
FROM profile_configs
WHERE json_type(config_json, '$.homeServerId') IS NULL
  OR json_type(config_json, '$.testingServerId') IS NULL
  OR json_type(config_json, '$.logChannelId') IS NULL
  OR json_type(config_json, '$.verifyChannelId') IS NULL
  OR json_type(config_json, '$.generalChannelId') IS NULL
  OR json_type(config_json, '$.hellbotUpdatesChannelId') IS NULL
  OR json_type(config_json, '$.masterCreationsChannelId') IS NULL
  OR json_type(config_json, '$.uniqueCreationsChannelId') IS NULL
  OR json_type(config_json, '$.masterPhotosChannelId') IS NULL
  OR json_type(config_json, '$.minecraftCategoryId') IS NULL
  OR json_type(config_json, '$.staffMemberRoleId') IS NULL
  OR json_type(config_json, '$.verifiedRoleId') IS NULL
  OR json_type(config_json, '$.verificationLogsChannelId') IS NULL;

INSERT INTO config_history
  (profile_id, action, changed_paths_json, config_snapshot_json, actor)
SELECT profile_id, 'config_migrated',
  (SELECT json_group_array(next.key) FROM json_each(next_json) AS next
   WHERE json_type(previous_json, '$.' || next.key) IS NULL),
  next_json, 'migration:002DiscordRouting'
FROM discord_routing_backfill WHERE next_json != previous_json;

UPDATE profile_configs
SET config_json = (SELECT next_json FROM discord_routing_backfill WHERE profile_id = profile_configs.profile_id),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE profile_id IN (SELECT profile_id FROM discord_routing_backfill WHERE next_json != previous_json);

DROP TABLE discord_routing_backfill;
