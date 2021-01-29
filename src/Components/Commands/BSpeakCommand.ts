import {Component} from "../Component";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {CommandStrings} from "../../commands/CommandStrings";
import {Cron} from "../../types/Cron";
import {ComponentNames} from "../ComponentNames";

export interface IBSpeakCommand {}
export class BSpeakCommand extends Component<IBSpeakCommand> {

    name: ComponentNames = ComponentNames.BSPEAK;

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.B_SPEAK) {
            await this.bCmd(args, message);
        }
    }

    async onLoadJSON(register: IBSpeakCommand): Promise<void> {
        return Promise.resolve(undefined);
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

    async bCmd(args: string[], message: Message) {
        const bChars = ['a', 'e', 'i', 'o', 'u', 'r'];
        let result = "";
        let B_OPTIONS = ['b', '🅱️'];
        let B_EMOJI_CHANCE = .05;
        for (let i = 0; i < args.length; i++) {
            let word = args[i];
            let previous = "";
            for (let j = 0; j < word.length; j++) {
                if (word.charAt(j).match(/^[a-zA-Z]+$/)) {
                    let bChoice = B_OPTIONS[Math.random() < B_EMOJI_CHANCE ? 1 : 0];
                    if (bChars.includes(word.charAt(j).toLowerCase())) {
                        result += `${previous}${bChoice}${word} `;
                    } else {
                        result += `${previous}${bChoice}${word.substring(j + 1)} `;
                    }
                    break;
                } else {
                    previous += word.charAt(j);
                }
            }
        }
        await message.channel.send(result.length > 0 ? result : "Given message was empty, try typing something this time.");
    }

}
