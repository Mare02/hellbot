function createApiKeyRotator(envPrefix, env = process.env) {
  const numberedPrefix = `${envPrefix}_`;
  const numberedKeys = Object.keys(env)
    .filter((name) => name.startsWith(numberedPrefix) && /^[1-9]\d*$/.test(name.slice(numberedPrefix.length)))
    .sort((first, second) => Number(first.slice(numberedPrefix.length)) - Number(second.slice(numberedPrefix.length)))
    .map((name) => env[name]?.trim())
    .filter(Boolean);
  const apiKeys = numberedKeys.length
    ? numberedKeys
    : [env[envPrefix]?.trim()].filter(Boolean);
  let nextKeyIndex = 0;

  return {
    hasKeys: () => apiKeys.length > 0,
    next: () => {
      if (!apiKeys.length) {
        throw new Error(`Configure ${envPrefix}_1 or ${envPrefix}.`);
      }
      const apiKey = apiKeys[nextKeyIndex];
      nextKeyIndex = (nextKeyIndex + 1) % apiKeys.length;
      return apiKey;
    },
  };
}

module.exports = { createApiKeyRotator };
