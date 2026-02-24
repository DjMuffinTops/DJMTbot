import { Component } from "../Component";
import { logger } from "../Logger";
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
  VoiceState,
} from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import { MEDIA_LINK_REGEX } from "../HelperFunctions";
import { ComponentCommands } from "../Constants/ComponentCommands";

const setMediaChannelCommand = new SlashCommandBuilder();
setMediaChannelCommand.setName(ComponentCommands.SET_MEDIA_CHANNEL);
setMediaChannelCommand.setDescription("Sets the media channel");
setMediaChannelCommand.addChannelOption((input) =>
  input
    .setName("channel")
    .setDescription("The channel to add or remove from the media channels list")
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(true),
);
setMediaChannelCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

const getMediaChannelCommand = new SlashCommandBuilder();
getMediaChannelCommand.setName(ComponentCommands.PRINT_MEDIA_CHANNEL);
getMediaChannelCommand.setDescription("Gets the media channel");
getMediaChannelCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

/**
 * Declare data you want to save in JSON here. This interface is used for getSaveData and
 * afterLoadJSON, as it tells Typescript what data you're expecting to write and load.
 */
interface MediaComponentSave {
  channels: string[];
}

/**
 * A component to declare media only channels and remove any messages without attachments in said channels.
 */
export class MediaChannelComponent extends Component<MediaComponentSave> {
  // MANDATORY: Define a name in ComponentNames.ts and place it here.
  name: ComponentNames = ComponentNames.MEDIA_CHANNEL;
  channelsArray: TextChannel[] = [];
  commands: SlashCommandBuilder[] = [
    setMediaChannelCommand,
    getMediaChannelCommand,
  ];
  // may move to constants in future if needed?

  getSaveData(): Promise<MediaComponentSave> {
    return Promise.resolve({ channels: this.channelsArray.map((c) => c.id) });
  }

  afterLoadJSON(
    _loadedObject: MediaComponentSave | undefined,
  ): Promise<void> {
    if (_loadedObject) {
      for (const c of _loadedObject.channels) {
        const channel = this.djmtGuild.getGuildChannel(c) as TextChannel;
        if (!channel) {
          logger.error("MediaChannelCheck: could not load channel", { channelId: c });
          continue;
        }
        this.channelsArray.push(channel);
      }
    }
    return Promise.resolve();
  }

  onReady(): Promise<void> {
    return Promise.resolve();
  }

  onGuildMemberAdd(_member: GuildMember): Promise<void> {
    return Promise.resolve();
  }

  async onMessageCreate(args: string[], message: Message): Promise<void> {
    await this.checkMedia(message);
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

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === ComponentCommands.SET_MEDIA_CHANNEL) {
      await this.setMediaChannel(
        interaction.options.getChannel<ChannelType.GuildText>("channel", true),
        interaction,
      );
    } else if (
      interaction.commandName === ComponentCommands.PRINT_MEDIA_CHANNEL
    ) {
      await this.getMediaChannel(interaction);
    }
  }

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  onVoiceStateUpdate(
    _oldState: VoiceState,
    _newState: VoiceState,
  ): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Toggles certain channels as "media channels", where any non-media messages will be deleted.
   * @param args A list of channels to toggle.
   * @param interaction The message object of the command message.
   * @private
   */
  private async setMediaChannel(
    channel: TextChannel,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (!channel) {
      await interaction.reply({
        content: `Invalid channel provided: ${String(channel)}`,
        ephemeral: true,
      });
    }
    const chid = channel.id;
    // find channel in the list of media channels, if it exists
    let exists = false;
    this.channelsArray.forEach((item, index) => {
      if (item.id === chid) {
        exists = true;
        this.channelsArray.splice(index, 1);
      }
    });
    if (exists) {
      await interaction.reply({
        content: `Removed ${channel.toString()} as a media channel.`,
        ephemeral: true,
      });
    } else {
      this.channelsArray.push(channel);
      await interaction.reply({
        content: `Successfully added ${channel.toString()} as a media channel.`,
        ephemeral: true,
      });
    }
    await this.djmtGuild.saveJSON();
  }

  /**
   * Returns a list of media channels.
   * @param interaction The message object of the command message.
   * @private
   */
  private async getMediaChannel(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (this.channelsArray.length === 0) {
      await interaction.reply({
        content: `There are no set media channels.`,
        ephemeral: true,
      });
      return;
    }
    let m = "The current set media channels are:\n";
    for (const c of this.channelsArray) {
      m += `<#${c.id}>\n`;
    }
    await interaction.reply({ content: m, ephemeral: true });
  }

  /**
   * Checks and deletes a message if it's in a media channel and doesn't have media.
   * @param message The message to be checked.
   * @private
   */
  private async checkMedia(message: Message): Promise<void> {
    if (this.channelsArray.indexOf(<TextChannel>message.channel) > -1) {
      // delete all messages without attachments or links
      if (
        message.attachments.size === 0 &&
        !MEDIA_LINK_REGEX.test(message.content)
      ) {
        const msg = `${message.author.toString()}, your message has been deleted because it does not have media.`;
        try {
          await message.delete();
        } catch (e) {
          logger.error("Error deleting message for media channel check", {
            guildId: this.djmtGuild.guildId,
            messageId: message.id,
            error: e
          });
        }
        if (message.channel.isSendable()) {
          const warningMsg: Message = await message.channel.send(msg);
          // Delete the warning message after some time
          setTimeout(() => {
            void warningMsg.delete();
          }, 15000);
        }
      }
    }
  }
}
