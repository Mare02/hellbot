const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getAllCategories, getItemsByCategoryId, getItemById, getUser, updateUser, addItemToUser, getUserItem } = require('../../services/economyService');

const ITEMS_PER_PAGE = 5;

module.exports = {
    name: 'shop',
    description: 'Browse the Infernal Black Market.',
    slash: true,

    async execute(ctx) {
        const categories = getAllCategories();
        if (!categories || categories.length === 0) {
            return ctx.reply({ content: 'The shop is currently empty.', ephemeral: true });
        }

        let categoryIndex = 0;
        let itemPageIndex = 0;
        const author = ctx.user || ctx.author;

        const generatePage = () => {
            const category = categories[categoryIndex];
            const items = getItemsByCategoryId(category.id);
            const totalItemPages = Math.ceil(items.length / ITEMS_PER_PAGE);
            const pageItems = items.slice(itemPageIndex * ITEMS_PER_PAGE, (itemPageIndex + 1) * ITEMS_PER_PAGE);

            const embed = new EmbedBuilder()
                .setTitle(`Infernal Black Market - ${category.name} ${category.emoji || ''}`)
                .setDescription(category.description || 'Use the dropdown below to purchase an item.')
                .setColor('#ff0000')
                .setFooter({ text: `Category ${categoryIndex + 1}/${categories.length} | Page ${itemPageIndex + 1}/${totalItemPages || 1}` });

            const components = [];
            const navRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_cat').setLabel('◀️ Category').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('next_cat').setLabel('Category ▶️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️ Page').setStyle(ButtonStyle.Primary).setDisabled(itemPageIndex === 0),
                new ButtonBuilder().setCustomId('next_page').setLabel('Page ➡️').setStyle(ButtonStyle.Primary).setDisabled(itemPageIndex >= totalItemPages - 1)
            );
            components.push(navRow);

            if (pageItems.length === 0) {
                embed.addFields({ name: 'No items found', value: 'There are no items in this category yet.' });
            } else {
                pageItems.forEach(item => {
                    embed.addFields({
                        name: `${item.name} - Ѫ ${item.price.toLocaleString()}`,
                        value: item.description,
                        inline: false
                    });
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('buy_item_select')
                    .setPlaceholder('Select an item to purchase...')
                    .addOptions(pageItems.map(item => ({
                        label: item.name,
                        description: `Price: Ѫ ${item.price.toLocaleString()}`,
                        value: item.id.toString(),
                    })));

                components.push(new ActionRowBuilder().addComponents(selectMenu));
            }

            return { embeds: [embed], components };
        };

        const message = await ctx.reply({
            ...generatePage(),
            fetchReply: true,
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === author.id,
            time: 180000,
        });

        collector.on('collect', async i => {
            if (i.isButton()) {
                switch (i.customId) {
                    case 'prev_cat':
                        categoryIndex = (categoryIndex - 1 + categories.length) % categories.length;
                        itemPageIndex = 0;
                        break;
                    case 'next_cat':
                        categoryIndex = (categoryIndex + 1) % categories.length;
                        itemPageIndex = 0;
                        break;
                    case 'prev_page':
                        itemPageIndex--;
                        break;
                    case 'next_page':
                        itemPageIndex++;
                        break;
                }
                await i.update(generatePage());
            }

            if (i.isStringSelectMenu()) {
                if (i.customId === 'buy_item_select') {
                    const itemId = i.values[0];
                    const item = getItemById(itemId);
                    if (!item) {
                        return i.reply({ content: "This item doesn't exist.", ephemeral: true });
                    }
                    await showQuantityModal(i, item);
                }
            }
        });

        collector.on('end', () => message.edit({ components: [] }).catch(() => {}));
    },
};

async function showQuantityModal(interaction, item) {
    const modal = new ModalBuilder()
        .setCustomId(`buy_item_modal:${item.id}`)
        .setTitle(`Buy: ${item.name}`);

    const quantityInput = new TextInputBuilder()
        .setCustomId('quantity_input')
        .setLabel('How many would you like to buy?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue('1');

    const actionRow = new ActionRowBuilder().addComponents(quantityInput);
    modal.addComponents(actionRow);
    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
        time: 60000,
        filter: i => i.customId === `buy_item_modal:${item.id}` && i.user.id === interaction.user.id,
    }).catch(() => null);

    if (!submitted) return;

    const quantity = parseInt(submitted.fields.getTextInputValue('quantity_input'), 10);
    if (isNaN(quantity) || quantity < 1) {
        return submitted.reply({ content: 'Please provide a valid quantity.', ephemeral: true });
    }
    
    const author = submitted.user;
    const userData = getUser(author.id);
    const totalCost = item.price * quantity;

    if (userData.souls < totalCost) {
        return submitted.reply({ content: `You don't have enough souls. You need **Ѫ ${totalCost.toLocaleString()}** but you only have **Ѫ ${userData.souls.toLocaleString()}**.`, ephemeral: true });
    }

    if (item.unique_item) {
        if (quantity > 1) {
            return submitted.reply({ content: `You can only own one **${item.name}** at a time.`, ephemeral: true });
        }
        const userItem = getUserItem(author.id, item.id);
        if (userItem) {
            return submitted.reply({ content: `You already own a **${item.name}**.`, ephemeral: true });
        }
    }

    updateUser(author.id, { souls: userData.souls - totalCost });
    addItemToUser(author.id, item.id, quantity);

    await submitted.reply({ content: `You have successfully purchased **${quantity}x ${item.name}** for **Ѫ ${totalCost.toLocaleString()}**!`, ephemeral: true });
}