const Database = require('better-sqlite3');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPOSITORY_PATH = fs.realpathSync(path.resolve(__dirname, '../../..'));
const BUSY_TIMEOUT_MS = 5000;

function assertExternalPath(databasePath) {
  const relativePath = path.relative(REPOSITORY_PATH, databasePath);
  const isOutside =
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath);

  if (!isOutside) {
    throw new Error('HELLBOT_DATABASE_PATH must point outside the repository.');
  }
}

function getDatabasePath() {
  const configuredPath = process.env.HELLBOT_DATABASE_PATH;
  const databasePath =
    configuredPath === undefined
      ? path.join(os.homedir(), '.local/share/hellbot/hellbot-db')
      : configuredPath;

  if (!path.isAbsolute(databasePath)) {
    throw new Error('HELLBOT_DATABASE_PATH must be an absolute file path.');
  }

  const normalizedPath = path.normalize(databasePath);
  assertExternalPath(normalizedPath);
  fs.mkdirSync(path.dirname(normalizedPath), { recursive: true, mode: 0o700 });

  const realPath = fs.existsSync(normalizedPath)
    ? fs.realpathSync(normalizedPath)
    : path.join(fs.realpathSync(path.dirname(normalizedPath)), path.basename(normalizedPath));
  assertExternalPath(realPath);

  return realPath;
}

function openDatabase() {
  const database = new Database(getDatabasePath(), { timeout: BUSY_TIMEOUT_MS });

  try {
    database.pragma('foreign_keys = ON');
    const journalMode = database.pragma('journal_mode = WAL', { simple: true });

    if (journalMode !== 'wal') {
      throw new Error('Hellbot database requires WAL journal mode.');
    }

    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

module.exports = { openDatabase };
