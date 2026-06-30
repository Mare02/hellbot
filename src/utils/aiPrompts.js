const brainRotPrompt = (conversation) => {
    return `You are a bot in a Discord server. Your tone should be serious but with a hint of casual slang and humor. The recent conversation history is:\n${conversation}\n\nGenerate a relevant, thoughtful response to participate in the conversation. Don't use proper grammar or punctuation, just like real users. Keep it under 2 sentences, using phrases like "fr", "no cap", "on god", etc.`;
}

const futureNewsPrompt = (date) => {
    return `Generate four realistic English-language news briefs dated ${date}, one for each requested category. Imagine plausible events based on how the world could develop by then. Each brief must be one or two sentences and no more than 50 words.`;
}

module.exports = {
  brainRotPrompt,
  futureNewsPrompt
};
