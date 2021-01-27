import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {GuildConfig} from "./types/types";
import {Component} from "./Components/Component";
import {SayCommand} from "./Components/Commands/SayCommand";
import {Cron} from "./types/Cron";
import {CheemsCommand} from "./Components/Commands/CheemsCommand";
import {BSpeakCommand} from "./Components/Commands/BSpeakCommand";
import {HelpCommand} from "./Components/Commands/HelpCommand";
import {PingCommand} from "./Components/Commands/PingCommand";
import {BruhCommand} from "./Components/Commands/BruhCommand";
import {promises as FileSystem} from "fs";
import {getConfig} from "./commands/config";
import {isAdmin} from "./commands/helper";
import {ConfigCommands} from "./Components/Commands/ConfigCommands";

export class Guild {
    client: Client;
    guildId: string;
    prefix: string = process.env.DEFAULT_PREFIX as string;
    config!: GuildConfig;
    components: Component[] = [];
    constructor(client: Client, guildId: string) {
        this.client = client;
        this.guildId = guildId;
        this.loadConfig().then(() => { // sets this.config and this.prefix
            this.components.push(new ConfigCommands(this));
            this.components.push(new SayCommand(this));
            this.components.push(new CheemsCommand(this));
            this.components.push(new BSpeakCommand(this));
            this.components.push(new HelpCommand(this));
            this.components.push(new PingCommand(this));
            this.components.push(new BruhCommand(this));
            console.log(`Guild ${guildId} created`);
        });
    }

    // Config Read / Write
    private async loadConfig(): Promise<void> {
        const buffer = await FileSystem.readFile(`./json/guilds/${this.guildId}.json`);
        const gConfig = JSON.parse(buffer.toString());
        const config = gConfig[this.guildId];
        this.config = config;
        this.prefix = config.prefix ? config.prefix : process.env.DEFAULT_PREFIX as string;
    }

    async saveConfig(): Promise<void> {
        const filename = `./json/guilds/${this.guildId}.json`;
        await FileSystem.writeFile(filename, JSON.stringify({[this.guildId]: this.config},null, '\t'));
        console.log(`${filename} saved`);
        // const gConfig = this.getConfig();
        // // @ts-ignore
        // if (gConfig?.devMode){
        //     await message.channel.send(`\`\`\`json\n${JSON.stringify({[this.guildId]: config},null, '\t')}\`\`\``);
        // }
    }

    // Cron Scheduling https://github.com/node-cron/node-cron
    async cron(cron: Cron): Promise<void> {
        for (const component of this.components) {
            await component.cron(cron);
        }
    }
    // Events
    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        for (const component of this.components) {
            await component.onGuildMemberAdd(member);
        }
    }
    async onMessage(args: string[], message: Message): Promise<void> {
        // Display the prefix when mentioned
        if (this.client?.user && message.mentions.has(this.client.user)) {
            // @ts-ignore
            await message.channel.send(`Type \`\`${guildPrefix}help\`\` to see my commands!`);
        }
        for (const component of this.components) {
            await component.onMessage(args, message);

            // Pass through if it starts with our prefix
            if (message.content.indexOf(this.prefix) === 0) {
                args = message.content.slice(this.prefix.length).trim().split(/ +/g);
                await component.onMessageWithGuildPrefix(args, message);
            }
        }
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        for (const component of this.components) {
            await component.onMessageUpdate(oldMessage, newMessage);
        }
    }
    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        for (const component of this.components) {
            await component.onVoiceStateUpdate(oldState, newState);
        }
    }
    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        for (const component of this.components) {
            await component.onMessageReactionAdd(messageReaction, user);
        }
    }
    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        for (const component of this.components) {
            await component.onMessageReactionRemove(messageReaction, user);
        }
    }
    async onTypingStart(channel: Channel, user: User):Promise<void> {
        for (const component of this.components) {
            await component.onTypingStart(channel, user);
        }
    }

}
