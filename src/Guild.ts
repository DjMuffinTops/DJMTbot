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

export class Guild {
    client: Client;
    guildId: string;
    prefix: string;
    config: GuildConfig;
    components: Component[] = [];
    constructor(client: Client, guildId: string, guildConfig: GuildConfig) {
        this.client = client;
        this.guildId = guildId;
        this.config = guildConfig;
        this.prefix = guildConfig.prefix ? guildConfig.prefix : process.env.DEFAULT_PREFIX as string;
        this.components.push(new SayCommand(this));
        this.components.push(new CheemsCommand(this));
        this.components.push(new BSpeakCommand(this));
        this.components.push(new HelpCommand(this));
        this.components.push(new PingCommand(this));
        this.components.push(new BruhCommand(this));
        console.log(`Guild ${guildId} created`);
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
