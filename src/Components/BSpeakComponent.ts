import { Component } from "../Component";
import { ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, SlashCommandBuilder, User, VoiceState } from "discord.js";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { ComponentNames } from "../Constants/ComponentNames";

const bSpeakCommand = new SlashCommandBuilder();
bSpeakCommand.setName(ComponentCommands.B_SPEAK);
bSpeakCommand.setDescription("Converts the user's message to bspeak");
bSpeakCommand.addStringOption(input => input.setName("message").setDescription("The message to convert to bspeak").setRequired(true));


interface BSpeakComponentSave { }
export class BSpeakComponent extends Component<BSpeakComponentSave> {

    name: ComponentNames = ComponentNames.BSPEAK;
    commands: SlashCommandBuilder[] = [bSpeakCommand];

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async getSaveData(): Promise<BSpeakComponentSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: BSpeakComponentSave | undefined): Promise<void> {
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

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.B_SPEAK) {
            await this.bCmd(interaction.options.getString("message", true), interaction);
        }
    }

    async bCmd(message: string, interaction: ChatInputCommandInteraction) {
        const bChars = ['a', 'e', 'i', 'o', 'u', 'r'];
        let result = "";
        let B_OPTIONS = ['b', '🅱️'];
        let B_EMOJI_CHANCE = .05;
        const words = message.split(" ");
        for (const word of words) {
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
        await interaction.reply({ content: result.length > 0 ? result : "Given message was empty, try typing something this time." });
    }

}
