require('dotenv').config();
const aiModels = require('../utils/aiModels');
const apiKey = process.env.OPEN_ROUTER_API_KEY;

module.exports = {
  prompt: async (prompt) => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": aiModels.googleGemma,
        "messages": [
          {"role": "user", "content": prompt},
        ],
      })
    });

    const data = await response.json();
    return data;
  },
}
