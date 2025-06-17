const { owner } = require('../../utils/config');
const {
    getUser,
    updateUser,
    getItem,
    getAllItems,
    addItemToUser,
    getAllCategories,
    getItemsByCategoryId,
    removeItemFromUser,
    removeAllOfItem,
    wipeUserInventory,
    getUserItem,
} = require('../../services/economyService');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'economy-cheats',
    description: 'Developer commands for economy debugging.',
    slash: false,

    async execute(ctx, args) {
        if (ctx.author.id !== owner.id) {
            return ctx.reply({ content: 'This command is restricted to the bot owner.', ephemeral: true });
        }

        const targetUser = ctx.mentions.users.first() || (args[0] ? await ctx.client.users.fetch(args[0]).catch(() => null) : null) || ctx.author;

        if (!targetUser) {
            return ctx.reply({ content: 'Could not find the specified user.', ephemeral: true });
        }

        const mainEmbed = new EmbedBuilder()
            .setTitle('Economy Cheats Panel')
            .setDescription(`Managing assets for **${targetUser.username}**.\n\nPlease select a main action.`)
            .setColor('#ffaa00')
            .setFooter({ text: `Target User ID: ${targetUser.id}` });

        const mainRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('debug_give_panel')
                    .setLabel('Give Assets')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('debug_remove_panel')
                    .setLabel('Remove Assets')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✖️')
            );

        const message = await ctx.reply({ embeds: [mainEmbed], components: [mainRow], ephemeral: true });

        const collector = message.createMessageComponentCollector({
            filter: (i) => i.user.id === ctx.author.id,
            time: 300000, // 5 minutes
            idle: 180000, // 3 minutes of inactivity
        });

        collector.on('collect', async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await handleButtonInteraction(interaction, targetUser, ctx.author);
                } else if (interaction.isStringSelectMenu()) {
                    await handleSelectMenuInteraction(interaction, targetUser, ctx.author);
                }
            } catch (error) {
                console.error('Error in economy-cheats collector:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
                } else {
                    await interaction.followUp({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
                }
            }
        });

        collector.on('end', () => {
            mainEmbed.setDescription(`Debug session for **${targetUser.username}** has ended.`).setColor('#555555');
            message.edit({ embeds: [mainEmbed], components: [] }).catch(console.error);
        });
    },
};

// --- Button Handlers ---
async function handleButtonInteraction(interaction, targetUser, author) {
    const [action, ...params] = interaction.customId.split(':');

    switch(action) {
        case 'debug_give_panel':
            await showGivePanel(interaction, targetUser);
            break;
        case 'debug_remove_panel':
            await showRemovePanel(interaction, targetUser);
            break;
        case 'debug_give_money':
            await showGiveMoneyOptions(interaction, targetUser);
            break;
        case 'debug_give_item':
            await showItemCategorySelect(interaction, targetUser, 'give');
            break;
        case 'give_to_location':
            await showMoneyAmountModal(interaction, targetUser, author, params[0], 'give');
            break;
        case 'debug_remove_money':
            await showRemoveMoneyOptions(interaction, targetUser);
            break;
        case 'remove_from_location':
            await showMoneyAmountModal(interaction, targetUser, author, params[0], 'remove');
            break;
        case 'remove_all_money':
            await confirmAction(interaction, 'Are you sure you want to wipe all money (souls and bank)?', 'confirm_wipe_money', 'cancel_action');
            break;
        case 'confirm_wipe_money':
            await interaction.deferUpdate();
            updateUser(targetUser.id, { souls: 0, bank: 0 });
            await interaction.editReply({ content: `Wiped all money from ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'debug_remove_item':
            await showItemCategorySelect(interaction, targetUser, 'remove');
            break;
        case 'remove_one_item':
            await interaction.deferUpdate();
            removeItemFromUser(targetUser.id, params[0], 1);
            await interaction.editReply({ content: `Removed 1 item from ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'remove_all_of_item':
            await interaction.deferUpdate();
            removeAllOfItem(targetUser.id, params[0]);
            await interaction.editReply({ content: `Removed all of that item from ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'remove_specific_qty':
            await showItemQuantityModal(interaction, author, params[0], 'remove', targetUser);
            break;
        case 'debug_wipe_inventory':
            await confirmAction(interaction, 'Are you sure you want to WIPE THE ENTIRE INVENTORY?', 'confirm_wipe_inv', 'cancel_action');
            break;
        case 'confirm_wipe_inv':
            await interaction.deferUpdate();
            wipeUserInventory(targetUser.id);
            await interaction.editReply({ content: `Wiped the inventory of ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'debug_give_all_items':
            await confirmAction(interaction, 'Are you sure you want to give ONE of EVERY item?', 'confirm_give_all_items', 'cancel_action');
            break;
        case 'confirm_give_all_items':
            await interaction.deferUpdate();
            const allItems = getAllItems();
            for (const item of allItems) {
                addItemToUser(targetUser.id, item.id, 1);
            }
            await interaction.editReply({ content: `Gave ${allItems.length} unique items to ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'give_all_from_category':
            await confirmAction(interaction, 'Are you sure you want to give ONE of EVERY item in this category?', `confirm_give_all_category:${params[0]}`, 'cancel_action');
            break;
        case 'confirm_give_all_category':
            await interaction.deferUpdate();
            const categoryId = params[0];
            const itemsInCategory = getItemsByCategoryId(categoryId);
            for (const item of itemsInCategory) {
                addItemToUser(targetUser.id, item.id, 1);
            }
            await interaction.editReply({ content: `Gave ${itemsInCategory.length} unique items from the category to ${targetUser.username}.`, embeds: [], components: [] });
            break;
        case 'cancel_action':
            await interaction.deferUpdate();
            await interaction.editReply({ content: 'Action cancelled.', embeds: [], components: [] });
            break;
    }
}

// --- UI Panels ---
async function showGivePanel(interaction, targetUser) {
    const embed = new EmbedBuilder().setTitle('Give Assets').setDescription(`Select asset to give to **${targetUser.username}**`).setColor('#22c55e');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('debug_give_money').setLabel('Give Money').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('debug_give_item').setLabel('Give Item').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('debug_give_all_items').setLabel('Give All Items').setStyle(ButtonStyle.Primary)
    );
    await interaction.update({ embeds: [embed], components: [row] });
}

async function showRemovePanel(interaction, targetUser) {
    const embed = new EmbedBuilder().setTitle('Remove Assets').setDescription(`Select asset to remove from **${targetUser.username}**`).setColor('#ef4444');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('debug_remove_money').setLabel('Remove Money...').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('debug_remove_item').setLabel('Remove Item...').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('debug_wipe_inventory').setLabel('Wipe Inventory').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );
    await interaction.update({ embeds: [embed], components: [row] });
}

async function showGiveMoneyOptions(interaction, targetUser) {
    const embed = new EmbedBuilder().setColor('#22c55e').setDescription(`Select where to give money to **${targetUser.username}**.`);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('give_to_location:souls').setLabel('Souls (Wallet)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('give_to_location:bank').setLabel('Bank').setStyle(ButtonStyle.Secondary)
    );
    await interaction.update({ embeds: [embed], components: [row] });
}

async function showRemoveMoneyOptions(interaction, targetUser) {
    const embed = new EmbedBuilder().setColor('#ef4444').setDescription(`Select a money removal option for **${targetUser.username}**.`);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('remove_from_location:souls').setLabel('Remove from Souls...').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('remove_from_location:bank').setLabel('Remove from Bank...').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('remove_all_money').setLabel('Wipe All Balances').setStyle(ButtonStyle.Danger)
    );
    await interaction.update({ embeds: [embed], components: [row] });
}


// --- Select Menu Handlers & Item Flows ---
async function showItemCategorySelect(interaction, targetUser, context) { // context: 'give' or 'remove'
    const categories = getAllCategories();
    if (!categories.length) return interaction.reply({ content: 'No item categories found.', ephemeral: true });

    const categoryOptions = categories.map(cat => ({ label: `${cat.emoji || '📁'} ${cat.name}`, value: cat.id.toString() }));
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`category_select:${context}`)
        .setPlaceholder('Select a category...')
        .addOptions(categoryOptions);

    const embed = new EmbedBuilder()
        .setColor(context === 'give' ? '#3b82f6' : '#f97316')
        .setDescription(`Select an item category.`);
    await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
}

async function handleSelectMenuInteraction(interaction, targetUser, author) {
    const [customId, context, ...params] = interaction.customId.split(':');

    if (customId === 'category_select') {
        const categoryId = interaction.values[0];
        const items = getItemsByCategoryId(categoryId);
        if (!items.length) return interaction.update({ content: 'This category has no items.', components: [], embeds: [] });

        const itemOptions = items.map(item => ({ label: item.name, description: `ID: ${item.id}`, value: item.id.toString() }));
        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`item_select:${context}`)
            .setPlaceholder('Select an item from this category...')
            .addOptions(itemOptions);

        const components = [new ActionRowBuilder().addComponents(itemSelect)];
        let embedDescription = 'Select an item.';

        if (context === 'give') {
            const giveAllButton = new ButtonBuilder()
                .setCustomId(`give_all_from_category:${categoryId}`)
                .setLabel('Give All From This Category')
                .setStyle(ButtonStyle.Success);
            components.push(new ActionRowBuilder().addComponents(giveAllButton));
            embedDescription = 'Select an item, or give all items from this category.';
        }

        const embed = new EmbedBuilder()
            .setColor(context === 'give' ? '#3b82f6' : '#f97316')
            .setDescription(embedDescription);

        await interaction.update({ embeds: [embed], components });
    }

    if (customId === 'item_select') {
        const itemId = interaction.values[0];
        const item = getItem(itemId);
        if (!item) return interaction.update({ content: 'Could not find that item.', components: [], embeds: [] });

        if (context === 'give') {
            await showItemQuantityModal(interaction, author, itemId, 'give', targetUser);
        } else if (context === 'remove') {
            const userItem = getUserItem(targetUser.id, itemId);
            const quantity = userItem?.quantity || 0;

            if (quantity === 0) {
                return interaction.update({
                    content: `**${targetUser.username}** does not have any **${item.name}**.`,
                    embeds: [],
                    components: []
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`Remove: ${item.name}`)
                .setDescription(`User has **${quantity}**. Choose a removal action.`)
                .setColor('#ef4444');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`remove_one_item:${itemId}`).setLabel('Remove One').setStyle(ButtonStyle.Primary).setDisabled(quantity < 1),
                    new ButtonBuilder().setCustomId(`remove_all_of_item:${itemId}`).setLabel('Remove All').setStyle(ButtonStyle.Danger).setDisabled(quantity < 1),
                    new ButtonBuilder().setCustomId(`remove_specific_qty:${itemId}`).setLabel('Remove Specific Qty...').setStyle(ButtonStyle.Secondary).setDisabled(quantity < 1)
                );

            await interaction.update({ embeds: [embed], components: [row] });
        }
    }
}


// --- Modal Handlers ---
async function showMoneyAmountModal(interaction, targetUser, author, location, context) { // context: 'give' or 'remove'
    const modal = new ModalBuilder()
        .setCustomId(`money_amount_modal:${context}:${location}`)
        .setTitle(`${context === 'give' ? 'Give' : 'Remove'} money ${context === 'give' ? 'to' : 'from'} ${targetUser.username}`)
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('money_amount').setLabel('Amount').setStyle(TextInputStyle.Short).setRequired(true)
        ));
    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
        time: 60000,
        filter: i => i.user.id === author.id && i.customId === `money_amount_modal:${context}:${location}`,
    }).catch(() => null);

    if (!submitted) return;

    await submitted.deferReply({ ephemeral: true });
    const amount = parseInt(submitted.fields.getTextInputValue('money_amount'), 10);
    if (isNaN(amount) || amount <= 0) {
        return submitted.editReply('Invalid amount provided.');
    }

    const user = getUser(targetUser.id);
    if (context === 'give') {
        if (location === 'bank') {
            updateUser(targetUser.id, { bank: user.bank + amount });
            await submitted.editReply(`Gave Ѫ${amount.toLocaleString()} to ${targetUser.username}'s bank.`);
        } else {
            updateUser(targetUser.id, { souls: user.souls + amount });
            await submitted.editReply(`Gave Ѫ${amount.toLocaleString()} souls to ${targetUser.username}.`);
        }
    } else if (context === 'remove') {
        if (location === 'bank') {
            const newBalance = Math.max(0, user.bank - amount);
            updateUser(targetUser.id, { bank: newBalance });
            await submitted.editReply(`Removed Ѫ${amount.toLocaleString()} from ${targetUser.username}'s bank.`);
        } else {
            const newBalance = Math.max(0, user.souls - amount);
            updateUser(targetUser.id, { souls: newBalance });
            await submitted.editReply(`Removed Ѫ${amount.toLocaleString()} souls from ${targetUser.username}.`);
        }
    }
}

async function showItemQuantityModal(interaction, author, itemId, context, targetUser) { // context: 'give' or 'remove'
    const modal = new ModalBuilder()
        .setCustomId(`item_quantity_modal:${context}:${itemId}`)
        .setTitle(context === 'give' ? 'Enter Item Quantity to Give' : 'Enter Item Quantity to Remove')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('item_quantity').setLabel('Quantity').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Default: 1')
        ));
    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
        time: 60000,
        filter: i => i.user.id === author.id && i.customId === `item_quantity_modal:${context}:${itemId}`,
    }).catch(() => null);

    if (!submitted) return;

    await submitted.deferReply({ ephemeral: true });
    const quantity = parseInt(submitted.fields.getTextInputValue('item_quantity'), 10) || 1;
    const item = getItem(itemId);
    if (!item) {
        return submitted.editReply('Could not find that item.');
    }

    if (context === 'give') {
        addItemToUser(targetUser.id, itemId, quantity);
        await submitted.editReply(`Gave ${quantity}x of **${item.name}** to ${targetUser.username}.`);
    } else if (context === 'remove') {
        removeItemFromUser(targetUser.id, itemId, quantity);
        await submitted.editReply(`Removed ${quantity}x of **${item.name}** from ${targetUser.username}.`);
    }
}

// --- Confirmation ---
async function confirmAction(interaction, message, confirmId, cancelId) {
    const embed = new EmbedBuilder().setTitle('Confirmation Required').setDescription(message).setColor('#facc15');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
    await interaction.update({ embeds: [embed], components: [row] });
}