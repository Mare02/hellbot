require('dotenv').config();
const os = require('node:os');
const { parseArgs } = require('node:util');
const { createInitialConfig } = require('../src/services/config/defaults');
const { profileEnvSchema } = require('../src/services/config/schema');
const { importLegacyConfigs } = require('../src/services/config/importLegacyConfig');
const { initializeDatabase } = require('../src/services/database');

function main() {
  const { values } = parseArgs({
    options: {
      profile: { type: 'string' },
      apply: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (values.apply && values['dry-run']) {
    throw new Error('Use either --apply or --dry-run.');
  }
  if (values.profile !== 'all' && !profileEnvSchema.safeParse(values.profile).success) {
    throw new Error('Provide --profile dev, --profile prod, or --profile all.');
  }

  const profiles = values.profile === 'all' ? ['dev', 'prod'] : [values.profile];
  const configs = Object.fromEntries(
    profiles.map((env) => [env, createInitialConfig(env, process.env)])
  );

  if (!values.apply) {
    for (const [env, config] of Object.entries(configs)) {
      console.log(`${env}: validated fields: ${Object.keys(config).join(', ')}.`);
    }
    console.log(
      'Dry run: no database was opened or changed. Use --apply to import missing configurations.'
    );
    return;
  }

  const database = initializeDatabase();
  try {
    const actor = `cli:${os.userInfo().username}`;
    const results = importLegacyConfigs(database, configs, actor);
    for (const result of results) {
      console.log(
        `${result.env}: ${result.status === 'imported' ? 'configuration imported' : 'existing configuration preserved'}.`
      );
    }
  } finally {
    database.close();
  }
}

try {
  main();
} catch (error) {
  if (error.name === 'ZodError') {
    console.error('Configuration import failed validation. No configuration was imported.');
  } else if (error.code?.startsWith('SQLITE_')) {
    console.error(
      'Configuration import failed while accessing the database. No configuration was imported.'
    );
  } else {
    console.error(`Configuration import failed: ${error.message}`);
  }
  process.exitCode = 1;
}
