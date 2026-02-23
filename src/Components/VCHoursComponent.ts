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
import {
  VoiceTextPairComponent,
  VoiceTextPair,
} from "./VoiceTextPairComponent";
import { Cron } from "../Cron";
import { ComponentCommands } from "../Constants/ComponentCommands";

const setHoursCommand = new SlashCommandBuilder();
setHoursCommand.setName(ComponentCommands.SET_HOURS);
setHoursCommand.setDescription("Sets the hours for a vc text pair");
setHoursCommand.addChannelOption((input) =>
  input
    .setName("voicechannel")
    .setDescription("The voice channel")
    .addChannelTypes(ChannelType.GuildVoice)
    .setRequired(true),
);
setHoursCommand.addChannelOption((input) =>
  input
    .setName("textchannel")
    .setDescription("The text channel")
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setHoursCommand.addIntegerOption((input) =>
  input.setName("hours").setDescription("The hours to set").setRequired(true),
);
setHoursCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Declare data you want to save in JSON here
type VCHoursComponentSave = Record<string, unknown>;

export class VCHoursComponent extends Component<VCHoursComponentSave> {
  name: ComponentNames = ComponentNames.VC_HOURS;
  consecutiveHours: Map<VoiceTextPair, number> = new Map();
  commands: SlashCommandBuilder[] = [setHoursCommand];

  getSaveData(): Promise<VCHoursComponentSave> {
    return Promise.resolve({});
  }

  afterLoadJSON(
    _loadedObject: VCHoursComponentSave | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }

  async onReady(): Promise<void> {
    const vcChannelPairs: VoiceTextPair[] = (
      this.djmtGuild.getComponent(
        ComponentNames.VOICE_TEXT_PAIR,
      ) as VoiceTextPairComponent
    ).voiceTextPairs;
    for (const pair of vcChannelPairs) {
      this.consecutiveHours.set(pair, 0);
    }
    Cron.getInstance().schedule("0 0 0-23 * * *", () => {
      void this.vcRemindersJob();
    });

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
    if (interaction.commandName === String(ComponentCommands.SET_HOURS)) {
      await this.setHoursCmd(
        interaction.options.getChannel("voicechannel", true),
        interaction.options.getChannel("textchannel", true),
        interaction.options.getInteger("hours", true),
        interaction,
      );
    }
    return Promise.resolve(undefined);
  }

  async setHoursCmd(
    voiceChannel: VoiceChannel,
    textChannel: TextChannel,
    hours: number,
    interaction: ChatInputCommandInteraction,
  ) {
    const voiceId = voiceChannel.id;
    const textId = textChannel.id;
    const vcChannelPairs: VoiceTextPair[] = (
      this.djmtGuild.getComponent(
        ComponentNames.VOICE_TEXT_PAIR,
      ) as VoiceTextPairComponent
    ).voiceTextPairs;
    for (const pair of vcChannelPairs) {
      if (pair.voiceChannel.id === voiceId && pair.textChannel.id === textId) {
        this.consecutiveHours.set(pair, hours);
        await interaction.reply({
          content: `${pair.textChannel.name} <=> ${
            pair.voiceChannel.name
          } set to ${this.consecutiveHours.get(pair)}`,
          ephemeral: true,
        });
        return;
      }
    }
    await interaction.reply({
      content: `Could not find the desired vc text pair. Please make sure its set.`,
      ephemeral: true,
    });
  }

  async vcRemindersJob() {
    console.log(`[${this.djmtGuild.guildId}] Running VC Reminder Job`);
    const vcChannelPairs: VoiceTextPair[] = (
      this.djmtGuild.getComponent(
        ComponentNames.VOICE_TEXT_PAIR,
      ) as VoiceTextPairComponent
    ).voiceTextPairs;
    // For each channel pair
    for (const pair of vcChannelPairs) {
      const voiceChannel = this.djmtGuild.getGuildChannel(
        pair.voiceChannel.id,
      ) as VoiceChannel;
      const textChannel = this.djmtGuild.getGuildChannel(
        pair.textChannel.id,
      ) as TextChannel;
      if (!voiceChannel || !textChannel) {
        console.error(
          `[VCRemindersJob] Could not find voice channel ${pair.voiceChannel.id} or text channel ${pair.textChannel.id}`,
        );
        return;
      }
      // If someone is in the channel during the check and they are not a bot, add an hour
      if (
        voiceChannel.members.size > 0 &&
        !voiceChannel.members.every((member) => member.user.bot)
      ) {
        const hoursSoFar = this.consecutiveHours.get(pair) ?? 0;
        const hoursMsg = `${
          hoursSoFar > 0 ? `(${hoursSoFar} consecutive hours)` : ""
        }`;
        const finalMsg = `Don't forget to save your work and stay hydrated! ${hoursMsg}`;
        await textChannel.send(finalMsg);
        console.log(`Sent to ${textChannel.name} :${finalMsg}`);
        this.consecutiveHours.set(pair, hoursSoFar + 1);
      } else {
        this.consecutiveHours.set(pair, 0);
      }
    }
  }
}
