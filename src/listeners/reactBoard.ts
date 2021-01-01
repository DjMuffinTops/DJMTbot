import {GuildConfig} from "../types/types";
import {getConfig, updateConfig} from "../commands/config";
import {Client, Message, MessageAttachment, MessageReaction, TextChannel} from "discord.js";
import {promises as FileSystem} from "fs";
import {isAdmin} from "../commands/helper";

interface ReactBoardMapValue {
    threshold: number;
    channelId: string;
    recentMsgIds: string[];
}

export default class ReactBoard {
    private emoteToChannels: Map<string, ReactBoardMapValue>;

    constructor() {
        this.emoteToChannels = new Map();

    }
    public static CreateReactBoard = async (client: Client) => {
        const me = new ReactBoard();
        me.emoteToChannels = new Map<string, ReactBoardMapValue>();
        const files = await FileSystem.readdir('./json/guilds');
        const guildIds = files.map((filename) =>  filename.substr(0, filename.indexOf('.')));
        for (const id of guildIds) {
            const gConfig: GuildConfig = await getConfig(id);
            const register = gConfig.register;
            const emoteChannelPairs = register?.emoteChannelPairs;
            if (emoteChannelPairs) {
                for (const emoteChannelPair of emoteChannelPairs) {
                    //`<#${channelId}> `
                    const emoteStr: string = emoteChannelPair[0] as string;
                    let emoteId = emoteStr.substring(emoteStr.lastIndexOf(':') + 1, emoteStr.indexOf('>'));
                    const reactBoardMapValue: (number | string)[] = emoteChannelPair[1] as (number | string)[];
                    const threshold: number = reactBoardMapValue[0] as number;
                    const channelId: string = reactBoardMapValue[1] as string;

                    me.emoteToChannels.set(emoteId, {threshold, channelId, recentMsgIds: []});
                }
            }
        }
        return me;
    };


    async reactBoardCheck(client: Client, reaction: MessageReaction) {
        // let channelId = reaction.message.channel.id;
        const emoteId = reaction.emoji.id;
        if (emoteId && this.emoteToChannels.has(emoteId) && !this.emoteToChannels?.get(emoteId)?.recentMsgIds?.includes(reaction.message.id)) {
            const reactMapValue = this.emoteToChannels.get(emoteId);
            if (reaction.count === reactMapValue?.threshold && reactMapValue?.channelId) {
                const attachmentList: MessageAttachment[] = [];
                const message = reaction.message;
                const channel = (await client.channels.fetch(reactMapValue.channelId) as TextChannel);
                message.attachments.forEach((attachment: MessageAttachment) => {
                    // do something with the attachment
                    const msgattachment = new MessageAttachment(attachment.url);
                    attachmentList.push(msgattachment);
                });
                // post into the channel
                const embed =  {
                    type: 'rich',
                    // title: undefined,
                    description: `[Original Message](${message.url})`,
                    // url: undefined,
                    color: 16755763,
                    timestamp: message.createdAt,
                    fields: [
                        { name: 'Channel', value: message.channel.toString(), inline: true },
                        { name: 'Message', value: message.content || '\u200b', inline: true }
                    ],
                    thumbnail: {
                        url: message.author.displayAvatarURL({size: 128, dynamic: true}),
                        // proxyURL: 'https://images-ext-2.discordapp.net/external/n9tMDc7bvqomY_KUtbzl7EHyu1ot_TsuC5OCTKqYyYY/https/cdn.discordapp.com/avatars/120736323706421249/c92e1eb3814ff24c8d7cd7de52557fdb.png',
                        height: 128,
                        width: 128
                    },
                    image: {
                        url: attachmentList[0]?.attachment || null
                    },
                    // video: null,
                    author: {
                        name: `${message.author.username}#${message.author.discriminator} (${message.author.id})`,
                        // url: undefined,
                        iconURL: message.author.displayAvatarURL({size: 128, dynamic: true}),
                        // proxyIconURL: 'https://images-ext-2.discordapp.net/external/n9tMDc7bvqomY_KUtbzl7EHyu1ot_TsuC5OCTKqYyYY/https/cdn.discordapp.com/avatars/120736323706421249/c92e1eb3814ff24c8d7cd7de52557fdb.png'
                    },
                    // provider: null,
                    footer: {
                        text: `${reaction.count} ⭐ | ${message.id}`,
                        iconURL: undefined,
                        proxyIconURL: undefined
                    },

                };
                await channel.send({embed: embed});
                this.emoteToChannels?.get(emoteId)?.recentMsgIds?.push(message.id);
            }
        }
    }

    async setReactPairsCmd(client: Client, args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        const gConfig = await getConfig(message);
        if (!gConfig.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }
        let register = gConfig.register;
        if (args.length === 0) {
            if (this.emoteToChannels.size > 0) {
                let msg = '';
                this.emoteToChannels.forEach((value, key) => {
                    const emoji = client.emojis.cache.get(key);
                    msg += `${emoji?.toString()} => <#${value.channelId}> (threshold: ${value.threshold})\n`;
                });
                await message.channel.send(`React Channels:\n${msg}`);
            } else {
                await message.channel.send(`No React Channel Pairs have been set!`);
            }
        } else if (args.length === 3) {
            const rawEmote = args[0]; // The emote
            const rawTextChannelId = args[1];
            let pairThreshold: number;
            try {
                pairThreshold = parseInt(args[2]);
            } catch (e) {
                console.error(e);
                await message.channel.send(`The threshold must be an integer number. Given ${args[2]}`);
                return;
            }
            let emoteId = rawEmote.substring(rawEmote.lastIndexOf(':') + 1, rawEmote.indexOf('>'));
            let textChannelId = rawTextChannelId.substring(2, rawTextChannelId.indexOf('>'));
            const pairValue: (number | string)[]  = [pairThreshold, textChannelId];
            const pair: (string | (string|number)[])[] = [rawEmote, pairValue];
            let foundEmote = undefined;
            let foundTextChannel = undefined;
            try {
                foundEmote = client.emojis.cache.get(emoteId);
                foundTextChannel = await client.channels.fetch(textChannelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid! Make sure the given channels are the correct types (use help command for more info)");
                return;
            }
            if (foundEmote && foundTextChannel.type !== "text") {
                await message.channel.send(`The given args are invalid`);
                return;
            }

            if (register?.emoteChannelPairs?.length > 0) {
                for (const presentPair of register.emoteChannelPairs) {
                    if (presentPair[0] === pair[0] && presentPair[1][1] === pair[1][1]) {
                        register.emoteChannelPairs.splice(register.emoteChannelPairs.indexOf(pair), 1);
                        this.emoteToChannels.delete(emoteId);
                        await updateConfig(gConfig, message);
                        await message.channel.send(`Removed ${pair} from React Channels list!`);
                        return;
                    }
                }
            } else {
                if (!register?.emoteChannelPairs) {
                    register.emoteChannelPairs = [];
                }
            }
            if (!this.emoteToChannels.has(emoteId)) {
                register.emoteChannelPairs.push(pair);
                this.emoteToChannels.set(emoteId, { threshold: pairThreshold, channelId: textChannelId, recentMsgIds: []});
                await updateConfig(gConfig, message);
                await message.channel.send(`Added ${pair[0]} => ${pair[1][1]} to the React Channels list (threshold ${pair[1][0]})!`);
            } else {
                await message.channel.send(`A pair for this emote already exists! Remove that pair first.`);
            }

        } else {
            await message.channel.send(`Requires exactly three arguments, an emote, and a text channel mention, and an integer threshold for the react. You gave ${args}`);

        }
    }
}
