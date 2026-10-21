require('dotenv').config();
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parseArgs } = require('node:util');
const { initializeDatabase } = require('../src/services/database');
const { createSecretStore } = require('../src/services/config/secrets');
const { createRedactor } = require('../src/services/logging/redaction');
const { createWriter } = require('../src/services/logging/storage');

function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      directory: { type: 'string' },
    },
  });
  const directory = values.directory || process.env.HELLBOT_LOG_DIR ||
    path.join(os.homedir(), '.local/share/hellbot/logs');
  if (!path.isAbsolute(directory)) throw new Error('The legacy log directory must be absolute.');
  if (!fs.existsSync(directory)) {
    console.log('No legacy log directory found.');
    return;
  }
  const relative = path.relative(fs.realpathSync(path.resolve(__dirname, '..')), fs.realpathSync(directory));
  if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    throw new Error('The legacy log directory must be outside the repository.');
  }
  const database = values.apply ? initializeDatabase() : null;
  try {
    const secrets = database ? createSecretStore(database).readAll() : {};
    const redactor = createRedactor(() => secrets);
    redactor.refreshSecrets();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const occurrences = new Map();
    let found = 0;
    let imported = 0;
    for (const profile of ['dev', 'prod', 'dashboard']) {
      const write = database ? createWriter(profile, database) : null;
      for (let index = 4; index >= 0; index -= 1) {
        const filename = path.join(directory, `${profile}${index ? `.${index}` : ''}.jsonl`);
        let descriptor;
        try {
          descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
          const stat = fs.fstatSync(descriptor);
          if (!stat.isFile() || stat.size > 5 * 1024 * 1024) {
            throw new Error('Legacy logs must be regular files no larger than 5 MiB.');
          }
          const lines = fs.readFileSync(descriptor, 'utf8').split('\n');
          // Import complete records only; the active writer may still be writing its last line.
          lines.pop();
          const importFile = () => {
            for (const line of lines) {
              if (!line || Buffer.byteLength(line) > 32768) continue;
              let entry;
              try {
                entry = JSON.parse(line);
              } catch {
                continue;
              }
              const timestamp = Date.parse(entry?.timestamp);
              if (entry?.profile !== profile || !Number.isFinite(timestamp) || timestamp < cutoff ||
                !['debug', 'info', 'warn', 'error'].includes(entry.level) ||
                typeof entry.component !== 'string' || typeof entry.message !== 'string') continue;
              found += 1;
              const hash = createHash('sha256').update(line).digest('hex');
              const occurrence = (occurrences.get(hash) || 0) + 1;
              occurrences.set(hash, occurrence);
              if (!write) continue;
              const safe = {
                timestamp: new Date(timestamp).toISOString(),
                profile,
                level: entry.level,
                component: redactor.text(entry.component).slice(0, 128),
                message: redactor.text(entry.message),
              };
              if (typeof entry.command === 'string') safe.command = redactor.text(entry.command).slice(0, 128);
              if (entry.context && typeof entry.context === 'object') safe.context = redactor.sanitize(entry.context);
              if (Buffer.byteLength(JSON.stringify(safe)) > 32700) safe.context = { truncated: true };
              imported += write(safe, `${hash}:${occurrence}`);
            }
          };
          if (database) database.transaction(importFile).immediate();
          else importFile();
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        } finally {
          if (descriptor !== undefined) fs.closeSync(descriptor);
        }
      }
    }
    console.log(values.apply
      ? `Imported ${imported} of ${found} recent legacy records. Existing imports were skipped; source files were preserved.`
      : `Found ${found} recent legacy records. Use --apply to import them into SQLite.`);
  } finally {
    database?.close();
  }
}

try {
  main();
} catch {
  console.error('Legacy log import failed. Check the source directory, database access and encryption key. Source files were preserved.');
  process.exitCode = 1;
}
