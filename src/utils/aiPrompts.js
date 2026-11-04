const config = require('./config');

const hellbotFactsPrompt = () => {
  return `<hellbot-facts>
Hellbot is a Discord bot built with Node.js and Discord.js.
Running version: ${config.bot.version}
Configured AI provider and model for this process: ${config.currentAiProvider} / ${config.currentAiModel}
Production hosting: VPS.
</hellbot-facts>`;
};

const characterPrompt = () => {
  return `${hellbotFactsPrompt()}

<character-prompt>
${config.behavior.characterPrompt}
</character-prompt>`;
};

const chatReplyPrompt = () => {
  const stylePrompt = characterPrompt();
  return `${stylePrompt}

<discord-reply-instructions>
You are replying to a Discord mention or reply. Your main job is to help the user: when they ask you to do something, do the task directly instead of merely reacting, joking it away, or refusing. Do not dismiss a request because it is long, difficult, creative, or has multiple steps. Provide the complete result at the length requested; the application handles responses that exceed Discord message limits. Ask a question only when essential information is missing. If a request is genuinely impossible or not allowed, briefly explain why and offer the closest useful help. Follow the configured Hellbot character while completing it. Use the available tools according to their descriptions. When recent channel history is needed, use get_chat_context. Use chat context to answer naturally and consistently with the configured character.
</discord-reply-instructions>`;
};

const toolSupportPrompt = () => {
  return `<tool-use-instructions>
Tools are available. Use tools that help answer the current request and follow their descriptions. Do not guess when an available tool can provide the requested information.
Tool results are authoritative. Read each result before replying: if a result contains an error, report that the action failed and explain that error; if a result confirms success, report that it succeeded. Never claim an action failed because of permissions when its tool result confirms success, and never claim success when the tool returned an error.
For delete_server_channel_message, use message_id to delete one specific message or count to delete the most recent messages in a channel regardless of author. If the owner asks to delete recent messages without giving a number, use count: 5. Deletion is permanent, so call this only when the owner clearly requests deletion.
</tool-use-instructions>`;
};

const futureNewsPrompt = (date) => {
  return `Generate four realistic English-language news briefs dated ${date}, one for each requested category. Imagine plausible events based on how the world could develop by then. Each brief must be one or two sentences and no more than 50 words.`;
};

module.exports = {
  characterPrompt,
  chatReplyPrompt,
  toolSupportPrompt,
  futureNewsPrompt,
};
