import { Component } from "../Component";
import { ChannelType, ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, TextBasedChannel, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { isMessageAdmin } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const setDebugCommand = new SlashCommandBuilder();
setDebugCommand.setName(ComponentCommands.SET_DEBUG_CHANNEL);
setDebugCommand.setDescription("Sets the debug channel");
setDebugCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the debug channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setDebugCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const debugModeCommand = new SlashCommandBuilder();
debugModeCommand.setName(ComponentCommands.DEBUG_MODE);
debugModeCommand.setDescription("Toggles debug mode");
debugModeCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setPrefixCommand = new SlashCommandBuilder();
setPrefixCommand.setName(ComponentCommands.SET_PREFIX);
setPrefixCommand.setDescription("Sets the bot prefix");
setPrefixCommand.addStringOption(input => input.setName("prefix").setDescription("The prefix to set").setRequired(true));
setPrefixCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
// Declare data you want to save in JSON here
interface DebugComponentSave { }

export class GuildSettersComponent extends Component<DebugComponentSave> {

    name: ComponentNames = ComponentNames.DEBUG;
    commands: SlashCommandBuilder[] = [setDebugCommand, debugModeCommand, setPrefixCommand];

    async getSaveData(): Promise<DebugComponentSave> {
        return {};
    }

    async afterLoadJSON(parsedJSON: DebugComponentSave | undefined): Promise<void> {
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

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.SET_DEBUG_CHANNEL) {
            await this.setDebugChannel(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction);
        } else if (interaction.commandName === ComponentCommands.DEBUG_MODE) {
            await this.debugModeCmd(interaction);
        } else if (interaction.commandName === ComponentCommands.SET_PREFIX) {
            await this.setPrefixCmd(interaction.options.getString("prefix", true), interaction);
        }
        return Promise.resolve(undefined);
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';

        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async debugModeCmd(interaction: ChatInputCommandInteraction) {
        this.djmtGuild.debugMode = !this.djmtGuild.debugMode;
        // await updateConfig(gConfig, message);
        await interaction.reply({content: `Dev Mode ${this.djmtGuild.debugMode ? "enabled" : "disabled"}.`, ephemeral: true});
    }

    async setDebugChannel(debugChannel: TextBasedChannel, interaction: ChatInputCommandInteraction) {
        if (this.djmtGuild.debugChannelId === debugChannel.id) {
            this.djmtGuild.debugChannelId = "";
            await interaction.reply({content:`${debugChannel.toString()} is no longer set as the debugChannel`, ephemeral: true});
        } else {
            this.djmtGuild.debugChannelId = debugChannel.id;
            await interaction.reply({content:`${debugChannel.toString()} is now set as the debugChannel channel`, ephemeral: true});
        }
    }

    async setPrefixCmd(newPrefix: string, interaction: ChatInputCommandInteraction) {
        const defaultPrefix = "djmt!";
        this.djmtGuild.prefix = newPrefix ?? defaultPrefix;
        await interaction.reply({content:`Set my prefix to \`\`${this.djmtGuild.prefix}\`\``, ephemeral: true});
    }

}
