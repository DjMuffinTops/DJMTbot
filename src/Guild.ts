import {
    Channel,
    Client,
    GuildMember,
    Message,
    MessageReaction, TextChannel,
    User,
    VoiceChannel,
    VoiceState
} from "discord.js";
import {GuildConfig, Register} from "./types/types";
import {Component} from "./Components/Component";
import {SayCommand} from "./Components/Commands/SayCommand";
import {Cron} from "./types/Cron";
import {CheemsCommand} from "./Components/Commands/CheemsCommand";
import {BSpeakCommand} from "./Components/Commands/BSpeakCommand";
import {HelpCommand} from "./Components/Commands/HelpCommand";
import {PingCommand} from "./Components/Commands/PingCommand";
import {BruhCommand} from "./Components/Commands/BruhCommand";
import {promises as FileSystem} from "fs";
import {ConfigCommands} from "./Components/Commands/ConfigCommands";
import {ComponentNames} from "./Components/ComponentNames";
import {DebugComponent} from "./Components/Commands/DebugComponent";
import {VoiceTextPairCommand} from "./Components/Commands/VoiceTextPairCommand";
import {ReactBoardsComponent} from "./Components/Commands/ReactBoardsComponent";
import {JSONStringifyReplacer, JSONStringifyReviver} from "./commands/helper";
import {DayOfTheWeekComponent} from "./Components/Commands/DayOfTheWeekComponent";
import {VCHoursComponent} from "./Components/Commands/VCHoursComponent";
const defaultConfig = require("../json/defaultConfig.json");

export class Guild implements GuildConfig {
    client: Client;
    readonly guildId: string;
    // Config
    private _debugMode: boolean = defaultConfig.debugMode;
    private _prefix: string = process.env.DEFAULT_PREFIX as string;
    private _registered: boolean = defaultConfig.registered;
    private _debugChannel: string = defaultConfig.debugChannel;
    register: Register = defaultConfig.register;
    components: Map<ComponentNames, Component<any>>;

    constructor(client: Client, guildId: string) {
        this.client = client;
        this.guildId = guildId;
        this.components = new Map<ComponentNames, Component<any>>();
        try {
            this.initializeComponents().then(() => {
                this.loadJSON().then(r => console.log(`[${guildId}] Guild initialized and loaded JSON.`));
            })
        } catch (e) {
            console.log(`[${guildId}]: ${e}`);
        }

    }

    private async initializeComponents(): Promise<void> {
        this.components.set(ComponentNames.CONFIG, new ConfigCommands(this));
        this.components.set(ComponentNames.SAY, new SayCommand(this));
        this.components.set(ComponentNames.CHEEMS, new CheemsCommand(this));
        this.components.set(ComponentNames.BSPEAK, new BSpeakCommand(this));
        this.components.set(ComponentNames.HELP, new HelpCommand(this));
        this.components.set(ComponentNames.PING, new PingCommand(this));
        this.components.set(ComponentNames.BRUH, new BruhCommand(this));
        this.components.set(ComponentNames.DEBUG, new DebugComponent(this));
        this.components.set(ComponentNames.VOICE_TEXT_PAIR, new VoiceTextPairCommand(this));
        this.components.set(ComponentNames.REACT_BOARDS, new ReactBoardsComponent(this));
        this.components.set(ComponentNames.DAY_OF_THE_WEEK, new DayOfTheWeekComponent(this));
        this.components.set(ComponentNames.VC_HOURS, new VCHoursComponent(this));
    }

    getComponent(name: ComponentNames): Component<any> | undefined {
        return this.components.get(name);
    }



    getSaveData(): GuildConfig {
        return {
            debugMode: this._debugMode,
            prefix: this._prefix,
            registered: this._registered,
            debugChannel: this._debugChannel,
            register: this.register,
        }
    }

    // Config Read / Write
    async loadJSON(): Promise<void> {
        const buffer = await FileSystem.readFile(`./json/guilds/${this.guildId}.json`);
        const gConfig = JSON.parse(buffer.toString(), JSONStringifyReviver)[this.guildId] as GuildConfig;
        this._debugMode = gConfig.debugMode || defaultConfig.debugMode;
        this._prefix = gConfig.prefix || process.env.DEFAULT_PREFIX as string;
        this._registered = gConfig.registered || defaultConfig.registered;
        this._debugChannel = gConfig.debugChannel || '';
        this.register = gConfig.register as Register || {};
        for (const component of Array.from(this.components.values())) {
            // @ts-ignore
            await component.afterLoadJSON(gConfig.register[component.name]);
        }
    }

    async saveJSON(): Promise<void> {
        const filename = `./json/guilds/${this.guildId}.json`;
        for (const component of Array.from(this.components.values())) {
            // @ts-ignore
            this.register[component.name] = await component.getSaveData();
        }
        await FileSystem.writeFile(filename, JSON.stringify({[this.guildId]: this.getSaveData()}, JSONStringifyReplacer, '\t'));
        console.log(`${filename} saved`);
        // if (this.devMode){
        //     await message.channel.send(`\`\`\`json\n${JSON.stringify({[guildId]: config},null, '\t')}\`\`\``);
        // }
    }

    async resetJSON() {
        this._debugMode = defaultConfig.devMode;
        this._prefix = process.env.DEFAULT_PREFIX as string;
        this._registered = defaultConfig.registered;
        this._debugChannel = defaultConfig.debugChannel;
        this.register = defaultConfig.register;
        console.log(`Reset ${this.guildId} config to default settings.`);
        await this.saveJSON();
        await this.loadJSON();
    }

    // Events
    async onReady(): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onReady();
        }
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onGuildMemberAdd(member);
        }
    }
    async onMessage(args: string[], message: Message): Promise<void> {
        // Display the prefix when mentioned
        if (this.client?.user && message.mentions.has(this.client.user)) {
            await message.channel.send(`Type \`\`${this.guildId}help\`\` to see my commands!`);
        }
        for (const component of Array.from(this.components.values())) {
            await component.onMessage(args, message);

            // Pass through if it starts with our prefix
            if (message.content.indexOf(this._prefix) === 0) {
                args = message.content.slice(this._prefix.length).trim().split(/ +/g);
                await component.onMessageWithGuildPrefix(args, message);
            }
        }
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onMessageUpdate(oldMessage, newMessage);
        }
    }
    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onVoiceStateUpdate(oldState, newState);
        }
    }
    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onMessageReactionAdd(messageReaction, user);
        }
    }
    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onMessageReactionRemove(messageReaction, user);
        }
    }
    async onTypingStart(channel: Channel, user: User):Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onTypingStart(channel, user);
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

    get registered(): boolean {
        return this._registered;
    }

    set registered(value: boolean) {
        this._registered = value;
        this.saveJSON();
    }

    get debugChannel(): string {
        return this._debugChannel;
    }

    set debugChannel(value: string) {
        this._debugChannel = value;
        this.saveJSON();
    }
}
