require('dotenv').config();
const { usePrompt } = require('../services/AIservice');
const { validateUserPromptInput } = require('../utils/helpers');
const { reply } = require('../utils/helpers');
const messages = require('../utils/messages');
const { brainRotPrompt, chatReplyPrompt } = require('../utils/aiPrompts');
const { getMessageImageUrl, hasOversizedImageAttachment, hasUnsupportedVisionAttachment } = require('../services/chatContext');

module.exports = {
  name: 'askai',
  description: "Prompts AI to answer a question",
  slash: true,
  params: [
    {
      name: 'prompt',
      description: "The prompt to send to the AI",
      required: true,
    },
  ],
  async execute(interaction, args, options) {
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

      let systemPrompt;
      let imageUrl;
      if (interaction.reference) {
        const referencedMessage = await interaction.channel.messages.fetch(interaction.reference.messageId);
        imageUrl = getMessageImageUrl(referencedMessage);
        const referencedContent = referencedMessage.content?.trim();
        systemPrompt = [chatReplyPrompt(), referencedContent ? `Referenced message:\n${referencedContent}` : null]
          .filter(Boolean)
          .join('\n\n');

        if (hasOversizedImageAttachment(referencedMessage)) {
          systemPrompt = `${systemPrompt}\n\nReferenced image attachment was too large to inspect directly. Reply from the text context and mention that if needed.`;
        }

        if (hasUnsupportedVisionAttachment(referencedMessage)) {
          systemPrompt = `${systemPrompt}\n\nReferenced image attachment is an animated GIF, which you cannot inspect directly. Reply from the text context and mention that if needed.`;
        }
      }
      else if (options && options.useBrainRotPrompt) {
        systemPrompt = brainRotPrompt();
      }

      const answer = await usePrompt(prompt, systemPrompt, imageUrl, undefined, {
        channel: interaction.channel,
      });
      await reply(interaction, args, answer);
    }
    catch (error) {
      console.error(error);
      if (!args) {
        await interaction.editReply(error.message);
      } else {
        await interaction.reply(error.message);
      }
    }
  },
};
