const { fork, spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  const timeout = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }, 5000);
  timeout.unref();
}

function manage(child) {
  children.push(child);
  child.on('error', error => {
    console.error(`Dashboard process could not start: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) stop(code ?? (signal ? 1 : 0));
  });
  return child;
}

process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());

const api = manage(fork(path.join(root, 'src/dashboard/server.js'), [], {
  cwd: root,
  env: { ...process.env, HELLBOT_DASHBOARD_DEV: 'true' },
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
}));

api.once('message', message => {
  if (message?.type !== 'dashboard-ready' || stopping) return;
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  manage(spawn(process.execPath, [vite, '--config', 'dashboard/vite.config.mjs'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  }));
});
