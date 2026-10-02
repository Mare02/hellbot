const DISCORD_TEXT_LIMIT = 2000;
const PREFERRED_BREAK_RATIO = 0.75;

function findChunkEnd(content, limit) {
  let end = limit;
  const preferredBreak = Math.floor(limit * PREFERRED_BREAK_RATIO);
  let breakIndex = -1;

  for (let index = end - 1; index >= preferredBreak; index -= 1) {
    if (/\s/.test(content[index])) {
      breakIndex = index;
      break;
    }
  }

  if (breakIndex > 0) {
    end = breakIndex;
  }

  if (end > 1 && /[\uD800-\uDBFF]/.test(content[end - 1])) {
    end -= 1;
  }

  return end;
}

function splitDiscordContent(content, limit = DISCORD_TEXT_LIMIT) {
  if (typeof content !== 'string' || !Number.isInteger(limit) || limit < 1) {
    return [content];
  }

  const chunks = [];
  let remaining = content;

  while (remaining.length > limit) {
    const end = findChunkEnd(remaining, limit);
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }

  if (remaining.length > 0 || chunks.length === 0) {
    chunks.push(remaining);
  }

  return chunks;
}

async function sendInitialMessage(target, content) {
  if (target?.deferred && typeof target.editReply === 'function') {
    return target.editReply(content);
  }

  if (typeof target?.reply === 'function') {
    const result = await target.reply(content);
    if (result?.id) {
      return result;
    }

    if (typeof target.fetchReply === 'function') {
      return target.fetchReply();
    }

    return null;
  }

  if (typeof target?.send === 'function') {
    return target.send(content);
  }

  throw new Error('Target does not support sending Discord messages.');
}

async function sendDiscordContent(target, content, options = {}) {
  if (typeof content !== 'string') {
    return sendInitialMessage(target, content);
  }

  const chunks = splitDiscordContent(content, options.limit ?? DISCORD_TEXT_LIMIT);
  let previousMessage = await sendInitialMessage(target, chunks[0]);
  const channel = target?.channel || target;

  for (const chunk of chunks.slice(1)) {
    if (!previousMessage?.id || typeof channel?.send !== 'function') {
      throw new Error('Target cannot chain the remaining Discord message chunks.');
    }

    previousMessage = await channel.send({
      content: chunk,
      reply: { messageReference: previousMessage.id },
    });
  }

  return previousMessage;
}

module.exports = {
  DISCORD_TEXT_LIMIT,
  splitDiscordContent,
  sendDiscordContent,
};
