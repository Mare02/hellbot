const { useImageGen } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');

module.exports = {
  name: 'imagen',
  description: 'Prompts AI to generate an image.',
  slash: true,
  params: [
    {
      name: 'prompt',
      description: "The prompt for the image generation",
      required: true,
    },
  ],
  async execute(interaction, args) {
    try {
      if (!args) {
        await interaction.deferReply();
      }

      let userInput;
      if (args) {
        userInput = args.join(' ');
      } else {
        userInput = interaction.options.getString('prompt');
      }

      if (!userInput || !userInput.length) {
        return await reply(interaction, args, messages.inputError.noPrompt);
      };

      let prompt = validateUserPromptInput(userInput, interaction.channel);

      const imageUrl = await useImageGen(prompt);

      let userId;
      if (args) {
        userId = interaction.author.id;
      } else {
        userId = interaction.user.id;
      }
      const result = `<@${userId}> ${prompt} \n [open image](${imageUrl})`;

      await reply(interaction, args, result);
    }
    catch (error) {
      console.error(error.message);
      interaction.reply(error.message);
    }
  },
};
