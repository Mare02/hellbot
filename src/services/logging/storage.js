const { initializeDatabase } = require('../database');

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const PROFILES = ['dev', 'prod', 'dashboard'];

function assertProfile(profile) {
  if (!PROFILES.includes(profile)) {
    throw new Error('Log profile must be dev, prod, or dashboard.');
  }
}

function createWriter(profile, database) {
  assertProfile(profile);
  const ownsDatabase = !database;
  let connection = database;
  let insert;
  let lastPruned = 0;

  function write(entry, legacyHash = null) {
    if (entry.profile !== profile) throw new Error('Log profile does not match its writer.');
    connection ||= initializeDatabase();
    insert ||= connection.prepare(`INSERT INTO application_logs
      (timestamp, profile, level, component, command, message, context_json, search_text, legacy_hash)
      VALUES (@timestamp, @profile, @level, @component, @command, @message, @context, @search, @legacyHash)
      ON CONFLICT(legacy_hash) DO NOTHING`);
    const now = Date.now();
    if (now - lastPruned >= 60 * 60 * 1000) {
      connection.prepare('DELETE FROM application_logs WHERE timestamp < ?')
        .run(new Date(now - RETENTION_MS).toISOString());
      lastPruned = now;
    }
    return insert.run({
      timestamp: entry.timestamp,
      profile,
      level: entry.level,
      component: entry.component,
      command: entry.command ?? null,
      message: entry.message,
      legacyHash,
      context: entry.context === undefined ? null : JSON.stringify(entry.context),
      search: JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        component: entry.component,
        command: entry.command,
        message: entry.message,
        context: entry.context,
      }).toLowerCase(),
    }).changes;
  }

  write.close = () => {
    if (ownsDatabase && connection?.open) connection.close();
  };
  return write;
}

function readEntries(database, profile, filters) {
  assertProfile(profile);
  const conditions = ['profile = @profile', 'timestamp >= @cutoff'];
  const params = { profile, cutoff: new Date(Date.now() - RETENTION_MS).toISOString() };
  for (const key of ['level', 'component', 'command']) {
    if (filters[key]) {
      conditions.push(`${key} = @${key}`);
      params[key] = filters[key];
    }
  }
  for (const [key, operator] of [['from', '>='], ['to', '<=']]) {
    if (filters[key] !== undefined) {
      conditions.push(`timestamp ${operator} @${key}`);
      params[key] = new Date(filters[key]).toISOString();
    }
  }
  if (filters.search) {
    conditions.push('instr(search_text, @search) > 0');
    params.search = filters.search;
  }
  const where = conditions.join(' AND ');
  const connection = database || initializeDatabase();
  try {
    return connection.transaction(() => {
      const total = connection.prepare(`SELECT COUNT(*) AS total FROM application_logs WHERE ${where}`)
        .get(params).total;
      const rows = connection.prepare(`SELECT timestamp, profile, level, component, command,
        message, context_json FROM application_logs WHERE ${where}
        ORDER BY timestamp DESC, id DESC LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit: filters.pageSize, offset: (filters.page - 1) * filters.pageSize });
      const items = rows.map(({ context_json, command, ...entry }) => ({
        ...entry,
        ...(command === null ? {} : { command }),
        ...(context_json === null ? {} : { context: JSON.parse(context_json) }),
      }));
      return { items, total, page: filters.page, pageSize: filters.pageSize };
    })();
  } finally {
    if (!database) connection.close();
  }
}

module.exports = { assertProfile, createWriter, readEntries };
