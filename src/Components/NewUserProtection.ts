import { Component } from "../Component";
import { ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, MessageType, PermissionFlagsBits, SlashCommandBuilder, TextChannel, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { DateTime } from "luxon";
import { MEDIA_LINK_REGEX, getCensoredMessageReplyOptions } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const NEW_USER_THRESHOLD_IN_DAYS_DEFAULT = 60;
const NEW_USER_BAN_THRESHOLD_IN_DAYS_DEFAULT = 7;

const toggleNewUserMediaLockCommand = new SlashCommandBuilder();
toggleNewUserMediaLockCommand.setName(ComponentCommands.TOGGLE_NEW_USER_MEDIA_LOCK);
toggleNewUserMediaLockCommand.setDescription("Toggles the new user media lock feature.");
toggleNewUserMediaLockCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const toggleNewUserBanCommand = new SlashCommandBuilder();
toggleNewUserBanCommand.setName(ComponentCommands.TOGGLE_NEW_USER_BAN);
toggleNewUserBanCommand.setDescription("Toggles the new user ban feature.");
toggleNewUserBanCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setNewUserThresholdInDaysCommand = new SlashCommandBuilder();
setNewUserThresholdInDaysCommand.setName(ComponentCommands.SET_NEW_USER_MEDIA_LOCK_THRESHOLD_IN_DAYS);
setNewUserThresholdInDaysCommand.setDescription("Sets the number of days a user must have been registered to not be considered for the media lock.");
setNewUserThresholdInDaysCommand.addIntegerOption(option => option.setName("days").setDescription("The number of days a user must have been registered to not be considered for the media lock.").setRequired(true));
setNewUserThresholdInDaysCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setNewUserBanThresholdInDaysCommand = new SlashCommandBuilder();
setNewUserBanThresholdInDaysCommand.setName(ComponentCommands.SET_NEW_USER_BAN_THRESHOLD_IN_DAYS);
setNewUserBanThresholdInDaysCommand.setDescription("Sets the number of days a user must have been registered to not be considered for the auto ban.");
setNewUserBanThresholdInDaysCommand.addIntegerOption(option => option.setName("days").setDescription("The number of days a user must have been registered to not be considered for the auto ban.").setRequired(true));
setNewUserBanThresholdInDaysCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const permitNewUserRestrictionsCommand = new SlashCommandBuilder();
permitNewUserRestrictionsCommand.setName(ComponentCommands.PERMIT_NEW_USER_RESTRICTIONS);
permitNewUserRestrictionsCommand.setDescription("Permits a user to by pass all new user restrictions.");
permitNewUserRestrictionsCommand.addUserOption(option => option.setName("user").setDescription("The user to bypass new user restrictions for").setRequired(true));
permitNewUserRestrictionsCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface NewUserProtectionSave {
    newUserMediaLockEnabled: boolean;
    newUserMediaLockThresholdInDays: number; // Accounts must be older than this in days to not be considered new
    newUserBanThresholdInDays: number; // Accounts must be older than this in days to not be considered new
    newUserBanEnabled: boolean;
    permittedUsers: string[];
}
export class NewUserProtection extends Component<NewUserProtectionSave> {

    name: ComponentNames = ComponentNames.NEW_USER_PROTECTION;
    permittedUsers: Set<string> = new Set<string>();
    commands: SlashCommandBuilder[] = [permitNewUserRestrictionsCommand, toggleNewUserMediaLockCommand, toggleNewUserBanCommand, setNewUserThresholdInDaysCommand, setNewUserBanThresholdInDaysCommand];
    newUserMediaThresholdInDays: number = NEW_USER_THRESHOLD_IN_DAYS_DEFAULT;
    newUserMediaLockEnabled: boolean = false;
    newUserBanThresholdInDays: number = NEW_USER_BAN_THRESHOLD_IN_DAYS_DEFAULT;
    newUserBanEnabled: boolean = false;

    async getSaveData(): Promise<NewUserProtectionSave> {
        return {
            newUserMediaLockEnabled: this.newUserMediaLockEnabled,
            newUserMediaLockThresholdInDays: this.newUserMediaThresholdInDays,
            newUserBanEnabled: this.newUserBanEnabled,
            newUserBanThresholdInDays: this.newUserBanThresholdInDays,
            permittedUsers: Array.from(this.permittedUsers)
        };
    }

    async afterLoadJSON(loadedObject: NewUserProtectionSave | undefined): Promise<void> {
        if (loadedObject) {
            this.newUserMediaLockEnabled = loadedObject.newUserMediaLockEnabled;
            this.newUserMediaThresholdInDays = loadedObject.newUserMediaLockThresholdInDays;
            this.newUserBanEnabled = loadedObject.newUserBanEnabled;
            this.newUserBanThresholdInDays = loadedObject.newUserBanThresholdInDays;
            this.permittedUsers = new Set<string>(loadedObject.permittedUsers);
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        // Send an alert when if a new account under the threshold joins the server
        const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
        const durationSinceCreation = this.getDurationSinceUserCreation(member);
        const accountAgeInDays = Math.floor(durationSinceCreation.days);
        const accountAgeInHours = Math.floor(durationSinceCreation.hours);
        const accountAgeInMinutes = Math.floor(durationSinceCreation.minutes);
        const accountAgeInSeconds = Math.floor(durationSinceCreation.seconds);

        // If this is a new account, send an alert
        if (modAlertsChannel && accountAgeInDays <= this.newUserMediaThresholdInDays) {
            await modAlertsChannel.send(`⚠️ New discord account <@${member.user.id}> (Created ${accountAgeInDays} days, ${accountAgeInHours} hours, ${accountAgeInMinutes} minutes, ${accountAgeInSeconds} seconds ago) has joined the server.`);
        }

        // If the user is less than the new user ban threshold, ban them
        await this.handleBanNewUser(member, accountAgeInDays, accountAgeInHours, accountAgeInMinutes, accountAgeInSeconds);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        // Ignore auto moderation messages
        if (message.type === MessageType.AutoModerationAction) {
            return;
        }
        const member = message.member;

        // Ignore messages from non-members
        if (!member) {
            return;
        }

        // Get the duration since the user's account was created
        const durationSinceCreation = this.getDurationSinceUserCreation(member);
        const accountAgeInDays = Math.floor(durationSinceCreation.days);
        const accountAgeInHours = Math.floor(durationSinceCreation.hours);
        const accountAgeInMinutes = Math.floor(durationSinceCreation.minutes);
        const accountAgeInSeconds = Math.floor(durationSinceCreation.seconds);

        // If the user is less than the new user ban threshold, ban them
        await this.handleBanNewUser(member, accountAgeInDays, accountAgeInHours, accountAgeInMinutes, accountAgeInSeconds);

        // If the user is less than the new user threshold, check if they are attempting to post media
        await this.handleNewUserMediaLock(message);
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
        if (interaction.commandName === ComponentCommands.PERMIT_NEW_USER_RESTRICTIONS) {
            await this.permitNewUserMedia(interaction.options.getUser("user", true), interaction);
        } else if (interaction.commandName === ComponentCommands.TOGGLE_NEW_USER_MEDIA_LOCK) {
            this.newUserMediaLockEnabled = !this.newUserMediaLockEnabled;
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `New user media lock feature is now ${this.newUserMediaLockEnabled ? 'active' : 'disabled'}.` });
        } else if (interaction.commandName === ComponentCommands.TOGGLE_NEW_USER_BAN) {
            this.newUserBanEnabled = !this.newUserBanEnabled;
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `New user ban feature is now ${this.newUserBanEnabled ? 'active' : 'disabled'}.` });
        } else if (interaction.commandName === ComponentCommands.SET_NEW_USER_MEDIA_LOCK_THRESHOLD_IN_DAYS) {
            this.newUserMediaThresholdInDays = interaction.options.getInteger("days", true);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Set new user threshold in days to ${this.newUserMediaThresholdInDays}.` });
        } else if (interaction.commandName === ComponentCommands.SET_NEW_USER_BAN_THRESHOLD_IN_DAYS) {
            this.newUserBanThresholdInDays = interaction.options.getInteger("days", true);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Set new user ban threshold in days to ${this.newUserBanThresholdInDays}.` });
        }
    }

    async handleNewUserMediaLock(message: Message) {
        // Don't do anything if the feature is disabled
        if (!this.newUserMediaLockEnabled) {
            return;
        }
        const user = message.author;
        // Use luxon to compare the user's account creation date to the current date
        const creationDateDT = DateTime.fromJSDate(user.createdAt);
        const accountAgeInDays = Math.floor(creationDateDT.diffNow("days").negate().days);
        if (!this.permittedUsers.has(user.id) && accountAgeInDays <= this.newUserMediaThresholdInDays) {
            let attemptedMediaPost = false;
            // This is a new user so prevent them from sending any media attachments
            if (message.attachments.size > 0) {
                attemptedMediaPost = true;
            }
            // Check if the message contains any embeds
            if (message.embeds.length > 0) {
                attemptedMediaPost = true;
            }
            // Check if the message content has any links
            if (MEDIA_LINK_REGEX.test(message.content)) {
                attemptedMediaPost = true;
            }
            if (attemptedMediaPost) {
                const copy = message;
                // Delete the message
                try {
                    await message.delete();
                } catch (e) {
                    console.error("Error deleting message for new user lock: ", e);
                }
                // Alert the mod alerts channel of a new user attempting to post media
                const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
                if (modAlertsChannel) {
                    const msg1 = await modAlertsChannel.send(`⚠️ New discord account <@${user.id}> (${accountAgeInDays} days old) attempted to post the following media in <#${message.channel.id}>`);
                    // Relay the exact same message content to the mod alerts channel with all included attachments and embeds
                    await msg1.reply(getCensoredMessageReplyOptions(copy));
                }
                // Send a message to the user
                await message.channel.send(`Hello, <@${user.id}>! Your account is not permitted to post media due to being a new discord account.\nPlease request to post media by messaging staff through ModMail!`);
            }
            return;
        }
    }

    private async handleBanNewUser(member: GuildMember, accountAgeInDays: number, accountAgeInHours: number, accountAgeInMinutes: number, accountAgeInSeconds: number) {
        // Don't do anything if the feature is disabled
        if (!this.newUserBanEnabled) {
            return;
        }
        // If the user is less than the new user ban threshold, ban them
        if (!this.permittedUsers.has(member.id) && accountAgeInDays <= this.newUserBanThresholdInDays) {
            await this.banNewUser(member, accountAgeInDays, accountAgeInHours, accountAgeInMinutes, accountAgeInSeconds);
        }
    }

    private getDurationSinceUserCreation(member: GuildMember) {
        const creationDateDT = DateTime.fromJSDate(member.user.createdAt);
        const differenceDuration = creationDateDT.diffNow(["days", "hours", "minutes", "seconds"]).negate();
        return differenceDuration;
    }

    private async banNewUser(member: GuildMember, accountAgeInDays: number, accountAgeInHours: number, accountAgeInMinutes: number, accountAgeInSeconds: number) {
        const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
        try {
            // Get all administators members in the server
            const adminMembers = member.guild.members.cache.filter(member => member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot);
            // DM the user to let them know they were banned for being a new user and to contact staff if this was a mistake
            await member.user.send(`Hello, <@${member.user.id}>! Your account is not permitted to join this server due to being a brand new discord account.\nPlease contact admin staff if you would like to request an appeal: ${adminMembers.map(member => `${member.user.username}: ${member.toString()}`).join(", ")}`);
        } catch (e) {
            console.error("Error DMing new user: ", e);
        }
        try {
            await member.ban({ reason: `New discord account created ${accountAgeInDays} days, ${accountAgeInHours} hours, ${accountAgeInMinutes} minutes, ${accountAgeInSeconds} seconds ago.` });
            // Alert the mod alerts channel of a new user being banned
            if (modAlertsChannel) {
                await modAlertsChannel.send(`🚨 Banned new discord account <@${member.user.id}> (Created ${accountAgeInDays} days, ${accountAgeInHours} hours, ${accountAgeInMinutes} minutes, ${accountAgeInSeconds} seconds ago)`);
            }
        } catch (e) {
            console.error("Error banning new user: ", e);
            modAlertsChannel?.send(`⚠️ Error banning new user <@${member.user.id}>: ${e}`);
        }
    }

    async permitNewUserMedia(user: User, interaction: ChatInputCommandInteraction) {
        // Toggle the user's ID in the set
        if (this.permittedUsers.has(user.id)) {
            this.permittedUsers.delete(user.id);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Removed ${user.toString()} from the list of permitted users.` });
        } else {
            this.permittedUsers.add(user.id);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Added ${user.toString()} to the list of permitted users.` });
        }
    }

}
