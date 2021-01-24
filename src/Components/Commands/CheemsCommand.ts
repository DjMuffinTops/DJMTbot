import {Component} from "../Component";
import {CommandStrings} from "../../commands/CommandStrings";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {Cron} from "../../types/Cron";

export class CheemsCommand extends Component {

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.CHEEMS) {
            await this.cheemsCmd(args, message);
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

    insert(str: string, index: number, insert: string) {
        if (index >= 0) {
            return str.substring(0, index + 1) + insert + str.substring(index + 1, str.length);
        } else {
            return str;
        }
    }

    async cheemsCmd(args: string[], message: Message) {
        const cheemsChars = ['a', 'e', 'i', 'o', 'u', 'r'];
        const CHEEMS_M = 'm';
        const ADDTIONAL_CHANCE = .15;
        const minimumRequired = 1; // The minimum amount of m's to add
        let result = "";
        let indices: number[] = [];
        let index = 0;

        // Find all indices where a vowel exists
        args.forEach((word) => {
            for (let i = 0; i < word.length; i++) {
                const character = word.charAt(i);
                let characterLower = character.toLowerCase(); // output text will be lowercase
                result += characterLower;
                // if we find a vowel, save the current index in our indices array
                if (cheemsChars.includes(characterLower) && // is a cheems char
                    i + 1 < word.length && // is not the end
                    !cheemsChars.includes(word.charAt(i + 1)) && // next letter is not a cheems char
                    word.charAt(i + 1) !== CHEEMS_M) { // next letter is not 'm'
                    indices.push(index);
                }
                index++;
            }
            result += ' ';
            index++;
        });

        // Add the minimum required m's to our result string
        for (let charAdditions = 0; charAdditions < minimumRequired; charAdditions++) {
            if (indices.length > 0) {
                const chosenIndex = Math.round(Math.random() * indices.length); // choose an index from our indices array at random
                const requiredIndex = indices[chosenIndex];
                // We need to increment the indices of all cheemsChars after the chosen one since we're adding an m to the string
                for (let i = chosenIndex + 1; i < indices.length; i++) {
                    indices[i]++;
                }
                // Insert an m, and remove the index for our list of indices
                result = this.insert(result, requiredIndex, CHEEMS_M);
                indices.splice(chosenIndex, 1)
            }
        }


        // For the rest of the remaining indices, use random chance to potentially add an m
        let randomsAdded = 0;
        indices.forEach((index, loopIndex) => {
            if (Math.random() < ADDTIONAL_CHANCE) {
                result = this.insert(result, index + randomsAdded, CHEEMS_M);
                indices.splice(loopIndex, 1);
                randomsAdded++;
            }
        });
        // And we get the bot to say the thing:
        await message.channel.send(result.length > 0 ? result : "Given message was empty, try typing something this time.");
    }
}
