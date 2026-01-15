import { Client, GatewayIntentBits, Events, type Channel, type TextChannel, type Message, type ChatInputCommandInteraction, REST, Routes, SlashCommandBuilder, DiscordAPIError, HTTPError } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'cron';
import * as helper from './helpers/bot.helpers.js'
import type { FetchOptions, TimePeriod } from './interfaces/bot.interfaces.js';
import { parseDiscordAPIError } from './utils/error.util.js';


dotenv.config();

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
const MAX_DESC_LENGTH = 4000;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function calculateCutoffTimestamp(period: TimePeriod, number?: number): number | undefined {
    if (period === 'alltime') {
        return undefined;
    }

    if (!number || number <= 0) {
        throw new Error('Number must be provided and greater than 0 for time periods');
    }

    const now = Date.now();
    const msPerDay = ONE_DAY_MS;

    switch (period) {
        case 'days':
            return now - (number * msPerDay);
        case 'weeks':
            return now - (number * msPerDay * 7);
        case 'months':
            return now - (number * msPerDay * 30);
        case 'years':
            return now - (number * msPerDay * 365);
        default:
            return undefined;
    }
}

function getPeriodDisplayName(period: TimePeriod, number?: number): string {
    if (period === 'alltime') {
        return 'All Time';
    }

    const periodName = period.charAt(0).toUpperCase() + period.slice(1);
    return number ? `Last ${number} ${periodName}` : periodName;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});


client.once('ready', async () => {
    try {
        if (!client || !client.user) {
            throw Error("Client missing")
        }
        console.log(`Logged in as ${client.user.tag}`);

        await registerCommands();

        const job = new cron.CronJob('0 08 1 * *', sendMessage);
        job.start();
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Failed to send message:', error);
        }
        else {
            console.error('Unknown error:', error);
        }

    }

});

async function registerCommands() {
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('shame')
                .setDescription('Get missed attacks summary for a time period')
                .addStringOption(option =>
                    option
                        .setName('period')
                        .setDescription('Time period to check')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Time', value: 'alltime' },
                            { name: 'Days', value: 'days' },
                            { name: 'Weeks', value: 'weeks' },
                            { name: 'Months', value: 'months' },
                            { name: 'Years', value: 'years' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('Number of time periods (required if period is not "All Time")')
                        .setRequired(false)
                        .setMinValue(1)
                )
        ];

        if (!process.env.BOT_TOKEN) {
            throw new Error('BOT_TOKEN environment variable is missing');
        }
        const rest = new REST().setToken(process.env.BOT_TOKEN);

        console.log('Started refreshing application (/) commands.');

        const clientId = client.user?.id;
        if (!clientId) {
            throw new Error('Client ID not available');
        }

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] },
        );
        console.log('Cleared existing global commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        if (error instanceof DiscordAPIError || error instanceof HTTPError) {
            const errorMessage = parseDiscordAPIError(error);
            console.error('Error registering commands:', errorMessage);
            throw new Error(`Failed to register commands: ${errorMessage}`);
        }
        console.error('Error registering commands:', error);
        throw error;
    }
}


client.on(Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'shame') {
            await interaction.deferReply();

            const channel = interaction.channel;
            if (!channel) {
                throw new Error("Could not get channel")
            }

            const periodString = interaction.options.getString('period', true);
            if (!helper.isTimePeriod(periodString)) {
                await interaction.editReply({
                    content: '❌ Invalid time period specified. Please select a valid period from the options.'
                });
                return;
            }
            const period = periodString;
            const number = interaction.options.getInteger('number') ?? undefined;

            if (period !== 'alltime' && !number) {
                await interaction.editReply({
                    content: '❌ Please provide a number when selecting a time period (Days, Weeks, Months, or Years). The "All Time" option does not require a number.'
                });
                return;
            }

            let cutoffTimestamp: number | undefined;
            let periodDisplayName: string;

            try {
                cutoffTimestamp = calculateCutoffTimestamp(period, number);
                periodDisplayName = getPeriodDisplayName(period, number);
            } catch (error) {
                if (error instanceof Error) {
                    await interaction.editReply({
                        content: `❌ ${error.message}`
                    });
                    return;
                }
                throw error;
            }

            const missedAttacksSummary = await getMissedAttacks(channel, { cutoffTimestamp });
            if (!missedAttacksSummary) {
                await interaction.editReply({
                    embeds: [
                        {
                            title: `🔔 Missed Attacks Summary - ${periodDisplayName}`,
                            description: 'No missed attacks 🎉',
                            color: 0xed4245,
                        }
                    ]
                });
            } else {
                const lines = missedAttacksSummary.split('\n');
                const chunks: string[] = [];
                let currentChunk = '';

                for (const line of lines) {
                    if ((currentChunk.length + line.length + 1) > MAX_DESC_LENGTH) {
                        chunks.push(currentChunk);
                        currentChunk = '';
                    }
                    currentChunk += (currentChunk ? '\n' : '') + line;
                }
                if (currentChunk) {
                    chunks.push(currentChunk);
                }

                await interaction.editReply({
                    embeds: [
                        {
                            title: `🔔 Missed Attacks Summary - ${periodDisplayName}`,
                            description: chunks[0],
                            color: 0xed4245,
                        }
                    ]
                });

                for (let i = 1; i < chunks.length; i++) {
                    await interaction.followUp({
                        embeds: [
                            {
                                description: chunks[i],
                                color: 0xed4245,
                            }
                        ]
                    });
                }
            }
        }
    } catch (error: unknown) {
        const commandInteraction = interaction as ChatInputCommandInteraction;
        let errorMessage = '❌ An unexpected error occurred. Please try again later.';

        if (error instanceof DiscordAPIError || error instanceof HTTPError) {
            const parsedError = parseDiscordAPIError(error);
            console.error('Discord API error:', parsedError, error);

            if (parsedError.includes('Invalid') || parsedError.includes('validation')) {
                errorMessage = `❌ ${parsedError}`;
            } else {
                errorMessage = `❌ Discord API error: ${parsedError}`;
            }
        } else if (error instanceof Error) {
            console.error('Command error:', error.message, error.stack);

            if (error.message.includes('channel')) {
                errorMessage = '❌ Could not access the channel. Please make sure the bot has the necessary permissions.';
            } else if (error.message.includes('fetch') || error.message.includes('network')) {
                errorMessage = '❌ Failed to fetch messages. Please try again in a moment.';
            } else if (error.message.includes('permission') || error.message.includes('Missing')) {
                errorMessage = '❌ Missing required permissions. Please check the bot\'s permissions in this channel.';
            } else {
                const userFriendlyErrors = [
                    'Number must be provided',
                    'Invalid time period',
                    'Could not get channel'
                ];
                if (userFriendlyErrors.some(msg => error.message.includes(msg))) {
                    errorMessage = `❌ ${error.message}`;
                }
            }
        } else {
            console.error('Unknown error type:', error);
        }

        try {
            if (commandInteraction.deferred || commandInteraction.replied) {
                await commandInteraction.editReply(errorMessage);
            } else {
                await commandInteraction.reply({ content: errorMessage, ephemeral: true });
            }
        } catch (replyError) {
            console.error('Failed to send error message to user:', replyError);
        }
    }

});


async function getMissedAttacks(
    channel: Channel | null,
    options: FetchOptions = {}
) {
    const { cutoffTimestamp, max = Infinity } = options;

    if (!channel || !channel.isTextBased()) {
        console.error('Invalid channel.');
        return;
    }

    let allMessages = new Map<string, Message>();
    let lastId: string | undefined;
    let done = false;

    while (!done) {
        const fetchOptions: { limit: number; before?: string } = { limit: 100 };
        if (lastId) fetchOptions.before = lastId;

        const messages = await channel.messages.fetch(fetchOptions);
        if (messages.size === 0) break;

        for (const [id, msg] of messages) {
            if (cutoffTimestamp && msg.createdTimestamp < cutoffTimestamp) {
                done = true;
                break;
            }

            allMessages.set(id, msg);
            if (allMessages.size >= max) {
                done = true;
                break;
            }
        }

        lastId = messages.last()?.id;
        if (!lastId) {
            break;
        }
    }

    const formattedAttacks = helper.formatValues(Array.from(allMessages));

    return helper.sortAndBuildSummary(formattedAttacks);
}

export async function sendMessage(): Promise<void> {
    try {
        const cutoff = Date.now() - THIRTY_DAYS;
        if (!process.env.CHANNEL_ID) {
            throw new Error('Channel ID missing');
        }

        const channel = await client.channels.fetch(process.env.CHANNEL_ID);
        if (!channel) {
            throw new Error("Could not fetch channel");
        }
        if (channel.isTextBased()) {
            const textChannel = channel as TextChannel;
            const missedAttacksSummary = await getMissedAttacks(channel, { cutoffTimestamp: cutoff });
            if (!missedAttacksSummary) {
                throw new Error("Failed to get attack summary");
            }
            await textChannel.send({
                embeds: [
                    {
                        title: '🔔 Missed Attacks Summary - Last 30 Days',
                        description: missedAttacksSummary || 'No missed attacks 🎉',
                        color: 0xed4245,
                        footer: {
                            text: `Generated ${new Date().toLocaleDateString()}`
                        }
                    }
                ]
            });
        } else {
            throw new Error('Channel is not a text channel or not found');
        }

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Failed to send message:', error);
        }
        else {
            console.error('Unknown error:', error);
        }

    }
}


if (!process.env.BOT_TOKEN) {
    console.error('Error: BOT_TOKEN environment variable is missing');
    process.exit(1);
}
client.login(process.env.BOT_TOKEN);
