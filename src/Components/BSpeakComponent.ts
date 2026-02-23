import { Component } from "../Component";
import {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  SlashCommandBuilder,
  User,
  VoiceState,
} from "discord.js";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { ComponentNames } from "../Constants/ComponentNames";

const bSpeakCommand = new SlashCommandBuilder();
bSpeakCommand.setName(ComponentCommands.B_SPEAK);
bSpeakCommand.setDescription("Converts the user's message to bspeak");
bSpeakCommand.addStringOption((input) =>
  input
    .setName("message")
    .setDescription("The message to convert to bspeak")
    .setRequired(true),
);

type BSpeakComponentSave = Record<string, unknown>;
export class BSpeakComponent extends Component<BSpeakComponentSave> {
  name: ComponentNames = ComponentNames.BSPEAK;
  commands: SlashCommandBuilder[] = [bSpeakCommand];

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  getSaveData(): Promise<BSpeakComponentSave> {
    return Promise.resolve({} as BSpeakComponentSave);
  }

  afterLoadJSON(
    _loadedObject: BSpeakComponentSave | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }

  onReady(): Promise<void> {
    return Promise.resolve();
  }

  onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve();
  }

  onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve();
  }

  onMessageReactionAdd(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  onMessageReactionRemove(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve();
  }

  onMessageUpdate(
    _oldMessage: Message,
    _newMessage: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve();
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === String(ComponentCommands.B_SPEAK)) {
      await this.bCmd(
        interaction.options.getString("message", true),
        interaction,
      );
    }
  }

  async bCmd(message: string, interaction: ChatInputCommandInteraction) {
    const bChars = ["a", "e", "i", "o", "u", "r"];
    let result = "";
    const B_OPTIONS = ["b", "🅱️"];
    const B_EMOJI_CHANCE = 0.05;
    const words = message.split(" ");
    for (const word of words) {
      let previous = "";
      for (let j = 0; j < word.length; j++) {
        if (word.charAt(j).match(/^[a-zA-Z]+$/)) {
          const bChoice = B_OPTIONS[Math.random() < B_EMOJI_CHANCE ? 1 : 0];
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
    await interaction.reply({
      content:
        result.length > 0
          ? result
          : "Given message was empty, try typing something this time.",
    });
  }
}
