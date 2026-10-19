const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPOSITORY_PATH = path.resolve(__dirname, '../../..');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_COUNT = 5;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const PROFILES = ['dev', 'prod', 'dashboard'];

function assertProfile(profile) {
  if (!PROFILES.includes(profile)) {
    throw new Error('Log profile must be dev, prod, or dashboard.');
  }
}

function assertExternalPath(directory) {
  const relative = path.relative(fs.realpathSync(REPOSITORY_PATH), directory);
  if (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    throw new Error('HELLBOT_LOG_DIR must point outside the repository.');
  }
}

function getLogDirectory(create = false) {
  const directory =
    process.env.HELLBOT_LOG_DIR === undefined
      ? path.join(os.homedir(), '.local/share/hellbot/logs')
      : process.env.HELLBOT_LOG_DIR;
  if (!path.isAbsolute(directory)) {
    throw new Error('HELLBOT_LOG_DIR must be an absolute directory path.');
  }
  const normalized = path.normalize(directory);
  assertExternalPath(normalized);
  if (!fs.existsSync(normalized)) {
    if (!create) {
      return null;
    }
    let ancestor = path.dirname(normalized);
    while (!fs.existsSync(ancestor)) {
      ancestor = path.dirname(ancestor);
    }
    assertExternalPath(path.join(fs.realpathSync(ancestor), path.relative(ancestor, normalized)));
    fs.mkdirSync(normalized, { recursive: true, mode: 0o700 });
  }
  const realDirectory = fs.realpathSync(normalized);
  assertExternalPath(realDirectory);
  if (!fs.statSync(realDirectory).isDirectory()) {
    throw new Error('HELLBOT_LOG_DIR must be a directory.');
  }
  return realDirectory;
}

function filePath(directory, profile, index) {
  return path.join(directory, `${profile}${index ? `.${index}` : ''}.jsonl`);
}

function fileStat(filename) {
  try {
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error('Log files must be regular files.');
    }
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function createWriter(profile) {
  assertProfile(profile);
  let directory;
  let lastPruned = 0;

  return (line) => {
    directory = directory || getLogDirectory(true);
    const now = Date.now();
    if (now - lastPruned > 60 * 60 * 1000) {
      for (let index = 0; index < FILE_COUNT; index += 1) {
        const filename = filePath(directory, profile, index);
        const stat = fileStat(filename);
        if (stat && now - stat.mtimeMs > RETENTION_MS) {
          fs.unlinkSync(filename);
        }
      }
      lastPruned = now;
    }

    const current = filePath(directory, profile, 0);
    const size = fileStat(current)?.size || 0;
    if (size + Buffer.byteLength(line) > MAX_FILE_BYTES) {
      const oldest = filePath(directory, profile, FILE_COUNT - 1);
      if (fileStat(oldest)) {
        fs.unlinkSync(oldest);
      }
      for (let index = FILE_COUNT - 2; index >= 0; index -= 1) {
        const source = filePath(directory, profile, index);
        if (fileStat(source)) {
          fs.renameSync(source, filePath(directory, profile, index + 1));
        }
      }
    }

    const descriptor = fs.openSync(
      current,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        fs.constants.O_NOFOLLOW,
      0o600
    );
    try {
      fs.writeFileSync(descriptor, line, 'utf8');
    } finally {
      fs.closeSync(descriptor);
    }
  };
}

function readEntries(profile) {
  assertProfile(profile);
  const directory = getLogDirectory();
  if (!directory) {
    return [];
  }
  const entries = [];
  const minimumTimestamp = Date.now() - RETENTION_MS;
  for (let index = 0; index < FILE_COUNT; index += 1) {
    const filename = filePath(directory, profile, index);
    let descriptor;
    try {
      const stat = fileStat(filename);
      if (!stat || stat.mtimeMs < minimumTimestamp) {
        continue;
      }
      descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      const length = Math.min(stat.size, MAX_FILE_BYTES);
      const offset = Math.max(0, stat.size - length);
      const buffer = Buffer.alloc(length);
      const bytesRead = fs.readSync(descriptor, buffer, 0, length, offset);
      const lines = buffer.subarray(0, bytesRead).toString('utf8').split('\n');
      if (offset > 0) {
        lines.shift();
      }
      // A writer may not have finished the last JSONL record yet.
      lines.pop();
      for (const line of lines) {
        if (line.length > 32768) {
          continue;
        }
        try {
          const entry = JSON.parse(line);
          if (
            entry &&
            entry.profile === profile &&
            typeof entry.timestamp === 'string' &&
            Date.parse(entry.timestamp) >= minimumTimestamp
          ) {
            entries.push(entry);
          }
        } catch {
          // Ignore a damaged record without hiding other valid entries.
        }
      }
    } catch (error) {
      // Rotation can rename a file after it was listed.
      if (error.code !== 'ENOENT') {
        throw error;
      }
    } finally {
      if (descriptor !== undefined) {
        fs.closeSync(descriptor);
      }
    }
  }
  return entries;
}

module.exports = { assertProfile, createWriter, readEntries };
