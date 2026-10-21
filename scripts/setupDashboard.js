const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const existing = dotenv.parse(text);
const additions = [];
if (!existing.HELLBOT_ENCRYPTION_KEY && !process.env.HELLBOT_ENCRYPTION_KEY) {
  additions.push(`HELLBOT_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);
}
if (additions.length) {
  fs.appendFileSync(
    envPath,
    `${text.endsWith('\n') || !text ? '' : '\n'}${additions.join('\n')}\n`,
    { mode: 0o600 }
  );
  fs.chmodSync(envPath, 0o600);
}
console.log('Dashboard encryption key is configured. Existing values were preserved.');
