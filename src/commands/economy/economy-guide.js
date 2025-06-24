const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

const GUIDE_PAGES = [
    // Page 1: Welcome & Core Concepts
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 1/6)**')
        .setDescription('Welcome, lost soul, to the bustling economy of Hell! Here, wealth is measured in **Souls (Ѫ)**. Amass your fortune, climb the leaderboards, and become a titan of the underworld.')
        .addFields(
            { name: 'Ѫ What are Souls?', value: 'Souls are the official currency of Hell. You earn them, spend them, and maybe... *steal* them.' },
            { name: '/profile', value: 'Your identity card in Hell. Use this to check your Soul balance, see your most valuable items, and track your net worth.' },
            { name: '/work', value: 'The most reliable way to earn Souls. Perform a menial task for the overlords and get paid. The more tools you own, the higher your payout!' }
        ),
    // Page 2: Managing Your Fortune
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 2/6)**')
        .setDescription('A wise soul doesn\'t keep all their fortune in one pocket. Use the Infernal Bank to protect your assets.')
        .addFields(
            { name: '/balance', value: 'Shows your on-hand Souls (wallet) and your banked Souls.' },
            { name: '/deposit', value: 'Deposit Souls into the bank. Banked souls are safe from robbers!' },
            { name: '/withdraw', value: 'Withdraw Souls from the bank to your wallet for spending.' },
            { name: '/leaderboard', value: 'See the top 10 wealthiest people in the server, ranked by their total net worth.' }
        ),
    // Page 3: The Infernal Market
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 3/6)**')
        .setDescription('The market is where you turn your hard-earned Souls into tangible assets. Use the shop to get ahead.')
        .addFields(
            { name: '/shop', value: 'Browse and purchase a wide variety of items, from tools that boost your earnings to powerful consumables, using the interactive menu.' },
            { name: '/inventory', value: 'Check all the items you currently own.' },
            { name: '/use', value: 'Use a consumable item from your inventory for a special effect.' }
        ),
    // Page 4: Infernal Investments
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 4/6)**')
        .setDescription('Put your Souls to work for you! Purchase assets that generate passive income over time.')
        .addFields(
            { name: '/investments', value: 'Browse and purchase available long-term assets that generate Souls automatically using the interactive menu.' },
            { name: '/collect', value: 'Claim the Souls that your investments have generated. If it\'s too soon, it will tell you when you can collect next.' }
        ),
    // Page 5: High-Stakes Contracts
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 5/6)**')
        .setDescription('Ready for a real challenge? Take on dangerous contracts for handsome rewards. New contracts are available daily.')
        .addFields(
            { name: '/contracts list', value: 'View the list of currently available contracts.' },
            { name: '/contracts info <ID>', value: 'Get all the details about a specific contract, including its requirements.' },
            { name: '/contracts accept <ID>', value: 'Formally accept a mission. Make sure you meet the requirements first!' },
            { name: '/contracts attempt <ID>', value: 'Try to complete an accepted contract. Success depends on your gear and a bit of luck.' },
            { name: '/contracts me', value: 'Check your personal log to see the status of all contracts you have accepted.' }
        ),
    // Page 6: Player vs. Player
    new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('**The Infernal Economy: A Guide (Page 6/6)**')
        .setDescription('Feeling brave? Interact with other souls, for better or for worse.')
        .addFields(
            { name: '/give', value: 'Feeling generous? Transfer some of your Souls directly to another user.' },
            { name: '/rob', value: 'The ultimate risk-reward. Attempt to steal a portion of another user\'s on-hand Souls. **Be Warned:** Failure comes with a hefty penalty, and you can only attempt a heist once every **60 minutes**.' }
        )
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy-guide')
        .setDescription('Displays a detailed guide to the economy game.'),
    name: 'economy-guide',
    description: 'Displays a detailed guide to the economy game.',
    slash: true,
    cooldown: 5,
    async execute(ctx) {
        const author = ctx.user || ctx.author;
        let currentPage = 0;

        const getRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === GUIDE_PAGES.length - 1)
            );
        };

        const replyOptions = {
            embeds: [GUIDE_PAGES[currentPage]],
            components: [getRow(currentPage)],
            fetchReply: true,
        };

        const message = await (ctx.reply ? ctx.reply(replyOptions) : ctx.channel.send(replyOptions));

        const collector = message.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 180000, // 3 minutes
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'prev') {
                currentPage--;
            } else if (interaction.customId === 'next') {
                currentPage++;
            }

            await interaction.update({
                embeds: [GUIDE_PAGES[currentPage]],
                components: [getRow(currentPage)],
            });
        });

        collector.on('end', () => {
            const finalRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_disabled')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next_disabled')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            message.edit({ components: [finalRow] });
        });
    },
};