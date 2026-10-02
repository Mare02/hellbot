require('dotenv').config();
const aiModels = require('../data/aiModels');
const config = require('../utils/config');
const messages = require('../utils/messages');
const Groq = require('groq-sdk');
const { createGeminiCompletion, hasGeminiApiKeys } = require('./geminiCompletion');
const { createToolSet } = require('./ai-tools');
const { toolSupportPrompt } = require('../utils/aiPrompts');

let groq = null;
const MAX_TOOL_ITERATIONS = 5;

async function createCompletion(request) {
  try {
    if (config.currentAiProvider === 'google') {
      return await createGeminiCompletion(request);
    }
    if (!groq) {
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60000 });
    }
    return await groq.chat.completions.create(request);
  } catch (error) {
    const status = error.status;
    console.error('AI request failed:', { provider: config.currentAiProvider, status, type: error.name });
    // Keep provider response bodies and credentials out of Discord error replies.
    const safeError = new Error(status === 429
      ? 'AI usage limit reached. Please try again later.'
      : 'The AI service is unavailable. Please try again later.');
    safeError.status = status;
    throw safeError;
  }
}

function buildRequestMessages(userPrompt, systemPrompt, imageUrl) {
  const requestMessages = [];
  if (systemPrompt) {
    requestMessages.push({ role: 'system', content: `Context: ${systemPrompt}` });
  }
  const content = imageUrl
    ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: imageUrl } }]
    : userPrompt;
  requestMessages.push({ role: 'user', content });
  return requestMessages;
}

async function executeToolCall(toolCall, toolHandlers, traceChannel) {
  let result;
  const name = toolCall.function?.name;
  try {
    if (!Object.prototype.hasOwnProperty.call(toolHandlers, name)) {
      throw new Error(`No tool handler found for ${name}`);
    }
    let args;
    try {
      args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        throw new Error('Expected an arguments object');
      }
    } catch (error) {
      throw new Error(`Invalid tool arguments for ${name}`);
    }
    if (config.isDevMode && traceChannel?.send) {
      try {
        await traceChannel.send(`-# used tool: \`${name}\``);
      } catch (error) {
        console.error('Failed to send AI tool trace:', { tool: name });
      }
    }
    const toolResult = await toolHandlers[name](args);
    result = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? null);
  } catch (error) {
    result = JSON.stringify({ error: error.message || messages.errorState.apiError });
  }
  return { role: 'tool', tool_call_id: toolCall.id, content: result };
}

async function executeToolCalls(request, data, toolHandlers, traceChannel, toolIteration = 0) {
  const message = data?.choices?.[0]?.message;
  if (!message) {
    throw new Error(messages.emptyState.noResponseAI);
  }
  if (!message.tool_calls?.length) {
    return message.content;
  }
  if (toolIteration >= MAX_TOOL_ITERATIONS) {
    throw new Error('The AI could not finish its response after using tools. Please try again.');
  }

  const toolMessages = await Promise.all(message.tool_calls.map(
    (toolCall) => executeToolCall(toolCall, toolHandlers, traceChannel),
  ));
  const followUpRequest = {
    ...request,
    // Preserve the full message, including Gemini thought-signature metadata.
    messages: [...request.messages, message, ...toolMessages],
    ...(toolIteration + 1 >= MAX_TOOL_ITERATIONS ? { tool_choice: 'none' } : {}),
  };
  const followUpData = await createCompletion(followUpRequest);
  return executeToolCalls(followUpRequest, followUpData, toolHandlers, traceChannel, toolIteration + 1);
}

function validatePrompt(userPrompt) {
  if (typeof userPrompt !== 'string' || !userPrompt.trim()) {
    throw new Error(messages.inputError.noPrompt);
  }
  return userPrompt.trim();
}

module.exports = {
  usePrompt: async (userPrompt, systemPrompt, imageUrl, responseFormat, toolOptions = {}) => {
    const prompt = validatePrompt(userPrompt);
    const provider = config.currentAiProvider;
    if (!['google', 'groq'].includes(provider)) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
    if (provider === 'google' && !hasGeminiApiKeys()) {
      throw new Error('Configure GEMINI_API_KEY_1 or GEMINI_API_KEY.');
    }
    if (provider === 'groq' && !process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured.');
    }
    const shouldEnableTools = Boolean(toolOptions.channel) && (toolOptions.enableTools ?? true);
    const toolSet = shouldEnableTools ? await createToolSet(toolOptions.channel, toolOptions) : null;
    const effectiveSystemPrompt = shouldEnableTools
      ? [systemPrompt, toolSupportPrompt(), toolSet.memoryPrompt].filter(Boolean).join('\n\n')
      : systemPrompt;
    const request = {
      messages: buildRequestMessages(prompt, effectiveSystemPrompt, imageUrl),
      model: provider === 'groq' && imageUrl ? aiModels.qwen3_8_27b : config.currentAiModel,
      stream: false,
    };
    if (provider === 'groq' && !imageUrl) {
      request.reasoning_effort = 'low';
    }
    if (responseFormat) {
      request.response_format = responseFormat;
    }
    if (toolSet) {
      request.tools = toolSet.toolDefinitions;
      request.tool_choice = 'auto';
      request.parallel_tool_calls = false;
    }

    const data = await createCompletion(request);
    const answer = toolSet
      ? await executeToolCalls(request, data, toolSet.toolHandlers, toolOptions.channel)
      : data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error(messages.emptyState.noResponseAI);
    }
    return answer;
  },

  useImageGen: async (userPrompt) => {
    const prompt = validatePrompt(userPrompt);
    const provider = 'amazon/titan-image-generator-v1_standard';
    const response = await fetch('https://api.edenai.run/v2/image/generation', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EDENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providers: provider, text: prompt, resolution: '512x512' }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      throw new Error(messages.errorState.apiError);
    }
    const data = await response.json();
    const imageUrl = data[provider]?.items?.[0]?.image_resource_url;
    if (!imageUrl) {
      throw new Error(messages.emptyState.noResponseAI);
    }
    return imageUrl;
  },
};
