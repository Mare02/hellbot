module.exports = {
  name: 'gettopusers',
  description: 'Gets top 10 users in the server by number of messages.',
  async execute(message, args) {
    try {
      message.channel.send('Test top 10 users - macer retard.');
    } catch (error) {
      console.error(error);
    }
  },
};
