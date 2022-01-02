import {GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {DJMTGuild} from "./DJMTGuild";
import {ComponentNames} from "./Constants/ComponentNames";

/**
 * Represents a Guild component. New functionality should be attached to guilds using an
 * instance of a component.
 *
 * Expects a generic T, which should be the save interface for your component.
 * The save interface should define the data you wish to store to the Guild's componentData object.
 * The componentData object is what gets written and loaded from file, and is expected in the
 * getSaveData and afterLoadJSON methods below.
 *
 * When your make your component, make sure to export your Component class within the Components index.ts file.
 *
 * See ExampleComponentTemplate.ts for how this class should be implemented (copy and paste it!)
 */
export abstract class Component<T> {
    abstract name: ComponentNames;
    djmtGuild: DJMTGuild;

    public constructor(guild: DJMTGuild) {
        this.djmtGuild = guild;
    }
    // Events
    // (Not all events have been implemented, if you need one that isn't here, open a github issue for it.

    /**
     * Function that fires on the discord client's 'ready' event
     */
    abstract onReady(): Promise<void>;

    /**
     * Returns the component data that will be saved to JSON. What is returned here will be saved
     * to JSON in the Guild saveJSON function
     */
    abstract getSaveData(): Promise<T>;

    /**
     * Sets this component's data using loaded component data from the guild JSON.
     * @param loadedObject The component data loaded from the guild JSON
     */
    abstract afterLoadJSON(loadedObject: T | undefined): Promise<void>;

    /**
     * Function that fires on the discord client's 'guildMemberAdd' event for this guild
     * @param member The added guild member
     */
    abstract onGuildMemberAdd(member: GuildMember): Promise<void>;

    /**
     * Function that fires on the discord client's 'message' event for this guild
     * @param args array of strings containing the message content, separated by spaces
     * @param message the Message object
     */
    abstract onMessage(args: string[], message: Message): Promise<void>;

    /**
     * Function that fires on messages that start with this guild's prefix on the discord
     * client's 'message' event. Note: This message will also pass through onMessage first. Please
     * use this function for text based commands rather than onMessage!
     * @param args array of strings containing the message content after the guild prefix, separated by spaces
     * @param message the Message object
     */
    abstract onMessageWithGuildPrefix(args: string[], message: Message): Promise<void>;

    /**
     * Function that fires on the discord client's 'messageUpdate' event for this guild
     * @param oldMessage the message prior to updating
     * @param newMessage the message after updating
     */
    abstract onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void>;

    /**
     * Function that fires on the discord client's 'voiceStateUpdate' event for this guild
     * @param oldState the old voice state
     * @param newState the new voice state
     */
    abstract onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;

    /**
     * Function that fires on the discord client's 'messageReactionAdd' event for this guild
     * @param messageReaction the reaction added to the message
     * @param user the user who added the reaction
     */
    abstract onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void>;

    /**
     * Function that fires on the discord client's 'guildMemberRemove' event for this guild
     * @param messageReaction the reaction removed from the message
     * @param user the user who removed the reaction
     */
    abstract onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void>;



}
