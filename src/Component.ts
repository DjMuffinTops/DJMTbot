import {GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {Guild} from "./Guild";
import {ComponentNames} from "./Constants/ComponentNames";

export abstract class Component<T> {
    abstract name: ComponentNames;
    guild: Guild;
    public constructor(guild: Guild) {
        this.guild = guild;
    }
    // Events
    // (Not all events have been implemented, if you need one that isn't here, open a github issue for it.

    /**
     * Function that fires on the discord client's 'ready' event
     */
    abstract async onReady(): Promise<void>;

    /**
     * Returns the component data that will be saved to JSON. What is returned here will be saved
     * to JSON in the Guild saveJSON function
     */
    abstract async getSaveData(): Promise<T>;

    /**
     * Sets this component's data using loaded component data from the guild JSON.
     * @param loadedObject The component data loaded from the guild JSON
     */
    abstract async afterLoadJSON(loadedObject: T | undefined): Promise<void>;

    /**
     * Function that fires on the discord client's 'guildMemberAdd' event for this guild
     * @param member The added guild member
     */
    abstract async onGuildMemberAdd(member: GuildMember): Promise<void>;

    /**
     * Function that fires on the discord client's 'message' event for this guild
     * @param args array of strings containing the message content, separated by spaces
     * @param message the Message object
     */
    abstract async onMessage(args: string[], message: Message): Promise<void>;

    /**
     * Function that fires on messages that start with this guild's prefix on the discord
     * client's 'message' event. Note: This message will also pass through onMessage first. Please
     * use this function for text based commands rather than onMessage!
     * @param args array of strings containing the message content after the guild prefix, separated by spaces
     * @param message the Message object
     */
    abstract async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void>;

    /**
     * Function that fires on the discord client's 'messageUpdate' event for this guild
     * @param oldMessage the message prior to updating
     * @param newMessage the message after updating
     */
    abstract async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void>;

    /**
     * Function that fires on the discord client's 'voiceStateUpdate' event for this guild
     * @param oldState the old voice state
     * @param newState the new voice state
     */
    abstract async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;

    /**
     * Function that fires on the discord client's 'messageReactionAdd' event for this guild
     * @param messageReaction the reaction added to the message
     * @param user the user who added the reaction
     */
    abstract async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void>;

    /**
     * Function that fires on the discord client's 'guildMemberRemove' event for this guild
     * @param messageReaction the reaction removed from the message
     * @param user the user who removed the reaction
     */
    abstract async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void>;



}
