require('dotenv').config();
const os = require('node:os');
const { parseArgs } = require('node:util');
const { initializeDatabase } = require('../src/services/database');
const { createSecretStore, getEnvSecrets } = require('../src/services/config/secrets');

function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (values.apply && values['dry-run']) throw new Error('Use either --apply or --dry-run.');
  if (!values.apply) {
    for (const [provider, keys] of Object.entries(getEnvSecrets(process.env))) {
      console.log(`${provider}: ${keys.length} environment keys available.`);
    }
    console.log(
      'Dry run: no database was opened or changed. Use --apply to import providers without stored keys.'
    );
    return;
  }
  const database = initializeDatabase();
  try {
    const actor = `cli:${os.userInfo().username}`;
    for (const result of createSecretStore(database).importFromEnv(process.env, actor)) {
      console.log(`${result.provider}: ${result.status}; ${result.count} keys imported.`);
    }
  } finally {
    database.close();
  }
}

try {
  main();
} catch (error) {
  if (error.name === 'ZodError') {
    console.error('Secret import failed validation. No keys were imported.');
  } else if (error.code?.startsWith('SQLITE_')) {
    console.error('Secret import failed while accessing the database. No keys were imported.');
  } else {
    console.error(`Secret import failed: ${error.message}`);
  }
  process.exitCode = 1;
}
