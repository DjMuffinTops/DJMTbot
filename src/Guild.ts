import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
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
const defaultConfig = require("../json/defaultConfig.json");

export class Guild implements GuildConfig {
    client: Client;
    readonly guildId: string;
    // Config
    private _devMode: boolean = defaultConfig.devMode;
    private _prefix: string = process.env.DEFAULT_PREFIX as string;
    private _registered: boolean = defaultConfig.registered;
    private _debugChannel: string = defaultConfig.debugChannel;
    register: Register = defaultConfig.register;
    components: Map<ComponentNames, Component<any>>;

    constructor(client: Client, guildId: string) {
        this.client = client;
        this.guildId = guildId;
        this.components = new Map<ComponentNames, Component<any>>();
        this.components.set(ComponentNames.CONFIG, new ConfigCommands(this));
        this.components.set(ComponentNames.SAY, new SayCommand(this));
        this.components.set(ComponentNames.CHEEMS, new CheemsCommand(this));
        this.components.set(ComponentNames.BSPEAK, new BSpeakCommand(this));
        this.components.set(ComponentNames.HELP, new HelpCommand(this));
        this.components.set(ComponentNames.PING, new PingCommand(this));
        this.components.set(ComponentNames.BRUH, new BruhCommand(this));
        this.loadJSON().then(() => { // sets this.config and this.prefix
            console.log(`Guild ${guildId} created`);
        });
    }

    getComponent(name: ComponentNames): Component<any> | undefined {
        return this.components.get(name);
    }

    getJSON(): GuildConfig {
        return {
            devMode: this._devMode,
            prefix: this._prefix,
            registered: this._registered,
            debugChannel: this._debugChannel,
            register: this.register
        }
    }

    // Config Read / Write
    private async loadJSON(): Promise<void> {
        const buffer = await FileSystem.readFile(`./json/guilds/${this.guildId}.json`);
        const gConfig = JSON.parse(buffer.toString()) as GuildConfig;
        this._devMode = gConfig.devMode;
        this._prefix = gConfig.prefix;
        this._registered = gConfig.registered;
        this._debugChannel = gConfig.debugChannel;
        this.register = gConfig.register as Register;
        for (const component of Array.from(this.components.values())) {
            await component.onLoadJSON(gConfig.register[component.name]);
        }
    }

    async saveJSON(): Promise<void> {
        const filename = `./json/guilds/${this.guildId}.json`;
        await FileSystem.writeFile(filename, JSON.stringify({[this.guildId]: this.getJSON()},null, '\t'));
        console.log(`${filename} saved`);
    }

    async resetJSON() {
        this._devMode = defaultConfig.devMode;
        this._prefix = process.env.DEFAULT_PREFIX as string;
        this._registered = defaultConfig.registered;
        this._debugChannel = defaultConfig.debugChannel;
        this.register = defaultConfig.register;
        console.log(`Reset ${this.guildId} config to default settings.`);
        await this.saveJSON();
        await this.loadJSON();
    }

    // Cron Scheduling https://github.com/node-cron/node-cron
    async cron(cron: Cron): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.cron(cron);
        }
    }
    // Events
    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        for (const component of Array.from(this.components.values())) {
            await component.onGuildMemberAdd(member);
        }
    }
    async onMessage(args: string[], message: Message): Promise<void> {
        // Display the prefix when mentioned
        if (this.client?.user && message.mentions.has(this.client.user)) {
            // @ts-ignore
            await message.channel.send(`Type \`\`${guildPrefix}help\`\` to see my commands!`);
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
    get devMode(): boolean {
        return this._devMode;
    }

    set devMode(value: boolean) {
        this._devMode = value;
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
