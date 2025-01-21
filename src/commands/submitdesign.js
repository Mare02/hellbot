const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/helpers');

module.exports = {
  name: 'submitdesign',
  description: 'Submit a design with an image and blueprint URL.',
  async execute(message, args) {
    try {
      // Check if there's exactly one attachment
      if (message.attachments.size !== 1) {
        return message.reply('Please attach exactly one image of your design.');
      }

      const attachment = message.attachments.first();
      const blueprintUrl = args[0];

      if (!blueprintUrl) {
        return message.reply('Please provide the blueprint sharing URL.');
      }

      // Validate URL format (basic check)
      try {
        new URL(blueprintUrl);
      } catch {
        return message.reply('Please provide a valid URL.');
      }

      // Validate file type
      const validImageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const fileExtension = path.extname(attachment.name).toLowerCase();

      if (!validImageTypes.includes(fileExtension)) {
        return message.reply('Please upload a valid image file (PNG, JPG, JPEG, GIF, or WEBP).');
      }

      const username = message.author.username;
      const categoryFolderName = 'submissions';

      // Create base media directory and user's directory
      const mediaPath = path.join(process.cwd(), 'media');
      const submissionsPath = path.join(mediaPath, categoryFolderName);
      const userPath = path.join(submissionsPath, username);

      // Ensure directories exist
      if (!fs.existsSync(mediaPath)) {
        fs.mkdirSync(mediaPath, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(submissionsPath)) {
        fs.mkdirSync(submissionsPath, { recursive: true, mode: 0o755 });
      }
      if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true, mode: 0o755 });
      }

      // Generate a unique filename using timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `design_${timestamp}${fileExtension}`;

      // Upload the file to user's directory
      const uploadResult = await uploadFile(attachment, fileName, `${categoryFolderName}/${username}`, mediaPath);

      if (!uploadResult.success) {
        return message.reply(`Failed to save design: ${uploadResult.error}`);
      }

      // Save design metadata in user's folder
      const metadataPath = path.join(userPath, 'metadata.json');
      let metadata = [];

      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }

      metadata.push({
        fileName: uploadResult.fileName,
        blueprintUrl: blueprintUrl,
        username: username,
        userId: message.author.id,
        submittedAt: new Date().toISOString()
      });

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      return message.reply(`✅ Design submitted successfully!\nImage: ${uploadResult.fileName}\nBlueprint URL: ${blueprintUrl}`);
    } catch (error) {
      console.error('Command execution error:', error);
      return message.reply('An unexpected error occurred while submitting your design. Please try again later.');
    }
  },
};
