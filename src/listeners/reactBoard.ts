import {GuildConfig, ReactBoardEntry} from "../types/types";
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
    private emoteReactBoardMap: Map<string, ReactBoardMapValue>;

    constructor() {
        this.emoteReactBoardMap = new Map();
    }
    public static CreateReactBoard = async (client: Client) => {
        const me = new ReactBoard();
        me.emoteReactBoardMap = new Map<string, ReactBoardMapValue>();
        const files = await FileSystem.readdir('./json/guilds');
        const guildIds = files.map((filename) =>  filename.substr(0, filename.indexOf('.')));
        for (const id of guildIds) {
            const gConfig: GuildConfig = await getConfig(id);
            const register = gConfig.register;
            const reactBoards: ReactBoardEntry[] = register?.reactBoards;
            if (reactBoards) {
                for (const reactBoard of reactBoards) {
                    let emoteIdNumber = reactBoard.rawEmoteId.substring(reactBoard.rawEmoteId.lastIndexOf(':') + 1, reactBoard.rawEmoteId.indexOf('>'));
                    me.emoteReactBoardMap.set(emoteIdNumber, {threshold: reactBoard.threshold, channelId: reactBoard.channelId, recentMsgIds: []});
                }
            }
        }
        return me;
    };


    async reactBoardCheck(client: Client, reaction: MessageReaction) {
        // let channelId = reaction.message.channel.id;
        const rawEmoteId = reaction.emoji.toString();
        if (rawEmoteId && this.emoteReactBoardMap.has(rawEmoteId) && !this.emoteReactBoardMap?.get(rawEmoteId)?.recentMsgIds?.includes(reaction.message.id)) {
            const reactMapValue = this.emoteReactBoardMap.get(rawEmoteId);
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
                this.emoteReactBoardMap?.get(rawEmoteId)?.recentMsgIds?.push(message.id);
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
            if (this.emoteReactBoardMap.size > 0) {
                let msg = '';
                this.emoteReactBoardMap.forEach((value, key) => {
                    const emoji = client.emojis.cache.get(key);
                    msg += `${emoji?.toString()} => <#${value.channelId}> (threshold: ${value.threshold})\n`;
                });
                await message.channel.send(`React Channels:\n${msg}`);
            } else {
                await message.channel.send(`No React Channel Pairs have been set!`);
            }
        } else if (args.length === 3) {
            const rawEmote = args[0]; // The emote
            const rawChannelId = args[1];
            let threshold: number;
            try {
                threshold = parseInt(args[2]);
            } catch (e) {
                console.error(e);
                await message.channel.send(`The threshold must be an integer number. Given ${args[2]}`);
                return;
            }
            let emoteId = rawEmote.substring(rawEmote.lastIndexOf(':') + 1, rawEmote.indexOf('>'));
            let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
            const reactBoardEntry: ReactBoardEntry = {
                "rawEmoteId": rawEmote,
                "channelId": channelId,
                "threshold": threshold
            }
            let foundEmote = undefined;
            let foundTextChannel = undefined;
            try {
                foundEmote = client.emojis.cache.get(emoteId);
                foundTextChannel = await client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel or emote is invalid! Make sure the given channels are the correct types (use help command for more info)");
                return;
            }
            if (foundEmote && foundTextChannel.type !== "text") {
                await message.channel.send(`The given args are invalid`);
                return;
            }

            if (register?.reactBoards?.length > 0) {
                for (const reactBoard of register.reactBoards) {
                    if (reactBoard.rawEmoteId === reactBoardEntry.rawEmoteId && reactBoard.channelId === reactBoardEntry.channelId) {
                        register.reactBoards.splice(register.reactBoards.indexOf(reactBoard), 1);
                        this.emoteReactBoardMap.delete(reactBoardEntry.rawEmoteId);
                        await updateConfig(gConfig, message);
                        await message.channel.send(`Removed ${reactBoard} from React Channels list!`);
                        return;
                    }
                }
            } else {
                if (!register?.reactBoards) {
                    register.reactBoards = [];
                }
            }
            if (!this.emoteReactBoardMap.has(reactBoardEntry.rawEmoteId)) {
                register.reactBoards.push(reactBoardEntry);
                const reactBoardMapValue: ReactBoardMapValue = { // For our map, add in an empty array for recent msgs
                    threshold: reactBoardEntry.threshold,
                    channelId: reactBoardEntry.channelId,
                    recentMsgIds: [],
                }
                this.emoteReactBoardMap.set(reactBoardEntry.rawEmoteId, reactBoardMapValue);
                await updateConfig(gConfig, message);
                await message.channel.send(`Added ${reactBoardEntry.rawEmoteId} => <#${reactBoardEntry.channelId}> to the React Channels list (threshold ${reactBoardEntry.threshold})!`);
            } else {
                await message.channel.send(`A pair for this emote already exists! Remove that pair first.`);
            }

        } else {
            await message.channel.send(`Requires exactly three arguments, an emote, and a text channel mention, and an integer threshold for the react. You gave ${args}`);

        }
    }
}
