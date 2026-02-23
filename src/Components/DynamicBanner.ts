import {Component} from '../Component';
import {logger} from '../Logger';
import {
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReaction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  User,
  VoiceState,
} from 'discord.js';
import {ComponentNames} from '../Constants/ComponentNames';
import probe, {ProbeResult} from 'probe-image-size';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {Cron} from '../Cron';

const setBannerCommand = new SlashCommandBuilder();
setBannerCommand.setName(ComponentCommands.SET_BANNER);
setBannerCommand.setDescription('Adds a banner to the banner queue');
setBannerCommand.addStringOption(input =>
  input
    .setName('imageurl')
    .setDescription('The image url of the banner')
    .setRequired(true),
);
setBannerCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const rotateBannerCommand = new SlashCommandBuilder();
rotateBannerCommand.setName(ComponentCommands.ROTATE_BANNER);
rotateBannerCommand.setDescription('Rotate to the next banner in the queue');
rotateBannerCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

const printBannerCommand = new SlashCommandBuilder();
printBannerCommand.setName(ComponentCommands.PRINT_BANNER);
printBannerCommand.setDescription('Prints the banner queue');
printBannerCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

interface DynamicBannerSave {
  imageUrls: string[];
}

/**
 * Dynamically changes the server banner. Iterates over a queue of image urls. When the server
 * banner changes, the last banner url is moved to the end of the queue. The banner changes endlessly
 * over each set number of hours.
 */
export class DynamicBanner extends Component<DynamicBannerSave> {
  name: ComponentNames = ComponentNames.DYNAMIC_BANNER;
  imageUrls: string[] = [];
  hourInterval: number = 4; // Banner will change after this many hours
  commands: SlashCommandBuilder[] = [
    setBannerCommand,
    rotateBannerCommand,
    printBannerCommand,
  ];

  getSaveData(): Promise<DynamicBannerSave> {
    return Promise.resolve({imageUrls: this.imageUrls});
  }

  afterLoadJSON(_loadedObject: DynamicBannerSave | undefined): Promise<void> {
    if (_loadedObject) {
      this.imageUrls = _loadedObject.imageUrls;
    }
    return Promise.resolve();
  }

  onReady(): Promise<void> {
    // Every X hours, change the banner
    Cron.getInstance().schedule(`0 0 */${this.hourInterval} * * *`, () => {
      logger.info('Running Dynamic Banner job', {
        guildId: this.djmtGuild.guildId,
      });
      void this.rotateServerBanner();
    });
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

  onMessageUpdate(_oldMessage: Message, _newMessage: Message): Promise<void> {
    return Promise.resolve();
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

  async onInteractionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    if (interaction.commandName === ComponentCommands.PRINT_BANNER) {
      await this.printBannerQueue(interaction);
    } else if (interaction.commandName === ComponentCommands.SET_BANNER) {
      await this.addOrRemoveImageUrl(
        interaction.options.getString('imageurl', true),
        interaction,
      );
    } else if (interaction.commandName === ComponentCommands.ROTATE_BANNER) {
      await this.rotateServerBanner(interaction);
    }
  }

  /**
   * Changes the server banner to the next image in the image url list
   * @param interaction The message object this command was called by
   */
  async rotateServerBanner(interaction?: ChatInputCommandInteraction) {
    if (this.imageUrls.length <= 0) {
      logger.info('No Dynamic Banner images in queue', {
        guildId: this.djmtGuild.guildId,
      });
      if (interaction) {
        await interaction.reply({
          content: 'No Dynamic Banner images in queue to rotate to.',
          ephemeral: true,
        });
      }
    } else {
      const nextUrl = this.imageUrls.shift();
      if (nextUrl) {
        try {
          await this.djmtGuild.guild?.setBanner(
            nextUrl,
            'DJMTbot Dynamic Banner Change',
          );
          this.imageUrls.push(nextUrl); // Push to the back of the array
          await this.djmtGuild.saveJSON();
          logger.info('Changed server banner successfully', {
            guildId: this.djmtGuild.guildId,
            imageUrl: nextUrl,
          });
          if (interaction) {
            await interaction.reply({
              content: `Changed server banner to ${nextUrl} successfully!`,
              ephemeral: true,
            });
          }
        } catch (e) {
          logger.error('Failed to change server banner', {
            guildId: this.djmtGuild.guildId,
            imageUrl: nextUrl,
            error: e,
          });
          if (interaction) {
            await interaction.reply({
              content: `Failed to change server banner to ${nextUrl}: ${String(e)}`,
              ephemeral: true,
            });
          }
        }
      }
    }
  }

  private async printBannerQueue(interaction: ChatInputCommandInteraction) {
    if (this.imageUrls.length > 0) {
      let msg = 'Dynamic Banner Queue in order:';
      this.imageUrls.forEach(url => {
        msg += `\n${url}`;
      });
      await interaction.reply({content: msg, ephemeral: true});
    } else {
      await interaction.reply({
        content: 'No Dynamic Banner Images in the queue',
        ephemeral: true,
      });
    }
  }

  /**
   * Adds or removes a imageUrl to the queue from a message. Expects one argument, the url.
   * When no arguments are given, it prints the current queue.
   * @param args array of strings containing the message content, separated by spaces
   * @param interaction the Message object
   * @private
   */
  private async addOrRemoveImageUrl(
    imageUrl: string,
    interaction: ChatInputCommandInteraction,
  ) {
    if (this.imageUrls.includes(imageUrl)) {
      await this.removeImageUrl(imageUrl);
      await interaction.reply({
        content: `Removed ${imageUrl} from Dynamic Banner queue`,
        ephemeral: true,
      });
    } else {
      try {
        await this.addImageUrl(imageUrl);
        await interaction.reply({
          content: `Added ${imageUrl} to Dynamic Banner queue`,
          ephemeral: true,
        });
      } catch (e) {
        if (e instanceof Error) {
          await interaction.reply({content: e.message, ephemeral: true});
        } else {
          await interaction.reply({
            content: JSON.stringify(e),
            ephemeral: true,
          });
        }
      }
    }
  }

  /**
   * Adds an image url to the components list of image urls. Image must be a png or jpg and Image must be at least 960x540 pixels.
   * @param imageUrl a url to a png or jpg image
   */
  async addImageUrl(imageUrl: string): Promise<void> {
    // Verify this is an image
    let image: ProbeResult;
    try {
      image = await probe(imageUrl);
    } catch (e) {
      const originalError = e instanceof Error ? e : new Error(String(e));
      logger.error('Failed to add image URL', {
        guildId: this.djmtGuild.guildId,
        imageUrl,
        error: originalError,
        reason: 'not an image file',
      });
      throw originalError;
    }
    // Image must be a png or jpg
    if (image.type !== 'png' && image.type !== 'jpg') {
      logger.error('Failed to add image URL', {
        guildId: this.djmtGuild.guildId,
        imageUrl,
        imageType: image.type,
        reason: 'not a png or jpg',
      });
      throw new Error(`Did not add image url ${imageUrl} is not a png or jpg`);
    }
    // Image must be at least 960x540 pixels
    if (!(image.width >= 960 && image.height >= 540)) {
      logger.error('Failed to add image URL', {
        guildId: this.djmtGuild.guildId,
        imageUrl,
        width: image.width,
        height: image.height,
        reason: 'does not meet minimum dimensions',
      });
      throw new Error(
        `Did not add image url ${imageUrl} does not meet the minimum dimensions`,
      );
    }
    // Successfully verified image
    this.imageUrls.push(imageUrl);
    await this.djmtGuild.saveJSON();
    logger.info('Added image URL to Dynamic Banner queue', {
      guildId: this.djmtGuild.guildId,
      imageUrl,
    });
  }

  /**
   * Removes the image url from the list of image urls.
   * @param imageUrl The url to remove
   */
  async removeImageUrl(imageUrl: string): Promise<void> {
    this.imageUrls = this.imageUrls.filter(url => url !== imageUrl);
    await this.djmtGuild.saveJSON();
    logger.info('Removed image URL from Dynamic Banner queue', {
      guildId: this.djmtGuild.guildId,
      imageUrl,
    });
  }
}
