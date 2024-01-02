import {Component} from "../Component";
import {ChannelType, ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, TextBasedChannel, User, VoiceState} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {ComponentCommands} from "../Constants/ComponentCommands";

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

const setModAlertsChannelCommand = new SlashCommandBuilder();
setModAlertsChannelCommand.setName(ComponentCommands.SET_MOD_ALERTS_CHANNEL);
setModAlertsChannelCommand.setDescription("Sets the mod alerts channel");
setModAlertsChannelCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the mod alerts channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setModAlertsChannelCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setModLoggingChannelCommand = new SlashCommandBuilder();
setModLoggingChannelCommand.setName(ComponentCommands.SET_MOD_LOGGING_CHANNEL);
setModLoggingChannelCommand.setDescription("Sets the mod logging channel");
setModLoggingChannelCommand.addChannelOption(input => input.setName("channel").setDescription("The channel to add or remove from the mod logging channels list").addChannelTypes(ChannelType.GuildText).setRequired(true));
setModLoggingChannelCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Declare data you want to save in JSON here
interface DebugComponentSave { }

export class GuildSettersComponent extends Component<DebugComponentSave> {

    name: ComponentNames = ComponentNames.DEBUG;
    commands: SlashCommandBuilder[] = [setDebugCommand, debugModeCommand, setPrefixCommand, setModAlertsChannelCommand, setModLoggingChannelCommand];

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
        } else if (interaction.commandName === ComponentCommands.SET_MOD_ALERTS_CHANNEL) {
            await this.setModAlertsChannel(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction);
        } else if (interaction.commandName === ComponentCommands.SET_MOD_LOGGING_CHANNEL) {
            await this.setModLoggingChannel(interaction.options.getChannel<ChannelType.GuildText>("channel", true), interaction);
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
        await interaction.reply({ content: `Dev Mode ${this.djmtGuild.debugMode ? "enabled" : "disabled"}.`, ephemeral: true });
    }

    async setDebugChannel(debugChannel: TextBasedChannel, interaction: ChatInputCommandInteraction) {
        if (this.djmtGuild.debugChannelId === debugChannel.id) {
            this.djmtGuild.debugChannelId = "";
            await interaction.reply({ content: `${debugChannel.toString()} is no longer set as the debugChannel`, ephemeral: true });
        } else {
            this.djmtGuild.debugChannelId = debugChannel.id;
            await interaction.reply({ content: `${debugChannel.toString()} is now set as the debugChannel channel`, ephemeral: true });
        }
    }

    async setPrefixCmd(newPrefix: string, interaction: ChatInputCommandInteraction) {
        const defaultPrefix = "djmt!";
        this.djmtGuild.prefix = newPrefix ?? defaultPrefix;
        await interaction.reply({ content: `Set my prefix to \`\`${this.djmtGuild.prefix}\`\``, ephemeral: true });
    }

    async setModAlertsChannel(modAlertsChannel: TextBasedChannel, interaction: ChatInputCommandInteraction) {
        if (this.djmtGuild.modAlertsChannelId === modAlertsChannel.id) {
            this.djmtGuild.modAlertsChannelId = "";
            await interaction.reply({ content: `${modAlertsChannel.toString()} is no longer set as the mod alerts channel`, ephemeral: true });
        } else {
            this.djmtGuild.modAlertsChannelId = modAlertsChannel.id;
            await interaction.reply({ content: `${modAlertsChannel.toString()} is now set as the mod alerts channel`, ephemeral: true });
        }
    }

    async setModLoggingChannel(modLoggingChannel: TextBasedChannel, interaction: ChatInputCommandInteraction) {
        if (this.djmtGuild.modLoggingChannelId === modLoggingChannel.id) {
            this.djmtGuild.modLoggingChannelId = "";
            await interaction.reply({ content: `${modLoggingChannel.toString()} is no longer set as the mod logging channel`, ephemeral: true });
        } else {
            this.djmtGuild.modLoggingChannelId = modLoggingChannel.id;
            await interaction.reply({ content: `${modLoggingChannel.toString()} is now set as the mod logging channel`, ephemeral: true });
        }
    }

}
