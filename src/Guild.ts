import {
    Channel,
    Client, GuildChannel,
    GuildMember,
    Message, MessageAttachment, MessageEmbed,
    MessageReaction, TextChannel,
    User,
    VoiceState
} from "discord.js";
import {Component} from "./Component";
import {SayComponent} from "./Components/SayComponent";
import {CheemsComponent} from "./Components/CheemsComponent";
import {BSpeakComponent} from "./Components/BSpeakComponent";
import {HelpComponent} from "./Components/HelpComponent";
import {PingComponent} from "./Components/PingComponent";
import {BruhComponent} from "./Components/BruhComponent";
import {promises as FileSystem} from "fs";
import {ConfigComponent} from "./Components/ConfigComponent";
import {ComponentNames} from "./Constants/ComponentNames";
import {GuildSettersComponent} from "./Components/GuildSettersComponent";
import {VoiceTextPairComponent} from "./Components/VoiceTextPairComponent";
import {ReactBoardsComponent} from "./Components/ReactBoardsComponent";
import {JSONStringifyReplacer, JSONStringifyReviver} from "./HelperFunctions";
import {DayOfTheWeekComponent} from "./Components/DayOfTheWeekComponent";
import {VCHoursComponent} from "./Components/VCHoursComponent";
const defaultConfig = require("../json/defaultConfig.json");

// The structure of a Guild's save data JSON.
export interface GuildConfig {
    debugMode: boolean,
    prefix: string,
    debugChannelId: string,
    componentData: any,
}

/**
 * Represents a single discord server (referred to as a Guild by discord js api). Each guild instance
 * maintains its own component instances as well. When creating a new component for guilds, make sure
 * to add it to initializeComponents().
 */
export class Guild {
    client: Client;
    isReady: boolean = false;
    readonly guildId: string;
    // Config
    private _debugMode: boolean = defaultConfig.debugMode;
    private _prefix: string = process.env.DEFAULT_PREFIX as string;
    private _debugChannelId: string = defaultConfig.debugChannelId;
    private componentData = defaultConfig.componentData;
    private components: Map<ComponentNames, Component<any>>;

    constructor(client: Client, guildId: string) {
        this.client = client;
        this.guildId = guildId;
        this.components = new Map<ComponentNames, Component<any>>();
        try {
            this.initializeComponents().then(() => {
                console.log(`[${guildId}] Guild initialized`);
            })
        } catch (e) {
            console.log(`[${guildId}]: ${e}`);
        }

    }

    /**
     * Initializes each component for this guild. Any new components NEED to be added to the
     * components map to be run and receive events.
     * @private
     */
    private async initializeComponents(): Promise<void> {
        this.components.set(ComponentNames.CONFIG, new ConfigComponent(this));
        this.components.set(ComponentNames.SAY, new SayComponent(this));
        this.components.set(ComponentNames.CHEEMS, new CheemsComponent(this));
        this.components.set(ComponentNames.BSPEAK, new BSpeakComponent(this));
        this.components.set(ComponentNames.HELP, new HelpComponent(this));
        this.components.set(ComponentNames.PING, new PingComponent(this));
        this.components.set(ComponentNames.BRUH, new BruhComponent(this));
        this.components.set(ComponentNames.DEBUG, new GuildSettersComponent(this));
        this.components.set(ComponentNames.VOICE_TEXT_PAIR, new VoiceTextPairComponent(this));
        this.components.set(ComponentNames.REACT_BOARDS, new ReactBoardsComponent(this));
        this.components.set(ComponentNames.DAY_OF_THE_WEEK, new DayOfTheWeekComponent(this));
        this.components.set(ComponentNames.VC_HOURS, new VCHoursComponent(this));
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
        await FileSystem.writeFile(filename, JSON.stringify({[this.guildId]: this.getSaveData()}, JSONStringifyReplacer, '\t'));
        console.log(`${filename} saved`);
        if (this.debugMode){
            const foundChannel = await this.getDebugChannel();
            const attachment = new MessageAttachment(Buffer.from(JSON.stringify({[this.guildId]: this.getSaveData()}, JSONStringifyReplacer, '\t')), 'config.txt');
            await foundChannel.send(attachment);
        }
    }

    private async getDebugChannel(): Promise<TextChannel> {
        return await this.client.channels.fetch(this.debugChannelId) as TextChannel;
    }

    /**
     * Resets the guild's data to default and reset's the saved JSON
     */
    async resetJSON() {
        this._debugMode = defaultConfig.devMode;
        this._prefix = process.env.DEFAULT_PREFIX as string;
        this._debugChannelId = defaultConfig.debugChannel;
        this.componentData = defaultConfig.componentData;
        console.log(`Reset ${this.guildId} config to default settings.`);
        if (this.debugChannelId) {
            const debugChannel = await this.getDebugChannel();
            await debugChannel.send(`Reset this guild's config`);
        }
        await this.saveJSON();
        await this.loadJSON();
    }

    // Events

    /**
     * Relay's the discord client's 'ready' event to all components
     */
    async onReady(): Promise<void> {
        await this.loadJSON();
        console.log('Loaded JSON!');
        for (const component of Array.from(this.components.values())) {
            await component.onReady();
        }
        const cachedGuild = this.client.guilds.cache.find(guild => guild.id === this.guildId);
        console.log(`[${this.guildId}] Guild Ready! [${cachedGuild?.name}]`);
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
     * Relay's the discord client's 'message' event to all components
     * @param args array of strings containing the message content, separated by spaces
     * @param message the Message object
     */
    async onMessage(args: string[], message: Message): Promise<void> {
        if (this.isReady) {
            // Display the prefix when mentioned
            if (this.client?.user && message.mentions.has(this.client.user)) {
                await message.channel.send(`Type \`\`${this._prefix}help\`\` to see my commands!`);
            }
            for (const component of Array.from(this.components.values())) {
                await component.onMessage(args, message); // All messages go through here

                // Additionally, messages will go through here if the msg starts with our guild prefix
                if (message.content.indexOf(this._prefix) === 0) {
                    // set args to be everything after the prefix, separated by spaces
                    args = message.content.slice(this._prefix.length).trim().split(/ +/g);
                    await component.onMessageWithGuildPrefix(args, message);
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
}
