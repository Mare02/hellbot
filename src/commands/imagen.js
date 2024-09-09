const { useImageGen } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');

module.exports = {
  name: 'imagen',
  description: 'Prompts AI to generate an image.',
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

      let prompt = validateUserPromptInput(userInput, interaction.channel);
      if (!prompt) return;

      const imageUrl = await useImageGen(prompt);

      let userId;
      if (args) {
        userId = interaction.author.id;
      } else {
        userId = interaction.user.id;
      }
      const result = `<@${userId}> ${prompt} \n [open image](${imageUrl})`;

      if (!args) {
        interaction.editReply(result);
      } else {
        interaction.reply(result);
      }
    }
    catch (error) {
      console.error(error.message);
      interaction.reply(error.message);
    }
  },
};
