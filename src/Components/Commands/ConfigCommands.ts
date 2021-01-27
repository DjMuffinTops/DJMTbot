import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {isAdmin} from "../../commands/helper";
import {updateConfig} from "../../commands/config";
const defaultConfig = require("../../../json/defaultConfig.json");

export class ConfigCommands extends Component{

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.EXPORT_CONFIG) {
            await this.exportConfig(args, message);
        } else if (command === CommandStrings.RESET_CONFIG) {
            await this.resetConfig(message);
        }
    }

    async cron(cron: Cron): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessage(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
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

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async exportConfig(args:string [], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        console.log(this.guild.config);
        const jsonString = `"${this.guild.guildId}": ${JSON.stringify(this.guild.config,null, '\t')}`;
        await message.channel.send(`\`\`\`json\n${jsonString}\n\`\`\``);
    }

    async resetConfig(message: Message, force: boolean = false) {
        // Admin only
        if (!force && !isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        await updateConfig(defaultConfig, message);
        if (!force){
            await message.channel.send(`Reset my guild config to default settings.`);
        } else {
            console.log(`Reset my guild config to default settings.`);
        }
    }

}
