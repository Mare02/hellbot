require('dotenv').config();
const apiKey = process.env.OPEN_ROUTER_API_KEY;
const config = require('../utils/config');
const messages = require('../utils/messages');

module.exports = {
  usePrompt: async (userPrompt, systemPrompt) => {
    const requestMessages = [{ "role": "user", "content": userPrompt }];
    if (systemPrompt) {
      requestMessages.push({ "role": "system", "content": `Context: ${systemPrompt}` });
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": config.currentAiModel,
        "messages": requestMessages,
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.choices || !data.choices[0].message || !data.choices[0].message.content.length) {
      throw new Error(messages.emptyState.noResponseAI);
    }

    const answer = data.choices[0].message.content;

    const truncatedAnswer = answer.length > config.discordMsgLengthLimit
      ? `${answer.substring(0, config.discordMsgLengthLimit - 3)}...`
      : answer;

    return truncatedAnswer;
  },
}
