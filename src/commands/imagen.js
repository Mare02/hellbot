// const { useImageGen } = require('../services/AIservice');

// ToDo: Add an nsfw safe image generation AI model
module.exports = {
  name: 'imagen',
  description: 'Prompts AI to generate an image.',
  async execute(message, args) {
    try {
      // let prompt = args.join(' ');
      // const imageUrl = await useImageGen(prompt);

      // message.channel.send(`<@${message.author.id}> ${prompt} \n [open image](${imageUrl})`);
      message.channel.send('Sorry, this command is currently unavailable due to technical reasons. We are working towards the solution.');
    }
    catch (error) {
      message.channel.send(error.message);
    }
  },
};
