const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const economyService = require('../services/economyService');

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
                .setName('log')
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
            return isSlash ? interaction.reply(options) : message.reply(options);
        };

        switch (subCommand) {
            case 'list':
                await listContracts({ reply, author, isSlash });
                break;
            case 'info':
                await showContractInfo({ reply }, contractId);
                break;
            case 'accept':
                await acceptContract({ reply }, author, contractId);
                break;
            case 'attempt':
                await attemptContract({ reply }, author, contractId);
                break;
            case 'log':
                await showUserContractLog({ reply }, author);
                break;
            default:
                await reply({ content: "Unknown subcommand.", ephemeral: true });
                break;
        }
    },
};

async function listContracts(responder, author) {
    const { reply, isSlash } = responder;
    const contracts = economyService.getAvailableContracts();

    if (!contracts || contracts.length === 0) {
        return reply("There are no contracts available at the moment. Please check back later.");
    }

    let page = 0;
    const totalPages = Math.ceil(contracts.length / ITEMS_PER_PAGE);

    const generateEmbed = (currentPage) => {
        const start = currentPage * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const currentContracts = contracts.slice(start, end);

        const embed = new EmbedBuilder()
            .setTitle('📜 Available Contracts')
            .setDescription('Here are the contracts available for today. Use `/contracts info <ID>` for details.')
            .setColor('#E67E22')
            .setFooter({ text: `Page ${currentPage + 1} of ${totalPages}` });

        currentContracts.forEach(contract => {
            embed.addFields({
                name: `ID: ${contract.id} | ${contract.name}`,
                value: `**Reward:** ${contract.reward} souls\n*Expires: <t:${Math.floor(new Date(contract.expires_at).getTime() / 1000)}:R>*`
            });
        });

        return embed;
    };

    const generateButtons = (currentPage) => {
        return new ActionRowBuilder()
            .addComponents(
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
    };

    const embedMessage = await reply({
        embeds: [generateEmbed(page)],
        components: [generateButtons(page)],
        fetchReply: true,
    });

    const collector = embedMessage.createMessageComponentCollector({
        filter: i => i.user.id === author.id,
        time: 60000, // 1 minute
    });

    collector.on('collect', async interaction => {
        if (interaction.customId === 'prev_page') {
            page--;
        } else if (interaction.customId === 'next_page') {
            page++;
        }

        await interaction.update({
            embeds: [generateEmbed(page)],
            components: [generateButtons(page)],
        });
    });

    collector.on('end', () => {
        embedMessage.edit({ components: [] }).catch(console.error);
    });
}

async function showContractInfo(responder, contractId) {
    const { reply } = responder;
    if (!contractId || isNaN(contractId)) {
        return reply("Please provide a valid contract ID. Example: `/contracts info 1`");
    }

    const contract = economyService.getContract(parseInt(contractId));

    if (!contract) {
        return reply("Could not find a contract with that ID.");
    }

    // Parse requirements JSON
    const requirements = contract.requirements ? JSON.parse(contract.requirements) : {};
    let reqString = '';
    if (requirements.min_rank) reqString += `**Minimum Rank:** ${requirements.min_rank}\\n`;
    if (requirements.min_damage) reqString += `**Required Damage:** ${requirements.min_damage}+\\n`;
    if (requirements.min_armor_defense) reqString += `**Required Defense:** ${requirements.min_armor_defense}+\\n`;
    if (reqString === '') reqString = 'None';

    let targetStatsString = '';
    if (requirements.target_damage) targetStatsString += `**Target Damage:** ${requirements.target_damage} 🗡️\\n`;
    if (requirements.target_defense) targetStatsString += `**Target Defense:** ${requirements.target_defense} 🛡️\\n`;
    if (targetStatsString === '') targetStatsString = 'Unknown';


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

    await reply({ embeds: [embed] });
}

async function acceptContract(responder, author, contractId) {
    const { reply } = responder;
    const userId = author.id;
    if (!contractId || isNaN(contractId)) {
        return reply("Please provide a valid contract ID. Example: `/contracts accept 1`");
    }

    const contract = economyService.getContract(parseInt(contractId));
    if (!contract) {
        return reply("Could not find a contract with that ID.");
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
            return reply(`You do not meet the rank requirement. You need to be a **${requiredRankName}** or higher to accept this contract.`);
        }
    }

    // 2. Check Damage
    if (requirements.min_damage) {
        const userDamage = economyService.getUserTotalStats(userId, 'damage');
        if (userDamage < requirements.min_damage) {
            return reply(`You do not meet the damage requirement. You need **${requirements.min_damage}** damage, but you only have **${userDamage}**.`);
        }
    }

    // 3. Check Armor Defense
    if (requirements.min_armor_defense) {
        const userDefense = economyService.getUserTotalStats(userId, 'defense');
        if (userDefense < requirements.min_armor_defense) {
            return reply(`You do not meet the armor defense requirement. You need **${requirements.min_armor_defense}** defense, but you only have **${userDefense}**.`);
        }
    }

    // --- End Requirement Checks ---

    const result = economyService.acceptContract(userId, parseInt(contractId));

    if (result.success) {
        await reply({ content: `You have accepted the contract: **${contract.name}**. Good luck!`, ephemeral: true });
    } else {
        await reply({ content: result.message, ephemeral: true });
    }
}

async function attemptContract(responder, author, contractId) {
    const { reply } = responder;
    const userId = author.id;

    if (!contractId || isNaN(contractId)) {
        return reply({ content: "Please provide a valid contract ID.", ephemeral: true });
    }

    const userContract = economyService.getUserContract(userId, contractId);
    if (!userContract) {
        return reply({ content: "You have not accepted this contract. Use `/contracts accept` first.", ephemeral: true });
    }

    if (userContract.status === 'completed' || userContract.status === 'failed') {
        return reply({ content: `You have already attempted this contract. Your result was: **${userContract.status}**.`, ephemeral: true });
    }

    const contract = economyService.getContract(contractId);
    if (!contract) {
        return reply({ content: "This contract does not seem to exist anymore.", ephemeral: true });
    }

    const requirements = contract.requirements ? JSON.parse(contract.requirements) : {};
    const { success, message, reward } = executeCombat(author.id, requirements);

    if (success) {
        economyService.updateUserContractStatus(author.id, contract.id, 'completed');
        const user = economyService.getUser(author.id);
        economyService.updateUser(author.id, { souls: user.souls + reward });
        economyService.updateUserRank(author.id, author.client);

        return reply(`**Success!** You completed the contract "${contract.name}" and earned **${reward} souls**.`);
    } else {
        economyService.updateUserContractStatus(author.id, contract.id, 'failed');
        return reply(`**Failure!** You failed to complete the contract "${contract.name}". Reason: ${message}`);
    }
}

async function showUserContractLog(responder, author) {
    const { reply } = responder;
    const userId = author.id;
    const userContracts = economyService.getUserContracts(userId);

    if (!userContracts || userContracts.length === 0) {
        return reply("You have not accepted any contracts yet. Use `/contracts list` to find one.");
    }

    const embed = new EmbedBuilder()
        .setTitle(`${author.username}'s Contract Log`)
        .setColor('#3498DB');

    userContracts.forEach(uc => {
        let statusEmoji = '📝'; // Default: accepted
        if (uc.status === 'completed') statusEmoji = '✅';
        if (uc.status === 'failed') statusEmoji = '❌';

        embed.addFields({
            name: `${statusEmoji} ID: ${uc.contract_id} | ${uc.name}`,
            value: `Status: **${uc.status}**`
        });
    });

    await reply({ embeds: [embed] });
}

/**
 * Executes the combat simulation for a contract attempt.
 * @param {string} userId - The ID of the user attempting the contract.
 * @param {object} requirements - The parsed requirements object from the contract.
 * @returns {object} An object containing the full combat results.
 */
function executeCombat(userId, requirements) {
    const userDamage = economyService.getUserTotalStats(userId, 'damage');
    const userDefense = economyService.getUserTotalStats(userId, 'defense');
    const user = economyService.getUser(userId);

    const targetDamage = requirements.target_damage || 0;
    const targetDefense = requirements.target_defense || 1; // Avoid division by zero

    // Success chance is based on the user's damage relative to the target's defense.
    // The formula gives a base 50% chance, adjusted up or down.
    const successChance = Math.max(0.1, Math.min(0.95, 0.5 + (userDamage - targetDefense / 2) / 100));
    const isSuccess = Math.random() < successChance;

    return {
        isSuccess,
        userDamage,
        userDefense,
        userSouls: user.souls,
        targetDamage,
        targetDefense,
    };
}