require('dotenv').config();
const aiModels = require('../data/aiModels');
const config = require('../utils/config');
const messages = require('../utils/messages');
const Groq = require('groq-sdk');
const { toolDefinitions, toolHandlers } = require('./ai-tools');

let groq = null;
const MAX_TOOL_ITERATIONS = 3;

function getGroqClient() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

function buildRequestMessages(userPrompt, systemPrompt, imageUrl) {
  const requestMessages = [];

  if (systemPrompt) {
    requestMessages.push({ role: "system", content: `Context: ${systemPrompt}` });
  }

  if (imageUrl) {
    requestMessages.push({
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    });
    return requestMessages;
  }

  requestMessages.push({ role: "user", content: userPrompt });
  return requestMessages;
}

async function executeToolCalls(request, data, toolIteration = 0) {
  const choice = data?.choices?.[0];
  const message = choice?.message;

  if (!message) {
    throw new Error(messages.emptyState.noResponseAI);
  }

  if (!message.tool_calls || !message.tool_calls.length || toolIteration >= MAX_TOOL_ITERATIONS) {
    return message.content;
  }

  const toolMessages = await Promise.all(message.tool_calls.map(async (toolCall) => {
    const handler = toolHandlers[toolCall.function.name];

    if (!handler) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: `No tool handler found for ${toolCall.function.name}`,
        }),
      };
    }

    let parsedArguments = {};

    try {
      parsedArguments = toolCall.function.arguments
        ? JSON.parse(toolCall.function.arguments)
        : {};
    } catch (error) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: `Invalid tool arguments for ${toolCall.function.name}`,
        }),
      };
    }

    try {
      const toolResult = await handler(parsedArguments);
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      };
    } catch (error) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: error.message || messages.errorState.apiError,
        }),
      };
    }
  }));

  const followUpRequest = {
    ...request,
    messages: [...request.messages, message, ...toolMessages],
  };

  const followUpData = await getGroqClient().chat.completions.create(followUpRequest);
  return executeToolCalls(followUpRequest, followUpData, toolIteration + 1);
}

module.exports = {
  usePrompt: async (userPrompt, systemPrompt, imageUrl, responseFormat, toolOptions = {}) => {
    if (!userPrompt || !userPrompt.length) {
      throw new Error(messages.inputError.noPrompt);
    }

    let aiModel = config.currentAiModel;
    const requestMessages = buildRequestMessages(userPrompt, systemPrompt, imageUrl);

    if (imageUrl) {
      aiModel = aiModels.llama3_11b_vision_preview;
    }

    const request = {
      messages: requestMessages,
      model: aiModel,
      stream: false,
      reasoning_effort: "low",
      stop: null
    };

    if (responseFormat) {
      request.response_format = responseFormat;
    }

    if (toolOptions.enableTools) {
      request.tools = toolDefinitions;
      request.tool_choice = 'auto';
    }

    const data = await getGroqClient().chat.completions.create(request);

    const answer = toolOptions.enableTools
      ? await executeToolCalls(request, data)
      : data?.choices?.[0]?.message?.content;

    if (!answer || !answer.length) {
      throw new Error(messages.emptyState.noResponseAI);
    }

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
