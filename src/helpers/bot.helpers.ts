import type { Message, EmbedField } from 'discord.js';
import type { TimePeriod } from '../interfaces/bot.interfaces.js';


export function isTimePeriod(value: string): value is TimePeriod {
    return ['alltime', 'days', 'weeks', 'months', 'years'].includes(value);
}

export function formatValues(
    allMessageArray: [string, Message][]
): Map<string, number> {
    const missedAttacksMap = new Map<string, number>();

    for (const [, msg] of allMessageArray) {
        if (!msg.embeds.length) continue;

        const embed = msg.embeds[0];
        if (!embed.fields) continue;

        for (const field of embed.fields as EmbedField[]) {
            const matchCount = field.name.match(/^(\d+)/);
            if (!matchCount) continue;

            const count = parseInt(matchCount[1], 10);
            if (isNaN(count)) continue;

            const lines = field.value.split(/\n/);

            for (let line of lines) {

                let afterTag = line.replace(/<:[^>]+>\s*/, '');

                afterTag = afterTag.replace(/\\/g, '');

                const username = afterTag.trim();

                if (username.length < 2) continue;

                missedAttacksMap.set(username, (missedAttacksMap.get(username) || 0) + count);
            }
        }
    }

    return missedAttacksMap;
}

export function sortAndBuildSummary(formattedAttacks: Map<string, number>): string {
    const sortedMisses = Array.from(formattedAttacks.entries())
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

    return sortedMisses
        .map(([user, count]) => `${user}: ${count} missed attacks`)
        .join('\n');
}
