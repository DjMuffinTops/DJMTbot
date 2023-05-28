import { Component } from "../Component";
import {
    GuildMember,
    Message,
    AttachmentBuilder,
    MessageReaction,
    User,
    VoiceState,
    Interaction
} from "discord.js";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { isMessageAdmin, JSONStringifyReplacer } from "../HelperFunctions";
import { ComponentNames } from "../Constants/ComponentNames";
import { DateTime } from "luxon";

interface ConfigComponentSave { }
export class ConfigComponent extends Component<ConfigComponentSave>{

    name: ComponentNames = ComponentNames.CONFIG;

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
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

    async onMessageCreate(args: string[], message: Message): Promise<void> {
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

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        return Promise.resolve(undefined);
    }

    async exportConfig(args: string[], message: Message) {
        // Admin only
        if (!isMessageAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        const jsonString = `${JSON.stringify({ [this.djmtGuild.guildId]: this.djmtGuild.getSaveData() }, JSONStringifyReplacer, '  ')}`;
        const attachment = new AttachmentBuilder(Buffer.from(jsonString), { name: `config_${this.djmtGuild.guildId}_${DateTime.local().toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS)}.txt` });
        await message.channel.send({ files: [attachment] });
    }

    async resetConfig(message: Message) {
        // Admin only
        if (!isMessageAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        await this.djmtGuild.resetJSON();
        await message.channel.send(`Reset my guild config to default settings.`);
    }

}
