import {Component} from "../Component";
import {GuildMember, Interaction, Message, MessageReaction, TextChannel, User, VoiceState} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {isMessageAdmin} from "../HelperFunctions";
import {DJMTGuild} from "../DJMTGuild";
import {ComponentCommands} from "../Constants/ComponentCommands";

/**
 * Declare data you want to save in JSON here. This interface is used for getSaveData and
 * afterLoadJSON, as it tells Typescript what data you're expecting to write and load.
 */
interface MediaComponentSave {
    channels: string[];
}

/**
 * A component to declare media only channels and remove any messages without attachments in said channels.
 */
export class MediaChannelComponent extends Component<MediaComponentSave> {

    // MANDATORY: Define a name in ComponentNames.ts and place it here.
    name: ComponentNames = ComponentNames.MEDIA_CHANNEL;
    channelsArray: TextChannel[] = [];
    linkRegex: RegExp = /(https?:\/\/[^\s]+)/; // not great but should work for all but weird edge cases
    // may move to constants in future if needed?

    async getSaveData(): Promise<MediaComponentSave> {
        return {
            channels: this.channelsArray.map(channel => channel.id)
        };
    }

    async afterLoadJSON(loadedObject: MediaComponentSave | undefined): Promise<void> {
        if (loadedObject) {
            for (const c of loadedObject.channels) {
                const channel = this.djmtGuild.getGuildChannel(c) as TextChannel;
                if (!channel) {
                    console.error(`[MediaChannelCheck]: could not load ${c}`);
                    continue;
                }
                this.channelsArray.push(channel);
            }
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        await this.checkMedia(message);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        // Any interactive commands should be defined in ComponentCommands.ts
        if (command === ComponentCommands.SET_MEDIA_CHANNEL) {
            await this.setMediaChannel(args, message);
        } else if (command === ComponentCommands.GET_MEDIA_CHANNEL) {
            await this.getMediaChannel(message);
        }
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    /**
     * Toggles certain channels as "media channels", where any non-media messages will be deleted.
     * @param args A list of channels to toggle.
     * @param message The message object of the command message.
     * @private
     */
    private async setMediaChannel(args: string[], message: Message): Promise<void> {
        if (!isMessageAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (args.length === 0) {
            await message.channel.send('Toggles a channel as a media channel, or multiple channels at the same time.');
            await message.channel.send('Command syntax: \`setmc #channel1 #channel2 #channel3 ...\`');
            await message.channel.send('You can also use \`getmc\` to see a list of set channels.');
            return;
        }
        // TODO: also accept channels by name - make getGuildChannels accept channel names as well?
        for (const arg of args) {
            let chid = arg.replace(/(\<|\>|\#)/gi, "");
            const channel = this.djmtGuild.getGuildChannel(chid) as TextChannel;
            if (!channel) {
                await message.channel.send(`${arg} is not a valid channel`);
                continue;
            }
            // find channel in the list of media channels, if it exists
            let exists = false;
            this.channelsArray.forEach( (item, index) => {
                if(item.id === chid) {
                    exists = true;
                    // really, js? why is this a thing
                    this.channelsArray.splice(index,1);
                }
            });
            if (exists) {
                await message.channel.send(`Removed ${arg} as a media channel.`);
            }
            else {
                this.channelsArray.push(channel);
                await message.channel.send(`Successfully added ${arg} as a media channel.`);
            }
        }
        await this.djmtGuild.saveJSON();
    }

    /**
     * Returns a list of media channels.
     * @param message The message object of the command message.
     * @private
     */
    private async getMediaChannel(message: Message): Promise<void> {
        if (!isMessageAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (this.channelsArray.length === 0) {
            await message.channel.send(`There are no set media channels.`);
            return;
        }
        let m = 'The current set media channels are:\n';
        for (const c of this.channelsArray) {
            m += `<#${c.id}>\n`;
        }
        await message.channel.send(m);
    }

    /**
     * Checks and deletes a message if it's in a media channel and doesn't have media.
     * @param message The message to be checked.
     * @private
     */
    private async checkMedia(message: Message): Promise<void> {
        if (this.channelsArray.indexOf(<TextChannel>message.channel) > -1) {
            // delete all messages without attachments or links
            if (message.attachments.size === 0 && !(this.linkRegex.test(message.content))) {
                let msg = `${message.author.toString()}, your message has been deleted because it does not have media.`;
                try {
                    await message.delete();
                }
                catch (e) {
                    console.error(e);
                }
                const warningMsg: Message = await message.channel.send(msg);
                // Delete the warning message after some time
                setTimeout(async () => {
                    await warningMsg.delete();
                }, 15000);
            }
        }
    }
}
