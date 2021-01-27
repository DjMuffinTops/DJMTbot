import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {isAdmin} from "../../commands/helper";
import {getConfig, updateConfig} from "../../commands/config";

export class ComponentTemplate extends Component{
    
    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.SET_PREFIX) {
            await this.setPrefixCmd(args, message);
        }
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

    async setPrefixCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        const gConfig = this.guild.config;
        if (args.length === 0) {
            gConfig.prefix = process.env.DEFAULT_PREFIX as string;
            await this.guild.saveConfig(); // TODO: we should call save on gConfig itself
            await message.channel.send(`Set my prefix to \`\`${process.env.DEFAULT_PREFIX}\`\``);
        } else if (args.length === 1) {
            gConfig.prefix = args[0] ? args[0] : process.env.DEFAULT_PREFIX as string;
            await this.guild.saveConfig();
            await message.channel.send(`Set my prefix to \`\`${gConfig.prefix}\`\``);
        } else {
            await message.channel.send(`Please enter a single prefix.`);
        }
    }

}
