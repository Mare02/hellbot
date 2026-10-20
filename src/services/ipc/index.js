const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { profileEnvSchema } = require('../config/schema');

const MAX_RESPONSE_BYTES = 1024 * 1024;

function socketPath(profile) {
  const env = profileEnvSchema.parse(profile);
  const directory =
    process.env.HELLBOT_IPC_DIR || path.join(os.homedir(), '.local/share/hellbot/run');
  if (!path.isAbsolute(directory)) throw new Error('HELLBOT_IPC_DIR must be absolute.');
  return path.join(directory, `${env}.sock`);
}

function requestBot(profile, operation = 'status') {
  return new Promise((resolve) => {
    let result;
    let buffer = '';
    const socket = net.createConnection(socketPath(profile));
    function finish(value) {
      if (result) return;
      result = value;
      socket.destroy();
      resolve(value);
    }
    socket.setTimeout(5000, () =>
      finish({ profile, status: 'failed', online: false, message: 'Bot did not respond in time.' })
    );
    socket.on('connect', () => socket.write(`${JSON.stringify({ operation })}\n`));
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (Buffer.byteLength(buffer) > MAX_RESPONSE_BYTES)
        return finish({
          profile,
          status: 'failed',
          online: false,
          message: 'Invalid bot response.',
        });
      if (!buffer.includes('\n')) return;
      try {
        finish(JSON.parse(buffer.split('\n')[0]));
      } catch {
        finish({ profile, status: 'failed', online: false, message: 'Invalid bot response.' });
      }
    });
    socket.on('error', (error) =>
      finish({
        profile,
        status: ['ENOENT', 'ECONNREFUSED'].includes(error.code) ? 'offline' : 'failed',
        online: false,
        message: 'Bot is unavailable. Configuration remains saved.',
      })
    );
    socket.on('end', () =>
      finish({ profile, status: 'failed', online: false, message: 'Bot closed the connection.' })
    );
  });
}

async function startBotIpc(runtime, isReady) {
  const file = socketPath(runtime.profile);
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  if (fs.existsSync(file)) {
    const existing = await requestBot(runtime.profile);
    if (existing.status !== 'offline')
      throw new Error('A bot IPC socket already exists for this profile.');
    if (!fs.lstatSync(file).isSocket()) throw new Error('IPC path is not a socket.');
    fs.unlinkSync(file);
  }
  const server = net.createServer((socket) => {
    let buffer = '';
    let handled = false;
    socket.setTimeout(5000, () => socket.destroy());
    socket.on('error', () => {});
    socket.on('data', (chunk) => {
      if (handled) return;
      buffer += chunk;
      if (buffer.length > 1024) return socket.destroy();
      if (!buffer.includes('\n')) return;
      handled = true;
      let operation = 'unknown';
      try {
        ({ operation } = JSON.parse(buffer.split('\n')[0]));
        if (!['status', 'reload'].includes(operation))
          throw new Error('Unknown operation.');
        if (operation === 'reload') runtime.reload();
        socket.end(
          `${JSON.stringify({ profile: runtime.profile, status: operation === 'reload' ? 'applied' : 'online', online: true, ready: isReady(), pid: process.pid, appliedAt: runtime.appliedAt })}\n`
        );
      } catch (error) {
        console.error('Bot IPC request failed.', { operation, error });
        const message =
          'Bot could not apply configuration. Its last valid snapshot remains available.';
        socket.end(
          `${JSON.stringify({ profile: runtime.profile, status: 'failed', online: true, message })}\n`
        );
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(file, () => {
      fs.chmodSync(file, 0o600);
      resolve();
    });
  });
  return () => new Promise((resolve) => server.close(resolve));
}

async function notifyBots(profiles) {
  return Promise.all(profiles.map((profile) => requestBot(profile, 'reload')));
}

module.exports = { requestBot, startBotIpc, notifyBots };
