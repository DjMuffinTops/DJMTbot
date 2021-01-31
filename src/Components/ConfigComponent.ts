import {Component} from "../Component";
import {
    Channel,
    GuildMember,
    Message,
    MessageAttachment,
    MessageReaction,
    User,
    VoiceState
} from "discord.js";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {isAdmin, JSONStringifyReplacer} from "../HelperFunctions";
import {ComponentNames} from "../Constants/ComponentNames";
import {DateTime} from "luxon";

export interface ConfigComponentSave {}
export class ConfigComponent extends Component<ConfigComponentSave>{

    name: ComponentNames = ComponentNames.CONFIG;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.EXPORT_CONFIG) {
            await this.exportConfig(args, message);
        } else if (command === ComponentCommands.RESET_CONFIG) {
            await this.resetConfig(message);
        }
    }

    async getSaveData(): Promise<ConfigComponentSave> {
        return {};
    }

    async afterLoadJSON(parsedJSON: ConfigComponentSave | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
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
        const jsonString = `"${this.guild.guildId}": ${JSON.stringify({[this.guild.guildId]: this.getSaveData()}, JSONStringifyReplacer, '\\t')}`;
        const attachment = new MessageAttachment(Buffer.from(jsonString), `config_${this.guild.guildId}_${DateTime.local().toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}.txt`);
        await message.channel.send(attachment);
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
