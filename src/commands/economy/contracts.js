const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const economyService = require('../../services/economyService');

const ITEMS_PER_PAGE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contracts')
        .setDescription('Interact with the contracts system.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists all available contracts.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Shows detailed information about a specific contract.')
                .addIntegerOption(option =>
                    option.setName('contract-id')
                        .setDescription('The ID of the contract to view.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('accept')
                .setDescription('Accept a contract to start the mission.')
                .addIntegerOption(option =>
                    option.setName('contract-id')
                        .setDescription('The ID of the contract to accept.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('attempt')
                .setDescription('Attempt to complete an accepted contract.')
                .addIntegerOption(option =>
                    option.setName('contract-id')
                        .setDescription('The ID of the contract to attempt.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Shows your personal log of accepted contracts.')),
    slash: true,
    name: 'contracts',
    description: 'Interact with the contracts system.',
    async execute(ctx, args) {
        const isSlash = !args;
        const interaction = isSlash ? ctx : null;
        const message = isSlash ? null : ctx;
        const author = isSlash ? ctx.user : ctx.author;

        const subCommand = isSlash ? interaction.options.getSubcommand() : args[0] || 'list';
        const contractId = isSlash ? interaction.options.getInteger('contract-id') : parseInt(args[1]);

        // Helper to unify reply logic
        const reply = (options) => {
            if (isSlash) {
                // For slash commands, interaction replies are used.
                // If the interaction has been deferred or replied to, use followUp.
                if (interaction.deferred || interaction.replied) {
                    return interaction.followUp(options);
                }
                return interaction.reply(options);
            }
            // For message commands
            return message.reply(options);
        };

        const responder = {
            reply,
            author,
            interaction: isSlash ? interaction : null,
            channel: isSlash ? interaction.channel : message.channel,
        };

        switch (subCommand) {
            case 'list':
                await listContracts(responder);
                break;
            case 'info':
                await showContractInfo({ reply }, contractId);
                break;
            case 'accept':
                await acceptContract({ reply, author }, contractId);
                break;
            case 'attempt':
                await attemptContract({ reply, author }, contractId, responder.channel);
                break;
            case 'me':
                await showUserContractLog(responder);
                break;
            default:
                await reply({ content: "Unknown subcommand.", ephemeral: true });
                break;
        }
    },
};

async function listContracts(responder) {
    const { reply, author, interaction } = responder;
    // Fetch all available contracts and the user's contracts separately.
    const allAvailableContracts = economyService.getAvailableContracts(author.id);
    const userContracts = economyService.getUserContracts(author.id);
    const userContractIds = userContracts.map(uc => uc.id);

    // Filter out contracts the user has already interacted with.
    const contracts = allAvailableContracts.filter(c => !userContractIds.includes(c.id));

    if (!contracts || contracts.length === 0) {
        return reply({ content: "There are no new contracts available for you.", ephemeral: true });
    }

    let page = 0;
    const totalPages = Math.ceil(contracts.length / ITEMS_PER_PAGE);

    const generateListPage = (currentPage) => {
        const start = currentPage * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const currentContracts = contracts.slice(start, end);

        const embed = new EmbedBuilder()
            .setTitle('📜 Available Contracts')
            .setDescription('Select a contract from the dropdown to view its details and accept it.')
            .setColor('#E67E22')
            .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

        const components = [];
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1)
        );
        components.push(navRow);

        if (currentContracts.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_contract')
                .setPlaceholder('View contract details...')
                .addOptions(currentContracts.map(c => ({
                    label: c.name,
                    description: `Reward: ${c.reward} souls | ID: ${c.id}`,
                    value: c.id.toString(),
                })));
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        return { embeds: [embed], components };
    };

    const generateInfoPage = (contractId) => {
        const contract = economyService.getContract(parseInt(contractId));
        const embed = buildContractInfoEmbed(contract);

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_contract_${contractId}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!contract),
                new ButtonBuilder()
                    .setCustomId('back_to_list')
                    .setLabel('Back to List')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        return { embeds: [embed], components };
    };

    const isSlash = !!interaction;
    const initialReplyOptions = { ...generateListPage(page), fetchReply: !isSlash, ephemeral: true };
    const message = await reply(initialReplyOptions);

    const collector = (isSlash ? interaction.channel : message).createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: 180000, // 3 minutes
    });

    collector.on('collect', async i => {
        try {
            if (i.isButton()) {
                await i.deferUpdate();
                if (i.customId === 'prev_page') {
                    page = Math.max(0, page - 1);
                    await (isSlash ? i.editReply(generateListPage(page)) : i.message.edit(generateListPage(page)));
                } else if (i.customId === 'next_page') {
                    page = Math.min(totalPages - 1, page + 1);
                    await (isSlash ? i.editReply(generateListPage(page)) : i.message.edit(generateListPage(page)));
                } else if (i.customId === 'back_to_list') {
                    await (isSlash ? i.editReply(generateListPage(page)) : i.message.edit(generateListPage(page)));
                } else if (i.customId.startsWith('accept_contract_')) {
                    const contractIdToAccept = i.customId.split('_')[2];
                    const acceptResponder = {
                        reply: async (options) => i.followUp({ ...options, ephemeral: true }),
                        author
                    };
                    const result = await acceptContract(acceptResponder, parseInt(contractIdToAccept));

                    if (result && result.success) {
                        const infoPage = generateInfoPage(contractIdToAccept);
                        const acceptButton = infoPage.components[0].components.find(c => c.data.custom_id === i.customId);
                        if (acceptButton) {
                            acceptButton.setDisabled(true);
                        }
                        await (isSlash ? i.editReply(infoPage) : i.message.edit(infoPage));
                    }
                }
            } else if (i.isStringSelectMenu() && i.customId === 'select_contract') {
                await i.deferUpdate();
                const selectedContractId = i.values[0];
                await (isSlash ? i.editReply(generateInfoPage(selectedContractId)) : i.message.edit(generateInfoPage(selectedContractId)));
            }
        } catch (error) {
            console.error('Error during contract interaction:', error);
            if (!i.replied && !i.deferred) {
                await i.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(e => console.error("Failed to send error reply:", e));
            } else {
                await i.followUp({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(e => console.error("Failed to send error followup:", e));
            }
        }
    });

    collector.on('end', () => {
        if (isSlash) {
            interaction.editReply({ components: [] }).catch(console.error);
        } else {
            message.edit({ components: [] }).catch(console.error);
        }
    });
}

function buildContractInfoEmbed(contract) {
    if (!contract) {
        return new EmbedBuilder()
            .setTitle('Error')
            .setColor('#FF0000')
            .setDescription('Could not find a contract with that ID.');
    }

    const requirements = contract.requirements ? JSON.parse(contract.requirements) : {};
    let reqString = '';
    if (requirements.min_rank) reqString += `**Minimum Rank:** ${requirements.min_rank}\n`;
    if (requirements.min_damage) reqString += `**Required Damage:** ${requirements.min_damage}\n`;
    if (requirements.min_armor_defense) reqString += `**Required Defense:** ${requirements.min_armor_defense}\n`;
    if (reqString === '') reqString = 'None';

    let targetStatsString = '';
    if (requirements.target_damage) targetStatsString += `**Target Damage:** ${requirements.target_damage} 🗡️\n`;
    if (requirements.target_defense) targetStatsString += `**Target Defense:** ${requirements.target_defense} 🛡️\n`;
    if (targetStatsString === '') targetStatsString = 'None';


    const embed = new EmbedBuilder()
        .setTitle(`Contract Details: ${contract.name}`)
        .setColor('#F1C40F')
        .setDescription(contract.description)
        .addFields(
            { name: '💰 Reward', value: `${contract.reward} souls`, inline: true },
            { name: '⏳ Expires', value: `<t:${Math.floor(new Date(contract.expires_at).getTime() / 1000)}:R>`, inline: true },
            { name: '📋 Requirements', value: reqString, inline: false },
            { name: '🎯 Target Stats', value: targetStatsString, inline: false }
        )
        .setFooter({ text: `Contract ID: ${contract.id}` });

    return embed;
}

async function showContractInfo(responder, contractId) {
    const { reply } = responder;
    if (!contractId || isNaN(contractId)) {
        return reply({ content: "Please provide a valid contract ID.", ephemeral: true });
    }

    const contract = economyService.getContract(parseInt(contractId));
    if (!contract) {
        return reply({ content: `Contract with ID \`${contractId}\` not found.`, ephemeral: true });
    }
    const embed = buildContractInfoEmbed(contract);

    return reply({ embeds: [embed], ephemeral: true });
}

async function acceptContract(responder, contractId) {
    const { reply, author } = responder;
    const userId = author.id;
    if (!contractId || isNaN(contractId)) {
        return reply({ content: "Please provide a valid contract ID.", ephemeral: true });
    }

    const contract = economyService.getContract(parseInt(contractId));
    if (!contract) {
        return reply({ content: "Could not find a contract with that ID.", ephemeral: true });
    }

    // --- Requirement Checks ---
    const requirements = contract.requirements ? JSON.parse(contract.requirements) : {};
    const user = economyService.getUser(userId);

    // 1. Check Rank
    if (requirements.min_rank) {
        const ranks = economyService.getRanks();
        const requiredRankName = requirements.min_rank;
        const userRankName = user.rank;

        const requiredRank = ranks.find(r => r.name === requiredRankName);
        const userRank = ranks.find(r => r.name === userRankName);

        if (!requiredRank) {
            console.error(`Contract ID ${contract.id} requires a rank "${requiredRankName}" that does not exist.`);
            return reply({ content: "This contract has an invalid rank requirement. Please contact an admin.", ephemeral: true });
        }

        if (!userRank || userRank.netWorth < requiredRank.netWorth) {
            return reply({ content: `You do not meet the rank requirement. You need to be a **${requiredRankName}** or higher to accept this contract.`, ephemeral: true });
        }
    }

    // Get user stats for all checks
    const userDamage = economyService.getUserTotalStats(userId, 'damage');
    const userDefense = economyService.getUserTotalStats(userId, 'defense');

    // 2. Check Minimum Damage
    if (requirements.min_damage) {
        if (userDamage < requirements.min_damage) {
            return reply({ content: `You do not meet the damage requirement. You need **${requirements.min_damage}** damage, but you only have **${userDamage}**.`, ephemeral: true });
        }
    }

    // 3. Check Minimum Armor Defense
    if (requirements.min_armor_defense) {
        if (userDefense < requirements.min_armor_defense) {
            return reply({ content: `You do not meet the armor defense requirement. You need **${requirements.min_armor_defense}** defense, but you only have **${userDefense}**.`, ephemeral: true });
        }
    }

    // 4. Check if user damage is greater than target defense
    if (requirements.target_defense && userDamage < requirements.target_defense) {
        return reply({
            content: `You are not fit for this contract. Your damage must be equal or greater than the target's defense.`,
            ephemeral: true
        });
    }

    // --- End Requirement Checks ---

    const result = economyService.acceptContract(author.id, contract.id);

    if (!result.success) {
        return reply({
            content: result.message,
            ephemeral: true,
        });
    }

    return reply({
        content: `You have accepted contract **#${contract.id}: ${contract.name}**. You can attempt it at any time via \`/contracts me\` or \`/contracts attempt ${contract.id}\`. Good luck.`,
        ephemeral: true
    }).then(() => ({ success: true }));
}

async function attemptContract(responder, contractId, channel) {
    const { reply, author } = responder;
    const userId = author.id;

    if (!contractId || isNaN(contractId)) {
        return reply({ content: "Please provide a valid contract ID.", ephemeral: true });
    }

    const userContract = economyService.getUserContract(userId, contractId);
    if (!userContract) {
        return reply({ content: "You have not accepted this contract. Use `/contracts accept` first.", ephemeral: true });
    }

    if (userContract.status === 'completed' || userContract.status === 'failed') {
        return reply({ content: `You have already attempted this contract. Your result was: **${formatStatus(userContract.status)}**.`, ephemeral: true });
    }

    const contract = economyService.getContract(contractId);
    if (!contract) {
        return reply({ content: "This contract does not seem to exist anymore.", ephemeral: true });
    }

    const requirements = contract.requirements ? JSON.parse(contract.requirements) : {};
    const { success, message, reward } = executeCombat(author.id, requirements, contract);

    if (success) {
        economyService.updateUserContractStatus(author.id, contract.id, 'completed');
        const user = economyService.getUser(author.id);
        economyService.updateUser(author.id, { souls: user.souls + reward });
        economyService.updateUserRank(author.id, channel);

        const resultEmbed = new EmbedBuilder()
            .setTitle('Contract Attempt Result')
            .setDescription(message)
            .setColor('#57F287')
            .addFields({ name: 'Contract', value: `${contract.name} (\`#${contract.id}\`)` });

        if (success) {
            resultEmbed.addFields({ name: 'Reward', value: `Ѫ ${contract.reward.toLocaleString()}` });
        }

        return reply({ embeds: [resultEmbed], ephemeral: true });
    } else {
        economyService.updateUserContractStatus(author.id, contract.id, 'failed');
        return reply({ content: `**Failure!** You failed to complete the contract "${contract.name}". Reason: ${message}`, ephemeral: true });
    }
}

async function showUserContractLog(responder) {
    const { reply, author, interaction, channel } = responder;
    const userId = author.id;
    let userContracts = economyService.getUserContracts(userId);

    if (!userContracts || userContracts.length === 0) {
        return reply({ content: "You have not accepted any contracts yet. Use `/contracts list` to find one.", ephemeral: true });
    }

    let page = 0;
    const totalPages = () => Math.ceil(userContracts.length / ITEMS_PER_PAGE);

    const generateLogPage = (currentPage) => {
        const start = currentPage * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const currentContracts = userContracts.slice(start, end);

        const contractListString = currentContracts.map(uc => {
            let statusEmoji = '📝'; // in_progress
            if (uc.status === 'completed') statusEmoji = '✅';
            else if (uc.status === 'failed') statusEmoji = '❌';
            return `${statusEmoji} **${uc.name}** (\`#${uc.id}\`) - Status: ${formatStatus(uc.status)}`;
        }).join('\n');


        const embed = new EmbedBuilder()
            .setTitle(`${author.username}'s Contract Log`)
            .setColor('#3498DB')
            .setDescription(contractListString.length > 0 ? contractListString : "You have no contracts on this page.")
            .setFooter({ text: `Page ${currentPage + 1} of ${totalPages()}` });

        const components = [];
        const navRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('log_prev_page').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
            new ButtonBuilder().setCustomId('log_next_page').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(currentPage >= totalPages() - 1)
        );
        components.push(navRow);

        const attemptableContracts = currentContracts.filter(uc => uc.status === 'in_progress');

        if (attemptableContracts.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_user_contract')
                .setPlaceholder('Select a contract to view or attempt...')
                .addOptions(attemptableContracts.map(uc => {
                    return {
                        label: uc.name,
                        description: `ID: ${uc.id} - Status: ${formatStatus(uc.status)}`,
                        value: `${uc.id}:${uc.user_contract_id}`
                    };
                }));
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        return { embeds: [embed], components };
    };

    const generateAttemptPage = (contractId, userContractId) => {
        const contract = economyService.getContract(parseInt(contractId));
        const userContract = economyService.getUserContractById(parseInt(userContractId));

        const embed = buildContractInfoEmbed(contract);

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`attempt_contract_${contractId}`)
                    .setLabel('Attempt')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!contract || !userContract || userContract.status !== 'in_progress'),
                new ButtonBuilder()
                    .setCustomId('back_to_log')
                    .setLabel('Back to Log')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        return { embeds: [embed], components };
    };

    const isSlash = !!interaction;
    const initialReplyOptions = { ...generateLogPage(page), fetchReply: !isSlash, ephemeral: isSlash };
    const message = await reply(initialReplyOptions);

    const collector = (isSlash ? interaction.channel : message).createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: 180000,
    });

    collector.on('collect', async i => {
        try {
            await i.deferUpdate();
            if (i.isButton()) {
                if (i.customId === 'log_prev_page') {
                    page = Math.max(0, page - 1);
                    await (isSlash ? i.editReply(generateLogPage(page)) : i.message.edit(generateLogPage(page)));
                } else if (i.customId === 'log_next_page') {
                    page = Math.min(totalPages() - 1, page + 1);
                    await (isSlash ? i.editReply(generateLogPage(page)) : i.message.edit(generateLogPage(page)));
                } else if (i.customId === 'back_to_log') {
                    userContracts = economyService.getUserContracts(userId); // Refresh data
                    await (isSlash ? i.editReply(generateLogPage(page)) : i.message.edit(generateLogPage(page)));
                } else if (i.customId.startsWith('attempt_contract_')) {
                    const contractIdToAttempt = i.customId.split('_')[2];
                    const attemptResponder = {
                        reply: async (options) => i.followUp(options),
                        author
                    };
                    await attemptContract(attemptResponder, parseInt(contractIdToAttempt), channel);

                    userContracts = economyService.getUserContracts(userId); // Refresh data
                    const userContractToAttempt = userContracts.find(uc => uc.id === parseInt(contractIdToAttempt));
                    await (isSlash ? i.editReply(generateAttemptPage(contractIdToAttempt, userContractToAttempt.user_contract_id)) : i.message.edit(generateAttemptPage(contractIdToAttempt, userContractToAttempt.user_contract_id)));
                }
            } else if (i.isStringSelectMenu() && i.customId === 'select_user_contract') {
                const [selectedContractId, selectedUserContractId] = i.values[0].split(':');
                await (isSlash ? i.editReply(generateAttemptPage(selectedContractId, selectedUserContractId)) : i.message.edit(generateAttemptPage(selectedContractId, selectedUserContractId)));
            }
        } catch (error) {
            console.error('Error during contract log interaction:', error);
            if (!i.replied && !i.deferred) {
                await i.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(e => console.error("Failed to send error reply:", e));
            } else {
                await i.followUp({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(e => console.error("Failed to send error followup:", e));
            }
        }
    });

    collector.on('end', () => {
        if (isSlash) {
            interaction.editReply({ components: [] }).catch(console.error);
        } else {
            message.edit({ components: [] }).catch(console.error);
        }
    });
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Executes the combat simulation for a contract attempt.
 * @param {string} userId - The ID of the user attempting the contract.
 * @param {object} requirements - The parsed requirements object from the contract.
 * @param {object} contract - The contract object containing reward information.
 * @returns {object} An object containing success, message, and reward.
 */
function executeCombat(userId, requirements, contract) {
    const userDamage = economyService.getUserTotalStats(userId, 'damage');
    const userDefense = economyService.getUserTotalStats(userId, 'defense');

    const targetDamage = requirements.target_damage || 0;
    const targetDefense = requirements.target_defense || 0;

    // Handle non-combat or trivial contracts where no target stats are defined.
    if (targetDamage === 0 && targetDefense === 0) {
        return {
            success: true,
            message: `You successfully completed the contract "${contract.name}" without any confrontation.`,
            reward: contract.reward,
        };
    }

    // Success chance is based on the user's damage relative to the target's defense.
    const successChance = Math.max(0.1, Math.min(0.95, 0.5 + (userDamage - targetDefense / 2) / 100));
    const success = Math.random() < successChance;

    let message;
    if (success) {
        if (userDamage > 0) {
            message = `You defeated the target with your ${userDamage} damage against their ${targetDefense} defense!`;
        } else {
            // Successful, but with 0 damage. This implies luck or other factors.
            message = `By a stroke of luck, you managed to overcome the target despite having no weapons!`;
        }
    } else {
        if (userDamage > 0) {
            message = `You were defeated! Your ${userDamage} damage wasn't enough against the target's ${targetDefense} defense.`;
        } else {
            message = `You were defeated! You stood no chance without any weapons.`;
        }
    }

    return {
        success,
        message,
        reward: contract.reward,
    };
}
