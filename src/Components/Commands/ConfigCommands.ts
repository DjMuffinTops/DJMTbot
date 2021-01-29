import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {isAdmin} from "../../commands/helper";
import {ComponentNames} from "../ComponentNames";
const defaultConfig = require("../../../json/defaultConfig.json");

export interface IConfigCommands {}
export class ConfigCommands extends Component<IConfigCommands>{

    name: ComponentNames = ComponentNames.CONFIG;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.EXPORT_CONFIG) {
            await this.exportConfig(args, message);
        } else if (command === CommandStrings.RESET_CONFIG) {
            await this.resetConfig(message);
        }
    }

    async onLoadJSON(register: IConfigCommands): Promise<void> {
        return Promise.resolve(undefined);
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
        console.log(this.guild.getJSON());
        const jsonString = `"${this.guild.guildId}": ${JSON.stringify(this.guild.getJSON(),null, '\t')}`;
        await message.channel.send(`\`\`\`json\n${jsonString}\n\`\`\``);
    }

    async resetConfig(message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        await this.guild.resetJSON();
        await message.channel.send(`Reset my guild config to default settings.`);
    }

}
