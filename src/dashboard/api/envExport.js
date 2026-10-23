const secretProviders = require('../../data/secretProviders');

const ENV_KEYS = [
  'NODE_ENV',
  'DISCORD_TOKEN',
  'DEV_DISCORD_TOKEN',
  'CLIENT_ID',
  'DEV_CLIENT_ID',
  'PUBLIC_KEY',
  'PUBLIC_KEY_DEV',
  'AI_PROVIDER',
  'BUGSNAG_API_KEY',
  'HELLBOT_ENCRYPTION_KEY',
  'HELLBOT_MEMORY_DIR',
  'HELLBOT_DATABASE_PATH',
  'HELLBOT_LOG_DIR',
  'HELLBOT_IPC_DIR',
  'DASHBOARD_PORT',
  'HELLBOT_DASHBOARD_ORIGIN',
  'HELLBOT_GITHUB_TOKEN',
];

function quoteValue(value) {
  if (!value.includes("'") && !value.includes('\n') && !value.includes('\r')) {
    return `'${value}'`;
  }
  return `"${value.replaceAll('\r', '\\r').replaceAll('\n', '\\n').replaceAll('"', '\\"')}"`;
}

function buildEnvExport(env, secrets) {
  const values = Object.fromEntries(
    [...ENV_KEYS, ...providerEnvKeys(env)]
      .filter((name) => env[name] !== undefined)
      .map((name) => [name, env[name]])
  );

  for (const { id, envPrefix } of secretProviders) {
    const providerValues = secrets[id] || [];
    if (!providerValues.length) continue;

    for (const name of Object.keys(values)) {
      if (name === envPrefix || name.startsWith(`${envPrefix}_`)) delete values[name];
    }

    if (providerValues.length === 1) {
      values[envPrefix] = providerValues[0];
      continue;
    }

    providerValues.forEach((value, index) => {
      values[`${envPrefix}_${index + 1}`] = value;
    });
  }

  return Object.entries(values)
    .map(([name, value]) => `${name}=${quoteValue(value)}`)
    .join('\n');
}

function providerEnvKeys(env) {
  return Object.keys(env).filter((name) =>
    secretProviders.some(
      ({ envPrefix }) => name === envPrefix || new RegExp(`^${envPrefix}_[1-9]\\d*$`).test(name)
    )
  );
}

module.exports = { buildEnvExport };
