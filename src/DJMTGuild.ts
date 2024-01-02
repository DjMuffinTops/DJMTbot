import {
    Guild, GuildBasedChannel,
    GuildMember,
    Message, AttachmentBuilder,
    MessageReaction, TextChannel,
    User,
    VoiceState,
    Interaction,
    SlashCommandBuilder,
    REST,
    Routes
} from "discord.js";

import {
    JSONStringifyReplacer,
    JSONStringifyReviver
} from "./HelperFunctions";

import { DJMTbot } from "./DJMTbot";
import { ComponentNames } from "./Constants/ComponentNames";
import { Component } from "./Component";
import * as components from "./Components"; // All components are imported from here!
import { promises as FileSystem } from "fs";
const defaultConfig = require("../json/defaultConfig.json");

// The structure of a Guild's save data JSON.
export interface GuildConfig {
    debugMode: boolean,
    prefix: string,
    debugChannelId: string,
    modAlertsChannelId: string,
    modLoggingChannelId: string,
    componentData: any,
}

/**
 * Represents a single discord server (referred to as a Guild by discord js api). Each guild instance
 * maintains its own component instances as well. Every Component class exported within the Components index.ts file
 * will be instantiated.
 */
export class DJMTGuild {
    guild: Guild | undefined;
    isReady: boolean = false;
    readonly guildId: string;
    // Config
    private _debugMode: boolean = defaultConfig.debugMode;
    private _prefix: string = "djmt!";
    private _debugChannelId: string = defaultConfig.debugChannelId;
    private _modAlertsChannelId: string = defaultConfig.modAlertsChannelId;
    private _modLoggingChannelId: string = defaultConfig.modLoggingChannelId;
    private componentData = defaultConfig.componentData;
    private components: Map<ComponentNames, Component<any>>;

    constructor(guildId: string) {
        this.guildId = guildId;
        this.components = new Map<ComponentNames, Component<any>>();
        try {
            this.initializeComponents().then(() => {
                console.log(`[${guildId}] DJMTGuild initialized`);
            })
        } catch (e) {
            console.log(`[${guildId}]: ${e}`);
        }

    }

    /**
     * Initializes each component class exported in the /Components index.ts file for this guild.
     * @private
     */
    private async initializeComponents(): Promise<void> {
        /**
         * Creates an instance of a component class, from the import 'components'
         * @param className The name of the class as a string
         * @param args Arguments to pass to that classes constructor
         */
        function createInstance(className: string, ...args: any[]) {
            return new (<any>components)[className](...args);
        }
        const guildCommands: SlashCommandBuilder[] = [];
        for (const className of Object.keys(components)) {
            const instance: Component<any> = createInstance(className, this) as Component<any>;
            guildCommands.push(...instance.commands);
            this.components.set(instance.name, instance);
        }

        // Construct and prepare an instance of the REST module
        const rest = new REST().setToken(process.env.TOKEN as string);
        // Deploy your commands!
        try {
            console.log(`[${this.guildId}]Started refreshing ${guildCommands.length} application (/) commands.`);

            // The put method is used to fully refresh all commands in the guild with the current set
            const data: any = await rest.put(
                Routes.applicationGuildCommands(process.env.APPLICATION_ID as string, this.guildId),
                { body: guildCommands.map(command => command.toJSON()) },
            );
            console.log(`[${this.guildId}]Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            // And of course, make sure you catch and log any errors!
            console.error(error);
        }
    }

    /**
     * Gets a component from this guild's components map. You will need to cast the return Component
     * to access it's properties. Expects the component's assigned ComponnetNames enum value.
     * @param name The ComponentNames (enum) name of the component to return.
     */
    getComponent(name: ComponentNames): Component<any> | undefined {
        return this.components.get(name);
    }

    /**
     * Returns the guild data that will be saved to JSON.
     */
    getSaveData(): GuildConfig {
        return {
            debugMode: this._debugMode,
            prefix: this._prefix,
            debugChannelId: this._debugChannelId,
            modAlertsChannelId: this._modAlertsChannelId,
            modLoggingChannelId: this._modLoggingChannelId,
            componentData: this.componentData,
        }
    }

    /**
     * Loads data from this guild's respective JSON file. Set's the guilds fields and then passes
     * component data to each respective component through the component afterLoadJJSON function.
     */
    async loadJSON(): Promise<void> {
        const fileName = `./json/guilds/${this.guildId}.json`;
        let gConfig;
        try {
            const buffer = await FileSystem.readFile(fileName);
            gConfig = JSON.parse(buffer.toString(), JSONStringifyReviver)[this.guildId] as GuildConfig;
        } catch (e) {
            console.log(`[${this.guildId}] Could not load JSON, resetting JSON file: ${e}`)
            await this.resetJSON();
            return;
        }

        if (gConfig && gConfig.componentData) {
            this._debugMode = gConfig.debugMode;
            this._prefix = gConfig.prefix;
            this._debugChannelId = gConfig.debugChannelId;
            this._modAlertsChannelId = gConfig.modAlertsChannelId;
            this._modLoggingChannelId = gConfig.modLoggingChannelId;
            this.componentData = gConfig.componentData;
            for (const component of Array.from(this.components.values())) {
                // Send component data to their respective components.
                // @ts-ignore
                await component.afterLoadJSON(gConfig.componentData[component.name]);
            }
        } else {
            console.log(`[${this.guildId}] Guild file read but gConfig contents not found. Resetting file`)
            await this.resetJSON();
        }
    }

    /**
     * Saves data for this guild to a JSON file.
     */
    async saveJSON(): Promise<void> {
        const filename = `./json/guilds/${this.guildId}.json`;
        // Build the componentData object by getting each component's save data
        for (const component of Array.from(this.components.values())) {
            // @ts-ignore
            this.componentData[component.name] = await component.getSaveData();
        }
        // Write getSaveData() content to file
        await FileSystem.writeFile(filename, JSON.stringify({ [this.guildId]: this.getSaveData() }, JSONStringifyReplacer, '\t'));
        console.log(`${filename} saved`);
        if (this.debugMode) {
            const foundChannel = this.getDebugChannel();
            if (foundChannel) {
                const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify({ [this.guildId]: this.getSaveData() }, JSONStringifyReplacer, '\t')), { name: 'config.txt' });
                await foundChannel.send({ files: [attachment] });
            }
        }
    }

    private getDebugChannel(): TextChannel | undefined {
        return this.getGuildChannel(this.debugChannelId) as TextChannel;
    }

    /**
     * Resets the guild's data to default and reset's the saved JSON
     */
    async resetJSON() {
        this._debugMode = defaultConfig.devMode;
        this._prefix = "djmt!" as string;
        this._debugChannelId = defaultConfig.debugChannel;
        this.componentData = defaultConfig.componentData;
        console.log(`Reset ${this.guildId} config to default settings.`);
        if (this.debugChannelId) {
            const debugChannel = this.getDebugChannel();
            if (debugChannel) {
                await debugChannel.send(`Reset this guild's config`);
            }
        }
        await this.saveJSON();
        await this.loadJSON();
    }

    // Events

    /**
     * Relay's the discord client's 'ready' event to all components
     */
    async onReady(): Promise<void> {
        try {
            this.guild = await DJMTbot.getInstance().client.guilds.fetch(this.guildId);
        } catch (e) {
            console.error(`[${this.guildId}] ${e}`);
        }
        if (!this.guild) {
            console.log(`[${this.guildId}] Could not fetch guild with this id, guild cannot be readied.`);
            return;
        }
        await this.loadJSON();
        console.log(`[${this.guild.id}] Loaded JSON!`);
        for (const component of Array.from(this.components.values())) {
            await component.onReady();
        }
        console.log(`[${this.guild.id}] Guild Fetched and Ready! [${this.guild.name}]`);
        this.isReady = true;
    }

    /**
     * Relay's the discord client's 'guildMemberAdd' event to all components
     * @param member The added guild member
     */
    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onGuildMemberAdd(member);
            }
        }
    }

    /**
     * Relay's the discord client's 'messageCreate' event to all components
     * @param args array of strings containing the message content, separated by spaces
     * @param message the Message object
     */
    async onMessageCreate(args: string[], message: Message): Promise<void> {
        if (this.isReady) {
            // Display the prefix when mentioned
            if (this.guild?.client.user && message.mentions.has(this.guild?.client.user)) {
                await message.channel.send(`Type \`\`${this._prefix}help\`\` to see my commands!`);
            }
            for (const component of Array.from(this.components.values())) {
                await component.onMessageCreate(args, message); // All messages go through here

                // Additionally, messages will go through here if the msg starts with our guild prefix
                if (message.content.indexOf(this._prefix) === 0) {
                    // set args to be everything after the prefix, separated by spaces
                    args = message.content.slice(this._prefix.length).trim().split(/ +/g);
                    await component.onMessageCreateWithGuildPrefix(args, message);
                }
            }
        }
    }

    /**
     * Relay's the discord client's 'messageUpdate' event to all components
     * @param oldMessage the message prior to updating
     * @param newMessage the message after updating
     */
    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onMessageUpdate(oldMessage, newMessage);
            }
        }
    }

    /**
     * Relay's the discord client's 'voiceStateUpdate' event to all components
     * @param oldState the old voice state
     * @param newState the new voice state
     */
    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onVoiceStateUpdate(oldState, newState);
            }
        }
    }

    /**
     * Relay's the discord client's 'messageReactionAdd' event to all components
     * @param messageReaction the reaction added to the message
     * @param user the user who added the reaction
     */
    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onMessageReactionAdd(messageReaction, user);
            }
        }
    }

    /**
     * Relay's the discord client's 'messageReactionRemove' event to all components
     * @param messageReaction the reaction removed from the message
     * @param user the user who removed the reaction
     */
    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onMessageReactionRemove(messageReaction, user);
            }
        }
    }

    /**
     * Relay's the discord client's 'interactionCreate' event to all components
     * @param interaction the interaction
     */
    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (this.isReady) {
            for (const component of Array.from(this.components.values())) {
                await component.onInteractionCreate(interaction);
            }
        }
    }

    getGuildChannel(channelId: string): GuildBasedChannel | undefined {
        return this.guild?.channels.cache.find(channel => channel.id === channelId);
    }

    // Getters / Setters
    get debugMode(): boolean {
        return this._debugMode;
    }

    set debugMode(value: boolean) {
        this._debugMode = value;
        this.saveJSON();
    }

    get prefix(): string {
        return this._prefix;
    }

    set prefix(value: string) {
        this._prefix = value;
        this.saveJSON();
    }

    get debugChannelId(): string {
        return this._debugChannelId;
    }

    set debugChannelId(value: string) {
        this._debugChannelId = value;
        this.saveJSON();
    }

    get modAlertsChannelId(): string {
        return this._modAlertsChannelId;
    }
    
    set modAlertsChannelId(value: string) {
        this._modAlertsChannelId = value;
        this.saveJSON();
    }

    get modLoggingChannelId(): string {
        return this._modLoggingChannelId;
    }

    set modLoggingChannelId(value: string) {
        this._modLoggingChannelId = value;
        this.saveJSON();
    }
}
