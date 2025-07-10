import { Client, GatewayIntentBits, Events, type Channel, type TextChannel, type Message, type ChatInputCommandInteraction } from 'discord.js';
import dotenv from 'dotenv';
import cron from 'cron';
import * as helper from './helpers/bot.helpers.js'
import type { FetchOptions } from './interfaces/bot.interfaces.js';


dotenv.config();

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

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

        const job = new cron.CronJob('0 10 1 * *', sendMessage);
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


client.on(Events.InteractionCreate, async interaction => {
    try {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'shame') {
            await interaction.deferReply();

            const channel = interaction.channel;
            if (!channel) {
                throw new Error("Could not get channel")
            }

            const missedAttacksSummary = await getMissedAttacks(channel)
            await interaction.editReply(`🔔 Missed Attacks Summary - All Time:\n\n${missedAttacksSummary}`);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Failed to send message:', error);
        }
        else {
            console.error('Unknown error:', error);
        }
        const commadInteraction = interaction as ChatInputCommandInteraction;
        if (commadInteraction.deferred || commadInteraction.replied) {
            await commadInteraction.editReply('Oops, something went wrong.');
        } else {
            await commadInteraction.reply('Oops, something went wrong.');
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
            await textChannel.send(`🔔 Missed Attacks Summary - Last 30 Days:\n\n${missedAttacksSummary}`);
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


client.login(process.env.BOT_TOKEN);