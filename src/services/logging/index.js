const { AsyncLocalStorage } = require('node:async_hooks');
const { createRedactor } = require('./redaction');
const { assertProfile, createWriter, readEntries } = require('./storage');

const LEVELS = ['debug', 'info', 'warn', 'error'];
const contextStorage = new AsyncLocalStorage();
const nativeConsole = Object.fromEntries(
  ['log', ...LEVELS].map((name) => [name, console[name].bind(console)])
);
const secretProviders = new Set();
let activeInstallation;

function withLogContext(context, callback) {
  return contextStorage.run({ ...contextStorage.getStore(), ...context }, callback);
}

function createLogger({ profile, component = 'application', secretProvider } = {}) {
  assertProfile(profile);
  if (secretProvider !== undefined && typeof secretProvider !== 'function') {
    throw new Error('Log secretProvider must be a function.');
  }
  if (secretProvider) {
    secretProviders.add(secretProvider);
  }
  const redactor = createRedactor(() => [...secretProviders].map((provider) => provider()));
  const write = createWriter(profile);

  function emit(level, message, context, formatArguments = false) {
    let entry;
    let serialized;
    try {
      redactor.refreshSecrets();
      const inherited = contextStorage.getStore() || {};
      const safeContext = redactor.sanitize({ ...inherited, ...context });
      entry = {
        timestamp: new Date().toISOString(),
        level,
        profile,
        component: redactor.text(String(safeContext.component || component)).slice(0, 128),
        message: formatArguments ? redactor.format(message) : redactor.format([message]),
      };
      if (safeContext.command) {
        entry.command = redactor.text(String(safeContext.command)).slice(0, 128);
      }
      delete safeContext.component;
      delete safeContext.command;
      if (Object.keys(safeContext).length) {
        entry.context = safeContext;
      }
      serialized = JSON.stringify(entry);
      if (Buffer.byteLength(serialized) > 32700) {
        entry.context = { truncated: true };
        serialized = JSON.stringify(entry);
        while (Buffer.byteLength(serialized) > 32700) {
          entry.message = entry.message.slice(0, Math.floor(entry.message.length / 2));
          serialized = JSON.stringify(entry);
        }
      }
    } catch {
      // Never fall back to the original arguments when redaction fails.
      nativeConsole.error('[Hellbot logging] A log record could not be safely sanitized.');
      return;
    }

    nativeConsole[level](serialized);
    try {
      write(`${serialized}\n`);
    } catch {
      nativeConsole.error('[Hellbot logging] A sanitized log record could not be persisted.');
    }
  }

  const logger = Object.fromEntries(
    LEVELS.map((level) => [level, (message, context = {}) => emit(level, message, context)])
  );
  Object.defineProperty(logger, 'capture', {
    value: (level, args) => emit(level, args, undefined, true),
  });
  return logger;
}

function installConsoleLogging(options) {
  if (activeInstallation) {
    throw new Error('Console logging is already installed.');
  }
  const logger = createLogger(options);
  const previous = {};
  const wrappers = {};
  for (const method of ['log', ...LEVELS]) {
    previous[method] = console[method];
    wrappers[method] = (...args) => logger.capture(method === 'log' ? 'info' : method, args);
    console[method] = wrappers[method];
  }
  const cleanup = () => {
    for (const method of Object.keys(previous)) {
      if (console[method] === wrappers[method]) {
        console[method] = previous[method];
      }
    }
    if (options.secretProvider) {
      secretProviders.delete(options.secretProvider);
    }
    activeInstallation = undefined;
  };
  activeInstallation = cleanup;
  return cleanup;
}

function invalidFilter() {
  const error = new Error('Invalid log filters.');
  error.status = 400;
  error.code = 'INVALID_LOG_FILTER';
  throw error;
}

function validateFilters(filters) {
  const allowed = ['level', 'component', 'command', 'from', 'to', 'page', 'pageSize'];
  if (
    !filters ||
    typeof filters !== 'object' ||
    Array.isArray(filters) ||
    Object.keys(filters).some((key) => !allowed.includes(key))
  ) {
    invalidFilter();
  }
  for (const key of ['component', 'command']) {
    if (
      filters[key] !== undefined &&
      (typeof filters[key] !== 'string' || filters[key].length > 128)
    ) {
      invalidFilter();
    }
  }
  if (filters.level !== undefined && !LEVELS.includes(filters.level)) {
    invalidFilter();
  }
  const result = { ...filters };
  for (const key of ['from', 'to']) {
    if (filters[key] !== undefined) {
      if (
        typeof filters[key] !== 'string' ||
        filters[key].length > 40 ||
        !/^\d{4}-\d{2}-\d{2}T/.test(filters[key]) ||
        !Number.isFinite(Date.parse(filters[key]))
      ) {
        invalidFilter();
      }
      result[key] = Date.parse(filters[key]);
    }
  }
  if (result.from !== undefined && result.to !== undefined && result.from > result.to) {
    invalidFilter();
  }
  for (const [key, fallback, maximum] of [
    ['page', 1, 100000],
    ['pageSize', 50, 100],
  ]) {
    const value = filters[key] === undefined ? fallback : Number(filters[key]);
    if (
      !['string', 'number', 'undefined'].includes(typeof filters[key]) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > maximum
    ) {
      invalidFilter();
    }
    result[key] = value;
  }
  return result;
}

function readLogs(profile, filters = {}) {
  assertProfile(profile);
  const checked = validateFilters(filters);
  const redactor = createRedactor(() => [...secretProviders].map((provider) => provider()));
  redactor.refreshSecrets();
  const entries = readEntries(profile)
    .filter((entry) => {
      const timestamp = Date.parse(entry.timestamp);
      return (
        LEVELS.includes(entry.level) &&
        typeof entry.component === 'string' &&
        typeof entry.message === 'string' &&
        (!checked.level || entry.level === checked.level) &&
        (!checked.component || entry.component === checked.component) &&
        (!checked.command || entry.command === checked.command) &&
        (checked.from === undefined || timestamp >= checked.from) &&
        (checked.to === undefined || timestamp <= checked.to)
      );
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const start = (checked.page - 1) * checked.pageSize;
  const items = entries.slice(start, start + checked.pageSize).map((entry) => {
    const item = {
      timestamp: entry.timestamp,
      level: entry.level,
      profile,
      component: redactor.text(entry.component),
      message: redactor.text(entry.message),
    };
    if (typeof entry.command === 'string') {
      item.command = redactor.text(entry.command);
    }
    if (entry.context && typeof entry.context === 'object') {
      item.context = redactor.sanitize(entry.context);
    }
    return item;
  });
  return { items, total: entries.length, page: checked.page, pageSize: checked.pageSize };
}

module.exports = { createLogger, installConsoleLogging, readLogs, withLogContext };
