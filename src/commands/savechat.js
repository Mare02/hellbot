const fs = require('fs');
const path = require('path');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'savechat',
  description: `Save chat history to a text file.`,
  perm: ADMIN,
  async execute(message, args) {
    try {
      // Parse days argument, default to 7 if not specified or invalid
      const days = args.length > 0 ? parseInt(args[0]) : 7;

      if (isNaN(days) || days < 1) {
        return message.reply('Please provide a valid number of days (minimum 1).');
      }

      // Create documents directory if it doesn't exist
      const mediaPath = path.join(process.cwd(), 'media', 'documents');
      if (!fs.existsSync(mediaPath)) {
        fs.mkdirSync(mediaPath, { recursive: true, mode: 0o755 });
      }

      // Calculate the start date based on specified days
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - days);

      // Send initial status message
      const statusMsg = await message.channel.send(`📥 Fetching messages from the last ${days} days...`);

      const messages = [];
      let lastId = message.id;
      let messageCount = 0;
      let shouldContinue = true;

      // Fetch messages in chunks of 100
      while (shouldContinue) {
        const options = { limit: 100, before: lastId };
        const fetchedMessages = await message.channel.messages.fetch(options);

        if (fetchedMessages.size === 0) break;

        // Process fetched messages
        for (const msg of fetchedMessages.values()) {
          // Stop if message is older than specified days
          if (msg.createdAt < startDateObj) {
            shouldContinue = false;
            break;
          }

          // Handle message content
          const content = msg.content.trim() || '[embed]';
          messages.push(`${msg.author.tag}: ${content}`);

          // Handle attachments
          if (msg.attachments.size > 0) {
            msg.attachments.forEach(attachment => {
              messages.push(`${msg.author.tag}: [Attachment: ${attachment.url}]`);
            });
          }
        }

        messageCount += fetchedMessages.size;
        await statusMsg.edit(`📥 Fetched ${messageCount} messages...`);

        // Update lastId for next iteration
        lastId = fetchedMessages.last().id;
      }

      // If no messages were found
      if (messages.length === 0) {
        await statusMsg.edit(`No messages found from the last ${days} days.`);
        return;
      }

      // Reverse messages to get chronological order
      messages.reverse();

      // Create filename with channel name and date range
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = startDateObj.toISOString().split('T')[0];
      const sanitizedChannelName = message.channel.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedChannelName}_chat_${startDate}_to_${endDate}.txt`;
      const filePath = path.join(mediaPath, fileName);

      // Write messages to file
      const chatContent = messages.join('\n');
      await fs.promises.writeFile(filePath, chatContent, 'utf8');

      // Send completion message
      await statusMsg.edit(
        `✅ Chat history saved!\n📁 File: \`${fileName}\`\n📊 Total messages: ${messages.length}\n📅 Period: Last ${days} days`
      );

    } catch (error) {
      console.error('Command execution error:', error);
      return message.reply('An error occurred while saving the chat history. Please try again later.');
    }
  },
};