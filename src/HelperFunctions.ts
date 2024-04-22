import { Channel, GuildMember, Interaction, Message, MessageReplyOptions, PermissionFlagsBits, PermissionsBitField, Role } from "discord.js";
import { DJMTbot } from "./DJMTbot";

export const MEDIA_LINK_REGEX: RegExp = /(https?:\/\/[^\s]+)/; // not great but should work for all but weird edge cases

export function isMessageAdmin(message: Message) {
    return message?.member?.permissions.has(PermissionsBitField.Flags.Administrator);
}

export function isInteractionAdmin(interaction: Interaction) {
    return interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
}

export function getGuildMembersRoles(member: GuildMember): Role[] {
    return member.roles.cache.map((role) => role);
}

export function getCensoredMessageReplyOptions(message: Message): MessageReplyOptions {
    return {
        content: message.content.length > 0 ? `||${message.content}||` : undefined,
        files: message.attachments.map(attachment => {
            return {
                attachment: attachment.url,
                name: `SPOILER_${attachment.name}`
            }
        }),
        allowedMentions: {},
        embeds: message.embeds
    };
}
/**
 * Converts a Text Channel mention string to only the channel id
 * ex: <$1234> -> 1234
 * @param channelMention A String in the format of a Text Channel Mention
 */
export function channelMentionToChannelId(channelMention: string): string {
    if (channelMention.startsWith('<#') && channelMention.endsWith('>')) {
        return channelMention.substring(2, channelMention.length - 1);
    }
    throw new Error(`Given string ${channelMention} is not in the Text Channel mention format.`);
}

/**
 * Fetches a channel with the given channel id. Also accepts text channel mention format <#00000000>.
 * (Mentions
 * @param channelId The channel id or the channel mention string
 */
export async function channelIdToChannel(channelId: string): Promise<Channel | null> {
    let id: string = channelId;
    // Determine whether the given id is a mention or just the id
    if (channelId.startsWith('<#') && channelId.endsWith('>')) {
        id = channelMentionToChannelId(id);
    }
    if (!id.match("[0-9]+")) {
        throw new Error("channelId must be numerical")
    }
    console.log(id);
    return await DJMTbot.getInstance().client.channels.fetch(id);
}

export function mapKeys<T, V, U>(m: Map<T, V>, fn: (this: void, v: V) => U): Map<T, U> {
    function transformPair([k, v]: [T, V]): [T, U] {
        return [k, fn(v)]
    }
    return new Map(Array.from(m.entries(), transformPair));
}

export function JSONStringifyReplacer(key: any, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

export function JSONStringifyReviver(key: any, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}
