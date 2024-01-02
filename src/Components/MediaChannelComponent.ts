import {Component} from "../Component";
import {ChannelType, ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, TextChannel, User, VoiceState} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {isMessageAdmin} from "../HelperFunctions";
import {ComponentCommands} from "../Constants/ComponentCommands";

const setMediaChannelCommand = new SlashCommandBuilder();
setMediaChannelCommand.setName(ComponentCommands.SET_MEDIA_CHANNEL);
setMediaChannelCommand.setDescription("Sets the media channel");
setMediaChannelCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the media channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setMediaChannelCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const getMediaChannelCommand = new SlashCommandBuilder();
getMediaChannelCommand.setName(ComponentCommands.PRINT_MEDIA_CHANNEL);
getMediaChannelCommand.setDescription("Gets the media channel");
getMediaChannelCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
    commands: SlashCommandBuilder[] = [setMediaChannelCommand, getMediaChannelCommand];
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
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.SET_MEDIA_CHANNEL) {
            await this.setMediaChannel(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction);
        } else if (interaction.commandName === ComponentCommands.PRINT_MEDIA_CHANNEL) {
            await this.getMediaChannel(interaction);
        }
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    /**
     * Toggles certain channels as "media channels", where any non-media messages will be deleted.
     * @param args A list of channels to toggle.
     * @param interaction The message object of the command message.
     * @private
     */
    private async setMediaChannel(channel: TextChannel, interaction: ChatInputCommandInteraction): Promise<void> {
            if (!channel) {
                await interaction.reply({content: `${channel} is not a valid channel`, ephemeral: true});
            }
            const chid = channel.id;
            // find channel in the list of media channels, if it exists
            let exists = false;
            this.channelsArray.forEach( (item, index) => {
                if (item.id === chid) {
                    exists = true;
                    this.channelsArray.splice(index, 1);
                }
            });
            if (exists) {
                await interaction.reply({content: `Removed ${channel} as a media channel.`, ephemeral: true});
            }
            else {
                this.channelsArray.push(channel);
                await interaction.reply({content: `Successfully added ${channel} as a media channel.`, ephemeral: true});
            }
        await this.djmtGuild.saveJSON();
    }

    /**
     * Returns a list of media channels.
     * @param interaction The message object of the command message.
     * @private
     */
    private async getMediaChannel(interaction: ChatInputCommandInteraction): Promise<void> {
        if (this.channelsArray.length === 0) {
            await interaction.reply({content: `There are no set media channels.`, ephemeral: true});
            return;
        }
        let m = 'The current set media channels are:\n';
        for (const c of this.channelsArray) {
            m += `<#${c.id}>\n`;
        }
        await interaction.reply({content: m, ephemeral: true});
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
