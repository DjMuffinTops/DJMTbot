import { Component } from "../Component";
import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  User,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { ComponentCommands } from "../Constants/ComponentCommands";

const setVcPairCommand = new SlashCommandBuilder();
setVcPairCommand.setName(ComponentCommands.SET_VC_PAIRS);
setVcPairCommand.setDescription("Sets the voice and text channel pair");
setVcPairCommand.addChannelOption((input) =>
  input
    .setName("voicechannel")
    .setDescription("The voice channel")
    .addChannelTypes(ChannelType.GuildVoice)
    .setRequired(true),
);
setVcPairCommand.addChannelOption((input) =>
  input
    .setName("textchannel")
    .setDescription("The text channel")
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setVcPairCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printVcPairCommand = new SlashCommandBuilder();
printVcPairCommand.setName(ComponentCommands.PRINT_VC_PAIRS);
printVcPairCommand.setDescription("Prints the voice and text channel pair");
printVcPairCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

// Declare data you want to save in JSON here
interface VoiceTextPairComponentSave {
  voiceTextPairs: VoiceTextPair[];
}

export interface VoiceTextPair {
  voiceChannel: VoiceChannel;
  textChannel: TextChannel;
}

export class VoiceTextPairComponent extends Component<VoiceTextPairComponentSave> {
  name: ComponentNames = ComponentNames.VOICE_TEXT_PAIR;
  voiceTextPairs: VoiceTextPair[] = [];
  commands: SlashCommandBuilder[] = [setVcPairCommand, printVcPairCommand];

  getSaveData(): Promise<VoiceTextPairComponentSave> {
    return Promise.resolve({
      voiceTextPairs: this.voiceTextPairs,
    });
  }

  afterLoadJSON(
    loadedObject: VoiceTextPairComponentSave | undefined,
  ): Promise<void> {
    if (loadedObject) {
      this.voiceTextPairs = loadedObject.voiceTextPairs;
    }
    return Promise.resolve();
  }

  async onReady(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageCreate(_args: string[], _message: Message): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageReactionAdd(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageReactionRemove(
    _messageReaction: MessageReaction,
    _user: User,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageUpdate(
    _oldMessage: Message,
    _newMessage: Message,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === ComponentCommands.SET_VC_PAIRS) {
      await this.handleVoiceTextPair(
        interaction.options.getChannel<ChannelType.GuildVoice>(
          "voicechannel",
          true,
        ),
        interaction.options.getChannel<ChannelType.GuildText>(
          "textchannel",
          true,
        ),
        interaction,
      );
    } else if (interaction.commandName === ComponentCommands.PRINT_VC_PAIRS) {
      await this.printVoiceTextPairs(interaction);
    }
  }

  async setVoiceTextPair(
    voiceChannel: VoiceChannel,
    textChannel: TextChannel,
  ): Promise<boolean> {
    const pair: VoiceTextPair = { voiceChannel, textChannel };
    for (const pair of this.voiceTextPairs) {
      if (pair.voiceChannel.id === voiceChannel.id && pair.textChannel.id === textChannel.id) {
        this.voiceTextPairs.splice(this.voiceTextPairs.indexOf(pair), 1);
        await this.djmtGuild.saveJSON();
        return false;
      }
    }
    this.voiceTextPairs.push(pair);
    await this.djmtGuild.saveJSON();
    return true;
  }

  async printVoiceTextPairs(interaction: ChatInputCommandInteraction) {
    let channelString = "";
    if (this.voiceTextPairs.length > 0) {
      this.voiceTextPairs.forEach((pair: VoiceTextPair) => {
        channelString += ` <#${pair.voiceChannel.id}> <#${pair.textChannel.id}>\n`;
      });
      await interaction.reply({
        content: `VC Channels: ${channelString}`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `No VC Channel Pairs have been set!`,
        ephemeral: true,
      });
    }
  }
  async handleVoiceTextPair(
    voiceChannel: VoiceChannel,
    textChannel: TextChannel,
    interaction: ChatInputCommandInteraction,
  ) {
    const success = await this.setVoiceTextPair(voiceChannel, textChannel);
    if (success) {
      await interaction.reply({
        content: `Added ${[voiceChannel.toString(), textChannel.toString()].join(" ")} to the VC Channels list!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `Removed ${[voiceChannel.toString(), textChannel.toString()].join(" ")} from VC Channels list!`,
        ephemeral: true,
      });
    }
  }
}
