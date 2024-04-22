import { GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { Component } from "../Component";
import { getCensoredMessageReplyOptions, getGuildMembersRoles, isMessageAdmin } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const toggleEveryoneSpamTimeoutCommand = new SlashCommandBuilder();
toggleEveryoneSpamTimeoutCommand.setName(ComponentCommands.TOGGLE_EVERYONE_SPAM_TIMEOUT);
toggleEveryoneSpamTimeoutCommand.setDescription("Toggles the @everyone and @here spam timeout feature");
toggleEveryoneSpamTimeoutCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setEveryoneSpamTimeoutRolesCommand = new SlashCommandBuilder();
setEveryoneSpamTimeoutRolesCommand.setName(ComponentCommands.SET_EVERYONE_SPAM_TIMEOUT_ROLES);
setEveryoneSpamTimeoutRolesCommand.setDescription("Adds or removes roles that are permitted to bypass the @everyone and @here timeout feature");
setEveryoneSpamTimeoutRolesCommand.addRoleOption(input => input.setName("role").setDescription("The role to add or remove from the permitted roles list").setRequired(true));
setEveryoneSpamTimeoutRolesCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface EveryoneSpamTimeoutSave {
    enabled: boolean;
    permittedRoleIds: string[];
}

const EVERYONE_PING = "@everyone";
const HERE_PING = "@here";
const TIMEOUT_DURATION_MS = 28 * 24 * 60 * 60 * 1000; // The maximum timeout duration on discord is 28 days

export class EveryoneSpamTimeout extends Component<EveryoneSpamTimeoutSave> {

    // MANDATORY: Define a name in ComponentNames.ts and place it here.
    name: ComponentNames = ComponentNames.EXAMPLE_COMPONENT;
    commands: SlashCommandBuilder[] = [toggleEveryoneSpamTimeoutCommand, setEveryoneSpamTimeoutRolesCommand]
    permittedRoleIds: string[] = [];
    enabled: boolean = false;
    // Place SlashCommandBuilder(s) directly into this array for them to be registered.

    async getSaveData(): Promise<EveryoneSpamTimeoutSave> {
        return {
            enabled: this.enabled,
            permittedRoleIds: this.permittedRoleIds
        };
    }

    async afterLoadJSON(loadedObject: EveryoneSpamTimeoutSave | undefined): Promise<void> {
        if (loadedObject) {
            this.enabled = loadedObject.enabled;
            this.permittedRoleIds = loadedObject.permittedRoleIds;
        }
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        try {
            await this.handleEveryoneSpam(message);
        } catch (error) {
            console.error(`[${this.djmtGuild.guildId}] Error in EveryoneSpamTimeout.onMessageCreate for member ${message.member?.user.username}: ${error}`);
        }
        return Promise.resolve(undefined);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        try {
            await this.handleEveryoneSpam(newMessage);
        } catch (error) {
            console.error(`[${this.djmtGuild.guildId}] Error in EveryoneSpamTimeout.onMessageUpdate: ${error}`);
        }
        return Promise.resolve(undefined);
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.TOGGLE_EVERYONE_SPAM_TIMEOUT) {
            this.enabled = !this.enabled;
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Everyone spam timeout feature is now ${this.enabled ? 'active' : 'disabled'}.` });
        } else if (interaction.commandName === ComponentCommands.SET_EVERYONE_SPAM_TIMEOUT_ROLES) {
            const role = interaction.options.getRole("role", true);
            if (this.permittedRoleIds.includes(role.id)) {
                this.permittedRoleIds = this.permittedRoleIds.filter(id => id !== role.id);
                await interaction.reply({ content: `Role ${role.name} removed from the permitted roles list.` });
            } else {
                this.permittedRoleIds.push(role.id);
                await interaction.reply({ content: `Role ${role.name} added to the permitted roles list.` });
            }
            await this.djmtGuild.saveJSON();
        }
        return Promise.resolve(undefined);
    }

    async handleEveryoneSpam(message: Message) {
        // Don't do anything if the feature is disabled
        if (!this.enabled) {
            return Promise.resolve(undefined);
        }

        // Don't do anything if the author is a bot, if the message is from an admin, or if the message is not from a guild member
        if (message.author.bot || isMessageAdmin(message) || !message.member) {
            return Promise.resolve(undefined);
        }

        // Does the message contain an @everyone or @here ping?
        const hasEveryoneOrHerePing = message.mentions.everyone || message.content.includes(EVERYONE_PING) || message.content.includes(HERE_PING);

        // If it doesn't have either don't do anything
        if (!hasEveryoneOrHerePing) {
            return Promise.resolve(undefined);
        }

        // Is the guild member part of the permitted roles?
        const memberRoles = getGuildMembersRoles(message.member);
        const hasPermittedRole = memberRoles.some(role => this.permittedRoleIds.includes(role.id));

        // If the member has a permitted role, don't do anything
        if (hasPermittedRole) {
            return Promise.resolve(undefined);
        }

        // Otherwise, delete the message, timeout the user indefinitely, and send a warning message to the mod alerts channel

        // Delete the message
        await message.delete();

        // Timeout the user indefinitely
        await message.member.timeout(TIMEOUT_DURATION_MS, "Attempting to send @everyone or @here pings");

        // Send a warning message to the mod alerts channel
        const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
        if (modAlertsChannel) {
            const msg1 = await modAlertsChannel.send(`⚠️ ${message.author} has been timed out for attempt to send the following everyone and/or here pings in <#${message.channel.id}>`);
            // Relay the exact same message content to the mod alerts channel with all included attachments and embeds
            await msg1.reply(getCensoredMessageReplyOptions(message));
        }
    }
}
