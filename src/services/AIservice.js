require('dotenv').config();
const aiModels = require('../data/aiModels');
const config = require('../utils/config');
const messages = require('../utils/messages');
const Groq = require('groq-sdk');
const { createToolSet } = require('./ai-tools');
const { toolSupportPrompt } = require('../utils/aiPrompts');

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

async function notifyToolCall(toolName, channel) {
  if (config.isDevMode && channel?.send) {
    await channel.send(`-# used tool: \`${toolName}\``);
  }
}

async function executeToolCalls(request, data, toolHandlers, traceChannel, toolIteration = 0) {
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
      await notifyToolCall(toolCall.function.name, traceChannel);
      const toolResult = await handler(parsedArguments);
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: typeof toolResult === 'string'
          ? toolResult
          : JSON.stringify(toolResult),
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
  return executeToolCalls(followUpRequest, followUpData, toolHandlers, traceChannel, toolIteration + 1);
}

module.exports = {
  usePrompt: async (userPrompt, systemPrompt, imageUrl, responseFormat, toolOptions = {}) => {
    if (!userPrompt || !userPrompt.length) {
      throw new Error(messages.inputError.noPrompt);
    }

    let shouldEnableTools = toolOptions.enableTools ?? Boolean(toolOptions.channel);
    if (shouldEnableTools && !toolOptions.channel) {
      shouldEnableTools = false;
    }
    let aiModel = config.currentAiModel;
    const effectiveSystemPrompt = shouldEnableTools
      ? [systemPrompt, toolSupportPrompt()].filter(Boolean).join('\n\n')
      : systemPrompt;
    const requestMessages = buildRequestMessages(userPrompt, effectiveSystemPrompt, imageUrl);

    if (imageUrl) {
      aiModel = aiModels.llama4_scout_17b_16e_instruct;
    }

    const request = {
      messages: requestMessages,
      model: aiModel,
      stream: false,
      stop: null
    };

    if (!imageUrl) {
      request.reasoning_effort = "low";
    }

    if (responseFormat) {
      request.response_format = responseFormat;
    }

    if (shouldEnableTools) {
      const toolSet = createToolSet(toolOptions.channel);
      request.tools = toolSet.toolDefinitions;
      request.tool_choice = 'auto';
      const toolHandlers = toolSet.toolHandlers;

      const data = await getGroqClient().chat.completions.create(request);

      const answer = await executeToolCalls(request, data, toolHandlers, toolOptions.channel);

      if (!answer || !answer.length) {
        throw new Error(messages.emptyState.noResponseAI);
      }

      return answer;
    }

    const data = await getGroqClient().chat.completions.create(request);
    const answer = data?.choices?.[0]?.message?.content;

    if (!answer || !answer.length) {
      throw new Error(messages.emptyState.noResponseAI);
    }

    return answer;
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
