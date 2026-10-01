const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const config = require('../utils/config');

const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 60000;
let connectionPromise = null;
let retryAfter = 0;

function fetchWithTimeout(url, options = {}) {
  // The optional GET notification stream lives until the transport closes.
  if (options.method === 'GET') return fetch(url, options);
  const signals = [options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)].filter(Boolean);
  return fetch(url, { ...options, signal: AbortSignal.any(signals) });
}

async function connect() {
  const client = new Client({ name: 'hellbot', version: config.bot.version });
  const transport = new StreamableHTTPClientTransport(new URL(config.mem0.url), {
    requestInit: { headers: { Authorization: `Bearer ${config.mem0.apiKey}` } },
    fetch: fetchWithTimeout,
  });
  client.onclose = () => { connectionPromise = null; };

  try {
    await client.connect(transport, { timeout: REQUEST_TIMEOUT_MS });
    const toolNames = new Set();
    let cursor;
    do {
      const page = await client.listTools({ ...(cursor ? { cursor } : {}) }, { timeout: REQUEST_TIMEOUT_MS });
      page.tools.forEach((tool) => toolNames.add(tool.name));
      cursor = page.nextCursor;
    } while (cursor);
    return { client, toolNames };
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

async function getConnection() {
  if (!config.mem0.enabled || !config.mem0.apiKey) {
    throw new Error('Long-term memory is not configured.');
  }
  if (Date.now() < retryAfter) {
    throw new Error('Long-term memory is temporarily unavailable.');
  }
  if (!connectionPromise) {
    connectionPromise = connect().catch((error) => {
      connectionPromise = null;
      retryAfter = Date.now() + RETRY_DELAY_MS;
      console.error('Mem0 MCP connection failed:', error.name, error.code || '');
      throw new Error('Long-term memory is temporarily unavailable.');
    });
  }
  return connectionPromise;
}

function parseResult(result) {
  try {
    if (result.isError) throw new Error();
    const text = result.content?.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
    const data = text ? JSON.parse(text) : result.structuredContent;
    if (!data || data.error) throw new Error();
    return data;
  } catch {
    throw new Error('The memory operation failed or returned an invalid response.');
  }
}

async function callTool(name, args) {
  const { client, toolNames } = await getConnection();
  if (!toolNames.has(name)) throw new Error('This memory operation is unavailable.');
  let result;
  try {
    result = await client.callTool({ name, arguments: args }, undefined, { timeout: REQUEST_TIMEOUT_MS });
  } catch (error) {
    retryAfter = Date.now() + RETRY_DELAY_MS;
    await client.close().catch(() => {});
    console.error(`Mem0 MCP tool failed: ${name}`, error.name, error.code || '');
    throw new Error('Unable to access long-term memory right now. The operation may not have completed.');
  }
  return parseResult(result);
}

async function close() {
  const pending = connectionPromise;
  connectionPromise = null;
  if (pending) {
    const connection = await pending.catch(() => null);
    await connection?.client.close();
  }
}

module.exports = {
  getAvailableTools: async () => (await getConnection()).toolNames,
  callTool,
  close,
};
