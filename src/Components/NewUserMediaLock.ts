import { Component } from "../Component";
import { ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, MessageType, PermissionFlagsBits, SlashCommandBuilder, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { DateTime } from "luxon";
import { MEDIA_LINK_REGEX } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const NEW_USER_THRESHOLD_IN_DAYS_DEFAULT = 60;

const toggleNewUserMediaLockCommand = new SlashCommandBuilder();
toggleNewUserMediaLockCommand.setName(ComponentCommands.TOGGLE_NEW_USER_MEDIA_LOCK);
toggleNewUserMediaLockCommand.setDescription("Toggles the new user media lock feature.");
toggleNewUserMediaLockCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const setNewUserThresholdInDaysCommand = new SlashCommandBuilder();
setNewUserThresholdInDaysCommand.setName(ComponentCommands.SET_NEW_USER_THRESHOLD_IN_DAYS);
setNewUserThresholdInDaysCommand.setDescription("Sets the number of days a user must have been registered to not be considered new.");
setNewUserThresholdInDaysCommand.addIntegerOption(option => option.setName("days").setDescription("The number of days a user must have been registered to not be considered new.").setRequired(true));
setNewUserThresholdInDaysCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const permitNewUserMediaCommand = new SlashCommandBuilder();
permitNewUserMediaCommand.setName(ComponentCommands.PERMIT_NEW_USER_MEDIA);
permitNewUserMediaCommand.setDescription("Permits a user to post media despite being a new user. Will be reapplied if the bot is restarted.");
permitNewUserMediaCommand.addUserOption(option => option.setName("user").setDescription("The user to bypass new user media lock for").setRequired(true));
permitNewUserMediaCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface NewUserMediaLockSave {
    enabled: boolean;
    newUserThresholdInDays: number; // Accounts must be older than this in days to not be considered new
    permittedUsers: string[];
}
export class NewUserMediaLock extends Component<NewUserMediaLockSave> {

    name: ComponentNames = ComponentNames.NEW_USER_MEDIA_LOCK;
    permittedUsers: Set<string> = new Set<string>();
    commands: SlashCommandBuilder[] = [permitNewUserMediaCommand, toggleNewUserMediaLockCommand, setNewUserThresholdInDaysCommand];
    newUserThresholdInDays: number = NEW_USER_THRESHOLD_IN_DAYS_DEFAULT;
    enabled: boolean = false;

    async getSaveData(): Promise<NewUserMediaLockSave> {
        return {
            enabled: this.enabled,
            newUserThresholdInDays: this.newUserThresholdInDays,
            permittedUsers: Array.from(this.permittedUsers)
        };
    }

    async afterLoadJSON(loadedObject: NewUserMediaLockSave | undefined): Promise<void> {
        if (loadedObject) {
            this.enabled = loadedObject.enabled;
            this.newUserThresholdInDays = loadedObject.newUserThresholdInDays;
            this.permittedUsers = new Set<string>(loadedObject.permittedUsers);
        }
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        // Send an alert when if a new account under the threshold joins the server
        const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
        if (modAlertsChannel) {
            const creationDateDT = DateTime.fromJSDate(member.user.createdAt);
            const accountAgeInDays = Math.floor(creationDateDT.diffNow("days").negate().days);
            if (accountAgeInDays <= this.newUserThresholdInDays) {
                await modAlertsChannel.send(`⚠️ New discord account <@${member.user.id}> (${accountAgeInDays} days old) joined the server.`);
            }
        }
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        // Ignore auto moderation messages
        if (message.type === MessageType.AutoModerationAction) {
            return;
        }
        this.handleNewUserMediaLock(message);
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
        if (interaction.commandName === ComponentCommands.PERMIT_NEW_USER_MEDIA) {
            await this.permitNewUserMedia(interaction.options.getUser("user", true), interaction);
        } else if (interaction.commandName === ComponentCommands.TOGGLE_NEW_USER_MEDIA_LOCK) {
            this.enabled = !this.enabled;
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `New user media lock feature is now ${this.enabled ? 'active' : 'disabled'}.` });
        } else if (interaction.commandName === ComponentCommands.SET_NEW_USER_THRESHOLD_IN_DAYS) {
            this.newUserThresholdInDays = interaction.options.getInteger("days", true);
            await this.djmtGuild.saveJSON();
            await interaction.reply({ content: `Set new user threshold in days to ${this.newUserThresholdInDays}.` });
        }
    }

    async handleNewUserMediaLock(message: Message) {
        // Don't do anything if the feature is disabled
        if (!this.enabled) {
            return;
        }
        const user = message.author;
        // Use luxon to compare the user's account creation date to the current date
        const creationDateDT = DateTime.fromJSDate(user.createdAt);
        const accountAgeInDays = Math.floor(creationDateDT.diffNow("days").negate().days);
        if (!this.permittedUsers.has(user.id) && accountAgeInDays > this.newUserThresholdInDays) {
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
                    await msg1.reply({
                        content: message.content.length > 0 ? `||${message.content}||` : undefined,
                        files: message.attachments.map(attachment => {
                            return {
                                attachment: attachment.url,
                                name : `SPOILER_${attachment.name}`
                            }
                        }),
                        embeds: message.embeds
                    });
                }
                // Send a message to the user
                await message.channel.send(`Hello, <@${user.id}>! Your account is not permitted to post media due to being a new discord account.\nPlease request to post media by messaging staff through ModMail!`);
            }
            return;
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
