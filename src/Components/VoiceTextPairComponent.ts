import {Component} from '../Component';
import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageFlags,
  MessageReaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  User,
  VoiceChannel,
  VoiceState,
} from 'discord.js';
import {ComponentNames} from '../Constants/ComponentNames';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {logger} from '../Logger';

const setVcPairCommand = new SlashCommandBuilder();
setVcPairCommand.setName(ComponentCommands.SET_VC_PAIRS);
setVcPairCommand.setDescription('Sets the voice and text channel pair');
setVcPairCommand.addChannelOption(input =>
  input
    .setName('voicechannel')
    .setDescription('The voice channel')
    .addChannelTypes(ChannelType.GuildVoice)
    .setRequired(true),
);
setVcPairCommand.addChannelOption(input =>
  input
    .setName('textchannel')
    .setDescription('The text channel')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setVcPairCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printVcPairCommand = new SlashCommandBuilder();
printVcPairCommand.setName(ComponentCommands.PRINT_VC_PAIRS);
printVcPairCommand.setDescription('Prints the voice and text channel pair');
printVcPairCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

// Declare data you want to save in JSON here (only IDs)
interface VoiceTextPairSave {
  voiceChannelId: string;
  textChannelId: string;
}

interface VoiceTextPairComponentSave {
  voiceTextPairs: VoiceTextPairSave[];
}

// Runtime interface with full objects
export interface VoiceTextPair {
  voiceChannel: VoiceChannel;
  textChannel: TextChannel;
}

// Legacy format for migration (old JSON files)
interface VoiceTextPairLegacy {
  voiceChannel: {id: string};
  textChannel: {id: string};
}

export class VoiceTextPairComponent extends Component<VoiceTextPairComponentSave> {
  name: ComponentNames = ComponentNames.VOICE_TEXT_PAIR;
  voiceTextPairs: VoiceTextPair[] = [];
  commands: SlashCommandBuilder[] = [setVcPairCommand, printVcPairCommand];

  getSaveData(): Promise<VoiceTextPairComponentSave> {
    // Convert full channel objects to just IDs for saving
    return Promise.resolve({
      voiceTextPairs: this.voiceTextPairs.map(pair => ({
        voiceChannelId: pair.voiceChannel.id,
        textChannelId: pair.textChannel.id,
      })),
    });
  }

  afterLoadJSON(
    loadedObject: VoiceTextPairComponentSave | undefined,
  ): Promise<void> {
    if (loadedObject && loadedObject.voiceTextPairs) {
      this.voiceTextPairs = [];

      if (!this.djmtGuild.guild) {
        logger.error(
          '[VoiceTextPair] Guild not available when loading voice-text pairs',
        );
        return Promise.resolve();
      }

      for (const pair of loadedObject.voiceTextPairs) {
        try {
          let voiceChannel: VoiceChannel;
          let textChannel: TextChannel;

          // Check if this is the new format (just IDs) or old format (full objects)
          if ('voiceChannelId' in pair && 'textChannelId' in pair) {
            // New format: IDs only
            const voiceCh = this.djmtGuild.guild.channels.cache.get(
              pair.voiceChannelId,
            );
            const textCh = this.djmtGuild.guild.channels.cache.get(
              pair.textChannelId,
            );

            if (
              !voiceCh ||
              voiceCh.type !== ChannelType.GuildVoice ||
              !textCh ||
              textCh.type !== ChannelType.GuildText
            ) {
              logger.error(
                `[VoiceTextPair] Failed to load voice-text pair: voice=${pair.voiceChannelId}, text=${pair.textChannelId}`,
              );
              continue;
            }

            voiceChannel = voiceCh as VoiceChannel;
            textChannel = textCh as TextChannel;
          } else {
            // Old format: full objects
            const legacyPair = pair as unknown as VoiceTextPairLegacy;
            const voiceCh = this.djmtGuild.guild.channels.cache.get(
              legacyPair.voiceChannel.id,
            );
            const textCh = this.djmtGuild.guild.channels.cache.get(
              legacyPair.textChannel.id,
            );

            if (
              !voiceCh ||
              voiceCh.type !== ChannelType.GuildVoice ||
              !textCh ||
              textCh.type !== ChannelType.GuildText
            ) {
              logger.error(
                `[VoiceTextPair] Failed to migrate voice-text pair: voice=${legacyPair.voiceChannel.id}, text=${legacyPair.textChannel.id}`,
              );
              continue;
            }

            voiceChannel = voiceCh as VoiceChannel;
            textChannel = textCh as TextChannel;

            logger.info(
              `[VoiceTextPair] Migrated voice-text pair from old format: ${voiceChannel.name} <-> ${textChannel.name}`,
            );
          }

          this.voiceTextPairs.push({voiceChannel, textChannel});
        } catch (error) {
          logger.error(
            `[VoiceTextPair] Error loading voice-text pair: ${error}`,
          );
        }
      }
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
          'voicechannel',
          true,
        ),
        interaction.options.getChannel<ChannelType.GuildText>(
          'textchannel',
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
    const pair: VoiceTextPair = {voiceChannel, textChannel};
    for (const pair of this.voiceTextPairs) {
      if (
        pair.voiceChannel.id === voiceChannel.id &&
        pair.textChannel.id === textChannel.id
      ) {
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
    let channelString = '';
    if (this.voiceTextPairs.length > 0) {
      this.voiceTextPairs.forEach((pair: VoiceTextPair) => {
        channelString += ` <#${pair.voiceChannel.id}> <#${pair.textChannel.id}>\n`;
      });
      await interaction.reply({
        content: `VC Channels: ${channelString}`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: 'No VC Channel Pairs have been set!',
        flags: MessageFlags.Ephemeral,
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
        content: `Added ${[voiceChannel.toString(), textChannel.toString()].join(' ')} to the VC Channels list!`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: `Removed ${[voiceChannel.toString(), textChannel.toString()].join(' ')} from VC Channels list!`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
