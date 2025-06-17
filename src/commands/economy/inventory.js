const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserInventory, getItemById } = require('../../services/economyService');

const ITEMS_PER_PAGE = 10;

module.exports = {
    name: 'inventory',
    description: "Displays your or another user's inventory.",
    slash: true,
    params: [
        {
          name: 'user',
          description: "The user whose inventory you want to see.",
          type: 6, // USER type
          required: false,
        },
    ],

    async execute(ctx, args) {
        const isSlash = !args;
        let targetUser;

        if (isSlash) {
            targetUser = ctx.options.getUser('user') || ctx.user;
        } else {
            targetUser = ctx.mentions.users.first() || ctx.author;
        }

        const userInventory = getUserInventory(targetUser.id);

        if (!userInventory || userInventory.length === 0) {
            const replyContent = targetUser.id === (isSlash ? ctx.user.id : ctx.author.id)
                ? "Your inventory is empty. Visit the `/shop` to buy some items!"
                : `${targetUser.username}'s inventory is empty.`;
            return isSlash ? ctx.reply({ content: replyContent, ephemeral: true }) : ctx.reply(replyContent);
        }

        // We have item IDs, but we need full item details
        const fullInventory = userInventory.map(invItem => {
            const itemDetails = getItemById(invItem.itemId);
            return {
                ...itemDetails,
                quantity: invItem.quantity,
            };
        });

        let pageIndex = 0;

        const generatePage = () => {
            const totalPages = Math.ceil(fullInventory.length / ITEMS_PER_PAGE);
            const pageItems = fullInventory.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Infernal Inventory`)
                .setColor('#ff0000')
                .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` });

            const description = pageItems.map(item => `**${item.name}** - Quantity: ${item.quantity.toLocaleString()}`).join('\n');
            embed.setDescription(description);

            const components = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex >= totalPages - 1)
            );

            return { embeds: [embed], components: [components] };
        };

        const author = isSlash ? ctx.user : ctx.author;
        const message = await (isSlash ? ctx.reply({ ...generatePage(), fetchReply: true }) : ctx.channel.send({ ...generatePage(), fetchReply: true }));

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === author.id,
            time: 120000, // 2 minutes
        });

        collector.on('collect', async i => {
            if (i.customId === 'prev_page') {
                pageIndex--;
            } else if (i.customId === 'next_page') {
                pageIndex++;
            }
            await i.update(generatePage());
        });

        collector.on('end', () => message.edit({ components: [] }).catch(() => {}));
    },
};