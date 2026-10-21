const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS = [
  { version: 1, file: '001InitialSchema.sql' },
  { version: 2, file: '002DiscordRouting.sql' },
  { version: 3, file: '003GuildSnapshots.sql' },
  { version: 4, file: '004AiUsage.sql' },
  { version: 5, file: '005ApplicationLogs.sql' },
];

function migrateDatabase(database) {
  database
    .transaction(() => {
      const currentVersion = database.pragma('user_version', { simple: true });
      const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;

      if (currentVersion > latestVersion) {
        throw new Error(
          'Database schema is newer than this Hellbot checkout. Update the application.'
        );
      }

      for (const migration of MIGRATIONS) {
        if (migration.version <= currentVersion) continue;

        const migrationPath = path.join(__dirname, 'migrations', migration.file);
        database.exec(fs.readFileSync(migrationPath, 'utf8'));
        database.pragma(`user_version = ${migration.version}`);
      }
    })
    .immediate();
}

module.exports = { migrateDatabase };
