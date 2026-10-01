// Read forwarded snapshots locally; their original author is not included by Discord.
function getMessageContent(message) {
  const parts = message ? [message, ...(message.messageSnapshots?.values?.() || [])] : [];
  const attachments = new Map();

  for (const part of parts) {
    for (const attachment of part.attachments?.values?.() || []) {
      attachments.set(attachment.id || attachment.url, attachment);
    }
  }

  return {
    content: parts.map(part => part.content)
      .filter(content => typeof content === 'string' && content.trim())
      .join('\n'),
    embeds: parts.flatMap(part => part.embeds || []),
    attachments: [...attachments.values()],
  };
}

module.exports = { getMessageContent };
