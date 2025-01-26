const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../utils/helpers');
const subdesignshelp = require('../commands/subdesignshelp');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'submitdesign',
  description: 'Submit a design with images and a blueprint URL.',
  slash: true,
  options: [
    {
      name: 'blueprint',
      description: 'Blueprint URL (optional if blueprint ZIP file is attached)',
      type: 3, // STRING type
      required: false
    },
    {
      name: 'Image',
      description: 'Upload your image (required)',
      type: 11, // ATTACHMENT type
      required: true
    },
    {
      name: 'ZIP',
      description: 'Upload blueprint ZIP file (optional)',
      type: 11,
      required: false
    },
    {
      name: 'Additional File',
      description: 'Upload additional file (optional)',
      type: 11,
      required: false
    },
    {
      name: 'Additional File 2',
      description: 'Upload additional file (optional)',
      type: 11,
      required: false
    }
  ],
  async execute(interaction) {
    const staffChannel = interaction.guild.channels.cache.find(channel => channel.name === 'subscriber-designs-submissions');

    try {
      let attachments = [];
      let blueprintUrl;
      let user;

      // Handle both slash commands and regular commands
      if (interaction.options) { // Slash command
        const file0 = interaction.options.getAttachment('Image');
        const file1 = interaction.options.getAttachment('ZIP');
        const file2 = interaction.options.getAttachment('Additional File');
        const file3 = interaction.options.getAttachment('Additional File 2');

        if (file0) attachments.push(file0);
        if (file1) attachments.push(file1);
        if (file2) attachments.push(file2);
        if (file3) attachments.push(file3);

        blueprintUrl = interaction.options.getString('blueprint');
        user = interaction.user;
      } else { // Regular command
        attachments = Array.from(interaction.attachments.values());
        const args = interaction.content.trim().split(/\s+/);
        blueprintUrl = args[1] || null;
        user = interaction.author;
      }

      // Show help if no attachments and no blueprint URL argument
      if (attachments.length === 0 && !blueprintUrl) {
        return subdesignshelp.execute(interaction);
      }

      // Check if there are any attachments
      if (attachments.length === 0) {
        return interaction.reply({ content: 'Please attach at least one image of your design.' });
      }

      // Validate file types and check for at least one image
      const validImageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const validFileTypes = [...validImageTypes, '.zip'];
      let hasImageFile = false;
      let hasZipFile = false;

      // Process each attachment
      for (const attachment of attachments) {
        const fileExtension = path.extname(attachment.name).toLowerCase();

        if (!validFileTypes.includes(fileExtension)) {
          return interaction.reply({ content: `Invalid file type for ${attachment.name}. Please upload only image or zip files.`, ephemeral: true });
        }

        if (validImageTypes.includes(fileExtension)) {
          hasImageFile = true;
        }
        if (fileExtension === '.zip') {
          hasZipFile = true;
        }
      }

      // Validate URL format if provided
      if (blueprintUrl) {
        try {
          new URL(blueprintUrl);
        } catch {
          return interaction.reply({ content: 'Please provide a valid blueprint URL.', ephemeral: true });
        }
      }

      // Check required submissions
      if (!hasImageFile) {
        return interaction.reply({ content: 'You must include at least one image with your submission.', ephemeral: true });
      }

      if (!hasZipFile && !blueprintUrl) {
        return interaction.reply({ content: 'You must include either a blueprint ZIP file or a blueprint sharing URL with your submission.', ephemeral: true });
      }

      const username = user.username;
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

      // Save design metadata in user's folder
      const metadataPath = path.join(userPath, 'metadata.json');
      let metadata = [];

      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        // Check for existing submissions from the same user
        const existingSubmissions = metadata.filter(entry => entry.userId === user.id);
        if (existingSubmissions.length) {
          if (staffChannel) {
            const existingEmbed = new EmbedBuilder()
              .setColor('#ff9900') // Orange color for warning
              .setTitle('Duplicate Submission Attempt')
              .setDescription(`${user.username} (ID: ${user.id}) tried to submit a design but has already sent a submission.`)
              .addFields(
                { name: 'Action Required', value: 'Please contact the user to check if they need help with their submission.' }
              )
              .setTimestamp();

            staffChannel.send({ embeds: [existingEmbed] });
          }

          return interaction.reply({ content: `You have already sent a submission. Please contact a staff member or the server owner if you need to update your submission.`, ephemeral: true });
        }
      }

      // Process and save each attachment
      const uploadResults = [];
      for (const attachment of attachments) {
        const fileName = attachment.name;
        const uploadResult = await uploadFile(attachment, fileName, `${categoryFolderName}/${username}`, mediaPath);

        if (!uploadResult.success) {
          return interaction.reply({ content: `You have already submitted a file with this name.`, ephemeral: true });
        }
        uploadResults.push(uploadResult);
      }

      // Add new submissions to metadata
      for (const uploadResult of uploadResults) {
        const fileExtension = path.extname(uploadResult.fileName).toLowerCase();
        metadata.push({
          fileName: uploadResult.fileName,
          blueprintUrl: blueprintUrl,
          username: username,
          userId: user.id,
          submittedAt: new Date().toISOString(),
          fileType: fileExtension.substring(1)
        });
      }

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Create success message
      const filesList = uploadResults.map(result => {
        const fileExtension = path.extname(result.fileName).toLowerCase();
        return `${fileExtension === '.zip' ? 'ZIP' : 'Image'}: ${result.fileName}`;
      }).join('\n');

      const successMessage = `✅ Design(s) submitted successfully!\n${filesList}${blueprintUrl ? `\nBlueprint URL: ${blueprintUrl}` : ''}`;

      // Send notification to staff channel
      if (staffChannel) {
        const successEmbed = new EmbedBuilder()
          .setColor('#00ff00') // Green color for success
          .setTitle('New Design Submission')
          .setDescription(`From: ${user.username} (ID: ${user.id})`)
          .addFields(
            { name: 'Files', value: filesList },
            blueprintUrl ? { name: 'Blueprint URL', value: blueprintUrl } : null
          );

        staffChannel.send({ embeds: [successEmbed] });
      }

      interaction.reply({ content: successMessage });
    }
    catch (error) {
      console.error('Command execution error:', error);
      if (staffChannel) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff0000') // Red color for error
          .setTitle('Submission Error')
          .setDescription(`${user.username} (ID: ${user.id}) tried to submit a design but an error occurred.`)
          .addFields(
            { name: 'Action Required', value: 'Please contact the user to check if they need help with their submission.' }
          );

        staffChannel.send({ embeds: [errorEmbed] });
      }
      return interaction.reply({ content: 'An unexpected error occurred while submitting your design. Please try again later.', ephemeral: true });
    }
  },
};
