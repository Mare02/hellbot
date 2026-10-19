const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');

function encryptionKey() {
  const encoded = process.env.HELLBOT_ENCRYPTION_KEY;
  if (!encoded || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new Error('HELLBOT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new Error('HELLBOT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

function encryptSecret(provider, plaintext) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(`hellbot:ai-key:${provider}`, 'utf8'));
  return {
    encryptedValue: Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]),
    nonce,
    authTag: cipher.getAuthTag(),
  };
}

function decryptSecret(row) {
  const key = encryptionKey();
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, row.nonce);
    decipher.setAAD(Buffer.from(`hellbot:ai-key:${row.provider}`, 'utf8'));
    decipher.setAuthTag(row.auth_tag);
    return Buffer.concat([decipher.update(row.encrypted_value), decipher.final()]).toString('utf8');
  } catch {
    throw new Error(
      'Unable to decrypt stored API keys. Check the encryption key and database integrity.'
    );
  }
}

module.exports = { encryptSecret, decryptSecret };
