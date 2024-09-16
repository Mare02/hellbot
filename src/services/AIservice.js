require('dotenv').config();
const config = require('../utils/config');
const messages = require('../utils/messages');

module.exports = {
  usePrompt: async (userPrompt, systemPrompt) => {
    if (!userPrompt || !userPrompt.length) {
      throw new Error(messages.inputError.noPrompt);
    }
    const requestMessages = [{ "role": "user", "content": userPrompt }];
    if (systemPrompt) {
      requestMessages.push({ "role": "system", "content": `Context: ${systemPrompt}` });
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.currentAiModel,
        messages: requestMessages,
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

  useImageGen: async (userPrompt) => {
    const provider = 'amazon/titan-image-generator-v1_standard';
    const response = await fetch('https://api.edenai.run/v2/image/generation', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.EDENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providers: provider,
        text: String(userPrompt).trim(),
        resolution: "512x512",
      })
    });

    const data = await response.json();

    if (data[provider] && data[provider].items && data[provider].items[0].image_resource_url) {
      return data[provider].items[0].image_resource_url;
    } else {
      throw new Error(messages.emptyState.noResponseAI);
    }
  },
}
