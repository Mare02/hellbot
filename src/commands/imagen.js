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
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const question = interaction.options.getString('prompt');

      let prompt = validateUserPromptInput(question, interaction.channel);
      if (!prompt) return;

      const imageUrl = await useImageGen(prompt);

      interaction.editReply(`<@${interaction.user.id}> ${prompt} \n [open image](${imageUrl})`);
    }
    catch (error) {
      interaction.reply(error.interaction);
    }
  },
};
