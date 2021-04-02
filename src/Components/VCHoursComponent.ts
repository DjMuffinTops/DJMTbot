import {Component} from "../Component";
import {
    GuildMember,
    Message,
    MessageReaction,
    TextChannel,
    User,
    VoiceChannel,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {VoiceTextPairComponent, VoiceTextPair} from "./VoiceTextPairComponent";
import {isAdmin} from "../HelperFunctions";
import {Cron} from "../Cron";
import {ComponentCommands} from "../Constants/ComponentCommands";

// Declare data you want to save in JSON here
interface VCHoursComponentSave {}

export class VCHoursComponent extends Component<VCHoursComponentSave> {

    name: ComponentNames = ComponentNames.VC_HOURS;
    consecutiveHours: Map<VoiceTextPair, number> = new Map();

    async getSaveData(): Promise<VCHoursComponentSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: VCHoursComponentSave | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        const vcChannelPairs: VoiceTextPair[] = (this.djmtGuild.getComponent(ComponentNames.VOICE_TEXT_PAIR) as VoiceTextPairComponent).voiceTextPairs;
        for (const pair of vcChannelPairs) {
            this.consecutiveHours.set(pair, 0);
        }
        Cron.getInstance().schedule('0 0 0-23 * * *', async () => {
            await this.vcRemindersJob();
        });

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

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.SET_HOURS) {
            await this.setHoursCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async setHoursCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }
        if (args.length == 3) {
            let voiceId = args[0];
            let textId = args[1];
            let hours = Number(args[2]);
            const vcChannelPairs: VoiceTextPair[] = (this.djmtGuild.getComponent(ComponentNames.VOICE_TEXT_PAIR) as VoiceTextPairComponent).voiceTextPairs;
            for (const pair of vcChannelPairs) {
                if (pair.voiceChannel.id === voiceId && pair.textChannel.id === textId) {
                    this.consecutiveHours.set(pair, hours);
                    await message.channel.send(`${pair.toString()} set to ${this.consecutiveHours.get(pair)}`);
                    return;
                }
            }
            await message.channel.send(`Could not find the desired vc text pair. Please make sure its set.`);
        } else {
            await message.channel.send(`Can't set hours, needs two ids, voice and then text channel id`);
        }
    }

    async vcRemindersJob() {
        console.log(`[${this.djmtGuild.guildId}] Running VC Reminder Job`);
        const vcChannelPairs: VoiceTextPair[] = (this.djmtGuild.getComponent(ComponentNames.VOICE_TEXT_PAIR) as VoiceTextPairComponent).voiceTextPairs;
        // For each channel pair
        for (const pair of vcChannelPairs) {
            const voiceChannel = (this.djmtGuild.getGuildChannel(pair.voiceChannel.id) as VoiceChannel);
            const textChannel = (this.djmtGuild.getGuildChannel(pair.textChannel.id) as TextChannel);
            if (!voiceChannel || !textChannel) {
                console.error(`[VCRemindersJob] Could not find voice channel ${pair.voiceChannel.id} or text channel ${pair.textChannel.id}`)
                return;
            }
            // If someone is in the channel during the check and they are not a bot, add an hour
            if (voiceChannel.members.size > 0 && !voiceChannel.members.every(member => member.user.bot)) {
                const hoursSoFar = this.consecutiveHours.get(pair) ?? 0;
                const hoursMsg = `${hoursSoFar > 0 ? `(${hoursSoFar} consecutive hours)` : ''}`;
                const finalMsg = `Don't forget to save your work and stay hydrated! ${hoursMsg}`;
                await textChannel.send(finalMsg);
                console.log(`Sent to ${pair.toString()} :${finalMsg}`);
                this.consecutiveHours.set(pair, hoursSoFar + 1);
            } else {
                this.consecutiveHours.set(pair, 0);
            }
        }
    }
}
