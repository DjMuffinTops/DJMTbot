
import {Channel, Client, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {Component} from "../Component";
import {Cron} from "../../types/Cron";
import {getConfig} from "../../commands/config";
import {isAdmin} from "../../commands/helper";
import {CommandStrings} from "../../commands/CommandStrings";

export class HelpCommand extends Component{

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.HELP) {
            await this.helpCmd(args, message);
        }
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

    async helpCmd(args: string[], message: Message) {
        const gConfig = await getConfig(message);
        let prefix = gConfig.prefix;
        let helpCommands =
            `#FUN
${prefix}cheems [text] -> Cheemsifies the given text.\n
${prefix}b [text] -> Applies b-speak to the given text.\n
${prefix}bruh -> Spits out a random message contained in marked bruh channels. Admins can mark channels to read from using the setbruh command.`;
        let helpAdminCommands =
            `#ADMIN ONLY
--------------------------------------------------------------------------------------
If the bot seems to not be responding, try using the resetconfig command (my bad ^^)
--------------------------------------------------------------------------------------
${prefix}prefix [text] -> Sets a new command prefix for this bot. Use this command without text to reset to the default: \`${process.env.DEFAULT_PREFIX}\`\n
${prefix}register -> Registers this server to have data saved that is required for certain commands.\n
${prefix}unregister -> Unregisters this server and deletes all register data saved.\n
${prefix}resetconfig -> Restores the guild's config settings to the bot's default config.\n
${prefix}dev -> When enabled, the bot will print out the states of the guild config, and guild registry.\n
${prefix}setstar [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be auto starred by the bot. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setautoreact [Emoji] [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be auto starred with the given emoji by the bot. Use command without mentioning channels to see the list of marked channels.\n`;
        let helpAdminCommands2 =
            `${prefix}setreactpairs [Emoji] [TextChannel Mention] [Threshold for ReactionBoard]-> {REGISTER REQUIRED} Marks/unmarks the mentioned channel to be act as a starboard for the given emoji after threshold reacts is reached on a msg. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setbruh [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be used by the bruh command. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setdotw [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel to get Day of the Week messages. Will send a message to the channel at 11:59 EST everyday (does not account for daylight savings). Use command without mentioning channels to see the list of marked channels.\n
${prefix}setvcpairs [VoiceChannelId] [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channels as a pair. Will send occasional reminder messages to the vc text channel. Use command without mentioning channels to see the list of marked channel pairs.\n
${prefix}sethours [VoiceChannelId] [TextChannelId] -> {REGISTER REQUIRED} Manually sets the hour count for a given vc text channel pair.\n\n`;

        if (isAdmin(message)) {
            await message.channel.send(`\`\`\`css\n${helpAdminCommands}\`\`\``);
            await message.channel.send(`\`\`\`css\n${helpAdminCommands2}\`\`\``);
        }
        await message.channel.send(`\`\`\`css\n${helpCommands}\`\`\``);
    }
}
