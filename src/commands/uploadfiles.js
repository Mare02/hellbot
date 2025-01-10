const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { ADMIN } = require('../utils/roles');

module.exports = {
  name: 'uploadfiles',
  description: 'Upload files.',
  perm: ADMIN,
  async execute(message, args) {
    try {
      // Check if there are any attachments
      if (message.attachments.size === 0) {
        return message.reply('Please attach one or more files to upload.');
      }

      // Define media types and their folders
      const mediaTypes = {
        images: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
        audio: ['.mp3', '.wav', '.ogg', '.m4a'],
        videos: ['.mp4', '.webm', '.mov', '.avi'],
        documents: ['.pdf']
      };

      // Create base media directory
      const mediaPath = path.join(process.cwd(), 'media');

      // Create all necessary directories
      try {
        // Create main media directory if it doesn't exist
        if (!fs.existsSync(mediaPath)) {
          fs.mkdirSync(mediaPath, { recursive: true, mode: 0o755 });
          console.log(`Created media directory at: ${mediaPath}`);
        }

        // Create subdirectories for each media type
        for (const type of Object.keys(mediaTypes)) {
          const typePath = path.join(mediaPath, type);
          if (!fs.existsSync(typePath)) {
            fs.mkdirSync(typePath, { recursive: true, mode: 0o755 });
            console.log(`Created ${type} directory at: ${typePath}`);
          }
        }
      } catch (error) {
        console.error('Failed to create directories:', error);
        return message.reply(`Error creating directories: ${error.message}`);
      }

      // Status message
      await message.channel.send(`Processing ${message.attachments.size} file(s)...`);

      const results = [];
      let index = 0;

      // Process each attachment
      for (const [, attachment] of message.attachments) {
        const originalFileName = attachment.name;
        const fileExtension = path.extname(originalFileName).toLowerCase();

        // Determine media type folder
        let mediaTypeFolder = null;
        for (const [type, extensions] of Object.entries(mediaTypes)) {
          if (extensions.includes(fileExtension)) {
            mediaTypeFolder = type;
            break;
          }
        }

        if (!mediaTypeFolder) {
          results.push(`❌ ${originalFileName}: Unsupported file type.`);
          continue;
        }

        // Determine final filename (custom or original)
        let fileName;
        if (args[index]) {
          // If user provided a name but no extension, add the original extension
          fileName = args[index].includes('.') ? args[index] : `${args[index]}${fileExtension}`;
        } else {
          fileName = originalFileName;
        }

        // Basic file name sanitization
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Check if file already exists in the appropriate subfolder
        const filePath = path.join(mediaPath, mediaTypeFolder, sanitizedFileName);
        if (fs.existsSync(filePath)) {
          results.push(`❌ ${sanitizedFileName}: A file with this name already exists.`);
          continue;
        }

        try {
          const response = await fetch(attachment.url);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          const buffer = await response.buffer();

          // Check if buffer is empty
          if (!buffer || buffer.length === 0) {
            throw new Error('Received empty file');
          }

          // Write file with error handling
          await fs.promises.writeFile(filePath, buffer);

          // Verify file was written
          if (!fs.existsSync(filePath)) {
            throw new Error('File was not written successfully');
          }

          results.push(`✅ ${sanitizedFileName}: Saved successfully in the ${mediaTypeFolder} folder`);
        } catch (error) {
          console.error('Error processing file:', error);
          results.push(`❌ ${sanitizedFileName}: ${error.message}`);
        }

        index++;
      }

      // Send results as a formatted message
      const resultMessage = results.join('\n');
      return message.channel.send(`Upload Results:\n${resultMessage}`);
    }
    catch (error) {
      console.error('Command execution error:', error);
      return message.reply('An unexpected error occurred. Please try again later.');
    }
  },
};
