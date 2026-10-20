require('dotenv').config();
const aiModels = require('../data/aiModels');
const config = require('../utils/config');
const messages = require('../utils/messages');
const Groq = require('groq-sdk');
const { initializeRuntimeConfig } = require('./config/runtime');
const { createGeminiCompletion, hasGeminiApiKeys } = require('./geminiCompletion');
const { createToolSet, isToolEnabled, filterEnabledTools } = require('./ai-tools');
const { setTimeout: delay } = require('node:timers/promises');
const { toolSupportPrompt } = require('../utils/aiPrompts');
const { randomUUID } = require('node:crypto');
const { createTrackedFetch, withAiCallContext } = require('./aiUsage/tracking');

const imageFetch = createTrackedFetch({ provider: 'edenai', operation: 'image.generation' });

let groq = null;
let groqKey;
const customClients = new Map();
initializeRuntimeConfig().onChange(() => {
  groq = null;
  groqKey = undefined;
  customClients.clear();
});
const MAX_TOOL_ITERATIONS = 50;

async function createCompletion(request, provider) {
  try {
    if (provider === 'google') {
      return await createGeminiCompletion(request, filterEnabledTools);
    }
    if (provider.startsWith('custom_')) {
      const definition = initializeRuntimeConfig().snapshot.ai.customProviders.find(
        (item) => item.id === provider
      );
      if (!definition) throw new Error('Custom AI provider is not configured.');
      const key = initializeRuntimeConfig().nextKey(provider);
      let entry = customClients.get(provider);
      if (!entry || entry.key !== key || entry.baseUrl !== definition.baseUrl) {
        entry = {
          key,
          baseUrl: definition.baseUrl.replace(/\/$/, ''),
          client: new Groq({
            apiKey: key,
            baseURL: definition.baseUrl.replace(/\/$/, ''),
            timeout: 60000,
            maxRetries: 0,
            fetch: createTrackedFetch({ provider, operation: 'chat.completion' }),
          }),
        };
        customClients.set(provider, entry);
      }
      return await entry.client.chat.completions.create(filterEnabledTools(request));
    }
    for (let attempt = 0; ; attempt++) {
      const key = initializeRuntimeConfig().nextKey('groq');
      if (!groq || key !== groqKey) {
        groq = new Groq({
          apiKey: key,
          timeout: 60000,
          maxRetries: 0,
          fetch: createTrackedFetch({ provider: 'groq', operation: 'chat.completion' }),
        });
        groqKey = key;
      }
      try {
        return await withAiCallContext({ attempt: attempt + 1 }, () =>
          groq.chat.completions.create(filterEnabledTools(request))
        );
      } catch (error) {
        const retryable =
          [408, 409, 429, 500, 502, 503, 504].includes(error.status) ||
          ['APIConnectionError', 'APIConnectionTimeoutError'].includes(error.name);
        if (!retryable || attempt >= 2) throw error;
        await delay(1000 * 2 ** attempt + Math.random() * 250);
      }
    }
  } catch (error) {
    const status = error.status;
    console.error('AI request failed:', { provider, status, type: error.name });
    // Keep provider response bodies and credentials out of Discord error replies.
    const safeError = new Error(
      status === 429
        ? 'AI usage limit reached. Please try again later.'
        : 'The AI service is unavailable. Please try again later.'
    );
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
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ]
    : userPrompt;
  requestMessages.push({ role: 'user', content });
  return requestMessages;
}

async function executeToolCall(toolCall, toolHandlers, traceChannel, toolTraceMessageIds) {
  let result;
  let visionImages = [];
  const name = toolCall.function?.name;
  try {
    if (!isToolEnabled(name))
      throw new Error('This AI tool is disabled for the current bot profile.');
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
        const traceMessage = await traceChannel.send(`-# tool call: \`${name}\``);
        if (traceMessage?.id) toolTraceMessageIds.add(traceMessage.id);
      } catch (error) {
        console.error('Failed to send AI tool trace:', { tool: name });
      }
    }
    if (!isToolEnabled(name)) throw new Error('This AI tool was disabled before execution.');
    const toolResult = await toolHandlers[name](args);
    if (
      toolResult &&
      typeof toolResult === 'object' &&
      Array.isArray(toolResult.__aiVisionImages)
    ) {
      const { __aiVisionImages, ...publicResult } = toolResult;
      visionImages = __aiVisionImages;
      result = JSON.stringify(publicResult);
    } else {
      result = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult ?? null);
    }
  } catch (error) {
    result = JSON.stringify({ error: error.message || messages.errorState.apiError });
  }
  return {
    toolMessage: { role: 'tool', tool_call_id: toolCall.id, content: result },
    visionImages,
  };
}

async function executeToolCalls(
  request,
  data,
  toolHandlers,
  traceChannel,
  toolTraceMessageIds,
  provider,
  toolIteration = 0
) {
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

  const toolMessages = [];
  const visionImages = [];
  for (const toolCall of message.tool_calls) {
    const result = await executeToolCall(toolCall, toolHandlers, traceChannel, toolTraceMessageIds);
    toolMessages.push(result.toolMessage);
    visionImages.push(...result.visionImages);
  }
  const imageContextMessage = visionImages.length
    ? [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Images selected from Discord chat context. Each image is labeled with its source message and attachment.',
            },
            ...visionImages.slice(0, 10).flatMap((image) => [
              {
                type: 'text',
                text: `Source message ${image.messageId}; attachment ${image.attachmentId || 'unknown'}; filename ${image.name || 'unknown'}.`,
              },
              { type: 'image_url', image_url: { url: image.url } },
            ]),
          ],
        },
      ]
    : [];
  const followUpRequest = {
    ...request,
    // Preserve the full message, including Gemini thought-signature metadata.
    messages: [...request.messages, message, ...toolMessages, ...imageContextMessage],
    ...(toolIteration + 1 >= MAX_TOOL_ITERATIONS ? { tool_choice: 'none' } : {}),
  };
  if (provider === 'groq' && visionImages.length) {
    followUpRequest.model = config.ai.models.groq.vision;
    delete followUpRequest.reasoning_effort;
  }
  const followUpData = await createCompletion(followUpRequest, provider);
  return executeToolCalls(
    followUpRequest,
    followUpData,
    toolHandlers,
    traceChannel,
    toolTraceMessageIds,
    provider,
    toolIteration + 1
  );
}

function validatePrompt(userPrompt) {
  if (typeof userPrompt !== 'string' || !userPrompt.trim()) {
    throw new Error(messages.inputError.noPrompt);
  }
  return userPrompt.trim();
}

module.exports = {
  usePrompt: (userPrompt, systemPrompt, imageUrl, responseFormat, toolOptions = {}) =>
    withAiCallContext({ runId: randomUUID() }, async () => {
      const prompt = validatePrompt(userPrompt);
      const provider = config.currentAiProvider;
      const customProvider = config.ai.customProviders.find((item) => item.id === provider);
      if (!['google', 'groq'].includes(provider) && !customProvider) {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }
      if (provider === 'google' && !hasGeminiApiKeys()) {
        throw new Error('Add a shared Google API key in the dashboard.');
      }
      if (provider !== 'google' && !initializeRuntimeConfig().secretValues[provider]?.length) {
        throw new Error(`Add a shared ${customProvider?.name || 'Groq'} API key in the dashboard.`);
      }
      const shouldEnableTools = Boolean(toolOptions.channel) && (toolOptions.enableTools ?? true);
      const toolTraceMessageIds = new Set();
      const toolSet = shouldEnableTools
        ? await createToolSet(toolOptions.channel, {
            ...toolOptions,
            promptImageUrl: imageUrl,
            toolTraceMessageIds,
          })
        : null;
      const effectiveSystemPrompt = shouldEnableTools
        ? [
            systemPrompt,
            toolSupportPrompt(),
            toolSet.memoryPrompt,
            'Only tools listed in the current request are available. If a description refers to an unavailable tool, do not call it; ask for essential missing context instead.',
          ]
            .filter(Boolean)
            .join('\n\n')
        : systemPrompt;
      const request = {
        messages: buildRequestMessages(prompt, effectiveSystemPrompt, imageUrl),
        model:
          provider === 'groq' && imageUrl
            ? config.ai.models.groq.vision
            : customProvider?.model || config.ai.models[provider].text,
        stream: false,
      };
      if (provider === 'google') {
        request.reasoning_effort = 'medium';
      }
      if (provider === 'groq' && !imageUrl && request.model === aiModels.gpt_oss_120b) {
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

      const data = await createCompletion(request, provider);
      const answer = toolSet
        ? await executeToolCalls(
            request,
            data,
            toolSet.toolHandlers,
            toolOptions.channel,
            toolTraceMessageIds,
            provider
          )
        : data?.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error(messages.emptyState.noResponseAI);
      }
      return answer;
    }),

  useImageGen: async (userPrompt, { apiKey } = {}) => {
    const prompt = validatePrompt(userPrompt);
    const provider = 'amazon/titan-image-generator-v1_standard';
    const response = await imageFetch(
      'https://api.edenai.run/v2/image/generation',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey || initializeRuntimeConfig().nextKey('edenai')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providers: provider, text: prompt, resolution: '512x512' }),
        signal: AbortSignal.timeout(60000),
      },
      { model: provider }
    );
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
