const { useImageGen } = require('../services/AIservice');

module.exports = {
  name: 'imagen',
  description: 'Prompts AI to generate an image.',
  async execute(message, args) {
    try {
      let prompt = args.join(' ');
      const imageUrl = await useImageGen(prompt);

      message.channel.send(`<@${message.author.id}> ${prompt} \n [open image](${imageUrl})`);
    }
    catch (error) {
      message.channel.send(error.message);
    }
  },
};
