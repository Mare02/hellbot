const { usePrompt } = require('../src/services/AIservice');
const messages = require('../src/utils/messages');

global.fetch = jest.fn();

describe('usePrompt', () => {
  it('should return a response when given a valid user prompt', async () => {
    const prompt = "What is the capital of France?";
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "Paris" } }]
        }),
      })
    );
    const response = await usePrompt(prompt);

    expect(response).toBeDefined();
    expect(response).toBe("Paris");
    expect(typeof response).toBe('string');
  });

  it('should throw empty prompt error when the prompt is empty', async () => {
    await expect(usePrompt('')).rejects.toThrow(messages.inputError.noPrompt);
  });

  it('should throw an error when the AI returns an error', async () => {
    const prompt = "What is the capital of France?";
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          error: { message: "API Error" }
        }),
      })
    );

    await expect(usePrompt(prompt)).rejects.toThrow("API Error");
  });

  it('should throw an error when the AI returns no response', async () => {
    const prompt = "What is the capital of France?";
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          choices: [{ message: { content: "" } }]
        }),
      })
    );

    await expect(usePrompt(prompt)).rejects.toThrow(messages.emptyState.noResponseAI);
  });
});
