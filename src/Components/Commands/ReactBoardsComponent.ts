import {Component} from "../Component";
import {
    Channel,
    GuildMember,
    Message,
    MessageAttachment,
    MessageReaction, TextChannel,
    User,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../ComponentNames";
import {isAdmin} from "../../helper";
import {CommandStrings} from "../../Constants/CommandStrings";

// Declare data you want to save in JSON here
export interface ReactBoardSave {
    emoteReactBoardMap: Map<string, ReactBoardMapValue>,
    autoReactMap: Map<string, string[]>
    starChannels: string[];
}

interface ReactBoardMapValue {
    threshold: number;
    channelId: string;
    recentMsgIds: string[];
}

export class ReactBoardsComponent extends Component<ReactBoardSave> {

    name: ComponentNames = ComponentNames.REACT_BOARDS;
    emoteReactBoardMap: Map<string, ReactBoardMapValue> = new Map();
    autoReactMap: Map<string, string[]> = new Map();
    starChannels: string[] = [];

    async getSaveData(): Promise<ReactBoardSave> {
        const clearedERMap = new Map(this.emoteReactBoardMap);
        // recentMsgIds do not need to be saved
        for (const key of Array.from(clearedERMap.keys())) {
            // @ts-ignore
            clearedERMap.get(key).recentMsgIds = [];
        }
        return {
            emoteReactBoardMap: this.emoteReactBoardMap,
            autoReactMap: this.autoReactMap,
            starChannels: this.starChannels
        };
    }

    async afterLoadJSON(loadedObject: ReactBoardSave | undefined): Promise<void> {
        if (loadedObject) {
            this.emoteReactBoardMap = loadedObject.emoteReactBoardMap;
            this.autoReactMap = loadedObject.autoReactMap;
            this.starChannels = loadedObject.starChannels;
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessage(args: string[], message: Message): Promise<void> {
        await this.autoStar(args, message);
        await this.checkAutoReact(args, message);
        return Promise.resolve(undefined);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        await this.checkReactBoard(messageReaction);
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.SET_AUTO_REACT) {
            await this.setAutoReactCmd(args, message);
        } else if (command === CommandStrings.SET_REACT_PAIRS) {
            await this.setReactPairsCmd(args, message);
        } else if (command === CommandStrings.SET_STAR) {
            await this.setStarCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async setAutoReactCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (!this.guild.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }
        if (args.length === 0) {
            let msg = "";
            if (this.autoReactMap.size > 0) {
                let msg = '';
                this.autoReactMap.forEach((channelIds, rawEmojiId) => {
                    channelIds.forEach(channelId => {
                        msg += `${rawEmojiId} => <#${channelId}>\n`;
                    });
                });
                await message.channel.send(`Auto React Channels:\n${msg}`);
            } else {
                await message.channel.send(`No Auto React Channels have been set!`);
            }
        } else if (args.length === 2) {
            const rawEmote = args[0];
            const rawChannelId = args[1];
            let emoteId = rawEmote.substring(rawEmote.lastIndexOf(':') + 1, rawEmote.indexOf('>'));
            let foundEmote = undefined;
            // let foundTextChannel = undefined;
            foundEmote = this.guild.client.emojis.cache.get(emoteId);
            if (!foundEmote) {
                await message.channel.send(`The given emote is invalid, is it in this server?`);
                return;
            }
            let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
            try {
                const foundChannel = await this.guild.client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel is invalid!");
                return;
            }
            // If our map has it, we gotta look for it in our register and remove it
            if (this.autoReactMap.has(rawEmote)) {
                if (this.autoReactMap.get(rawEmote)?.includes(channelId)) {
                    // If we have a match delete it from the map
                    // @ts-ignore
                    this.autoReactMap.get(rawEmote).splice(this.autoReactMap.get(rawEmote).indexOf(channelId), 1);
                    // @ts-ignore
                    if (this.autoReactMap.get(rawEmote).length < 1) {
                        this.autoReactMap.delete(rawEmote)
                    }
                    await this.guild.saveJSON();
                    await message.channel.send(`Removed ${rawChannelId} from the auto react list for ${rawEmote}`);
                } else {
                    this.autoReactMap.get(rawEmote)?.push(channelId);
                    await this.guild.saveJSON();
                    await message.channel.send(`Added ${rawChannelId} to the auto react list for ${rawEmote}!`);
                }
            } else {
                this.autoReactMap.set(rawEmote, [channelId]);
                await this.guild.saveJSON();
                await message.channel.send(`Added ${rawChannelId} to the auto react list for ${rawEmote}!`);
            }
        } else {
            await message.channel.send(`Requires exactly two arguments, the raw emote and a channel mention. You gave ${args}`);

        }
    }

    async setReactPairsCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (!this.guild.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }
        if (args.length === 0) {
            if (this.emoteReactBoardMap.size > 0) {
                let msg = '';
                this.emoteReactBoardMap.forEach((value, key) => {
                    const emoteId = key.substring(key.lastIndexOf(':') + 1, key.indexOf('>'));
                    const emoji = this.guild.client.emojis.cache.get(emoteId);
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
            let foundEmote = undefined;
            let foundTextChannel = undefined;
            try {
                foundEmote = this.guild.client.emojis.cache.get(emoteId);
                foundTextChannel = await this.guild.client.channels.fetch(channelId);
            } catch (e) {
                console.error(e);
                await message.channel.send("The given channel or emote is invalid! Make sure the given channels are the correct types (use help command for more info)");
                return;
            }
            if (foundEmote && foundTextChannel.type !== "text") {
                await message.channel.send(`The given args are invalid`);
                return;
            }
            // If our map has it, we gotta look for it in our register and remove it
            if (this.emoteReactBoardMap.has(rawEmote) &&
                this.emoteReactBoardMap.get(rawEmote)?.channelId === channelId) {
                // @ts-ignore
                const val: ReactBoardMapValue = this.emoteReactBoardMap.get(rawEmote);
                // If we have a match delete it from the map and the config
                this.emoteReactBoardMap.delete(rawEmote);

                await this.guild.saveJSON();
                await message.channel.send(`Removed [${rawEmote}, ${val.channelId}, ${val.threshold}] from React Channels list!`);
                return;

            } else if (this.emoteReactBoardMap.has(rawEmote)) {
                await message.channel.send(`A pair for this emote already exists! Remove that pair first.`);
            } else {
                const reactBoardMapValue: ReactBoardMapValue = { // For our map, add in an empty array for recent msgs
                    threshold: threshold,
                    channelId: channelId,
                    recentMsgIds: [],
                }
                this.emoteReactBoardMap.set(rawEmote, reactBoardMapValue);
                await this.guild.saveJSON();
                await message.channel.send(`Added ${rawEmote} => <#${channelId}> to the React Channels list (threshold ${threshold})!`);
            }

        } else {
            await message.channel.send(`Requires exactly three arguments, an emote, and a text channel mention, and an integer threshold for the react. You gave ${args}`);

        }
    }

    async checkAutoReact(args: string[], message: Message) {
        let channelId = message.channel.id;
        this.autoReactMap.forEach((channelIds, rawEmojiId) => {
            const emoteId = rawEmojiId.substring(rawEmojiId.lastIndexOf(':') + 1, rawEmojiId.indexOf('>'));
            const foundEmote = this.guild.client.emojis.cache.get(emoteId);
            channelIds.forEach(async mapChannelId => { // TODO: async might be weird here
                if (foundEmote && channelId === mapChannelId) {
                    await message.react(foundEmote);
                    return
                }
            });
        });
    }
    async checkReactBoard(reaction: MessageReaction) {
        // let channelId = reaction.message.channel.id;
        const rawEmoteId = reaction.emoji.toString();
        if (rawEmoteId && this.emoteReactBoardMap.has(rawEmoteId) &&
            !this.emoteReactBoardMap?.get(rawEmoteId)?.recentMsgIds?.includes(reaction.message.id)) {
            const reactMapValue = this.emoteReactBoardMap.get(rawEmoteId);
            if (reaction.count === reactMapValue?.threshold && reactMapValue?.channelId) {
                const attachmentList: MessageAttachment[] = [];
                const message = reaction.message;
                const channel = (await this.guild.client.channels.fetch(reactMapValue.channelId) as TextChannel);
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
                        { name: 'Message', value: message.content || '\u200b', inline: true },
                        { name: 'Media URL', value: message.attachments.first()?.url || '\u200b'}
                    ],
                    thumbnail: {
                        url: message.author.displayAvatarURL({size: 128, dynamic: true}),
                        // proxyURL: 'https://images-ext-2.discordapp.net/external/n9tMDc7bvqomY_KUtbzl7EHyu1ot_TsuC5OCTKqYyYY/https/cdn.discordapp.com/avatars/120736323706421249/c92e1eb3814ff24c8d7cd7de52557fdb.png',
                        height: 128,
                        width: 128
                    },
                    image: {
                        url: attachmentList[0]?.attachment|| null
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
                // We dont care about recent msg ids being saved to file, so dont save here.
            }
        }
    }
    async setStarCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (!this.guild.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
            return;
        }
        if (args.length === 0) {
            let channelString = "";
            if (this.starChannels?.length > 0) {
                this.starChannels.forEach((channelId: string) => {
                    channelString += `<#${channelId}> `;
                });
                await message.channel.send(`Star Channels: ${channelString}`);
            } else {
                await message.channel.send(`No Star Channels have been set!`);
            }
        } else {
            for (const rawChannelId of args) {
                let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
                try {
                    const foundChannel = await this.guild.client.channels.fetch(channelId);
                } catch (e) {
                    console.error(e);
                    await message.channel.send("The given channel is invalid!");
                    continue;
                }
                if (this.starChannels?.includes(channelId)) {
                    this.starChannels.splice(this.starChannels.indexOf(channelId), 1);
                    await this.guild.saveJSON();
                    await message.channel.send(`Removed ${rawChannelId} from the star channels list!`);
                } else {
                    if (!this.starChannels) {
                        this.starChannels = [];
                    }
                    this.starChannels.push(channelId);
                    await this.guild.saveJSON();
                    await message.channel.send(`Added ${rawChannelId} to the star channels list!`);
                }
            }
        }
    }

    async autoStar(args: string[], message: Message) {
        let channelId = message.channel.id;
        if (this.starChannels?.includes(channelId)) {
            await message.react('⭐');
        }
    }
}

