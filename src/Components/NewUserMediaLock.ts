import { Component } from "../Component";
import { ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { DateTime } from "luxon";
import { MEDIA_LINK_REGEX } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const NEW_USER_THRESHOLD_IN_DAYS = 60; // Accounts must be older than this in days to not be considered new
const permitNewUserMediaCommand = new SlashCommandBuilder();
permitNewUserMediaCommand.setName(ComponentCommands.PERMIT_NEW_USER_MEDIA);
permitNewUserMediaCommand.setDescription("Permits a user to post media despite being a new user. Will be reapplied if the bot is restarted.");
permitNewUserMediaCommand.addUserOption(option => option.setName("user").setDescription("The user to bypass new user media lock for").setRequired(true));
permitNewUserMediaCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

interface NewUserMediaLockSave { }
export class NewUserMediaLock extends Component<NewUserMediaLockSave> {

    name: ComponentNames = ComponentNames.NEW_USER_MEDIA_LOCK;
    permittedUsers: Set<string> = new Set<string>();
    commands: SlashCommandBuilder[] = [permitNewUserMediaCommand];

    async getSaveData(): Promise<NewUserMediaLockSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: NewUserMediaLockSave | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        const user = message.author;
        // Use luxon to compare the user's account creation date to the current date
        const creationDateDT = DateTime.fromJSDate(user.createdAt);
        const accountAgeInDays = Math.floor(creationDateDT.diffNow("days").negate().days);
        if (!this.permittedUsers.has(user.id) && accountAgeInDays < NEW_USER_THRESHOLD_IN_DAYS) {
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
                await message.delete();
                // Alert the mod alerts channel of a new user attempting to post media
                const modAlertsChannel = this.djmtGuild.getModAlertsChannel();
                if (modAlertsChannel) {
                    const msg1 = await modAlertsChannel.send(`⚠️ New discord account <@${user.id}> (${accountAgeInDays} days old) attempted to post the following media in <#${message.channel.id}>`);
                    // Relay the exact same message content to the mod alerts channel with all included attachments and embeds
                    await msg1.reply({
                        content: message.content,
                        files: message.attachments.map(attachment => attachment.url),
                        embeds: message.embeds
                    });
                }
                // Send a message to the user
                await message.channel.send(`Hello, <@${user.id}>! Your account is not permitted to post media due to being a new discord account.\nPlease request to post media by messaging staff through ModMail!`);
            }
            return;
        }
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
        }
    }

    async permitNewUserMedia(user: User, interaction: ChatInputCommandInteraction) {
        // Toggle the user's ID in the set
        if (this.permittedUsers.has(user.id)) {
            this.permittedUsers.delete(user.id);
            await interaction.reply({ content: `Removed ${user.toString()} from the list of permitted users.` });
        } else {
            this.permittedUsers.add(user.id);
            await interaction.reply({ content: `Added ${user.toString()} to the list of permitted users.` });
        }
    }

}
