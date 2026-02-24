import {Component} from '../Component';
import {
  GuildMember,
  Message,
  AttachmentBuilder,
  MessageReaction,
  User,
  VoiceState,
  Interaction,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import {ComponentCommands} from '../Constants/ComponentCommands';
import {isInteractionAdmin, JSONStringifyReplacer} from '../HelperFunctions';
import {ComponentNames} from '../Constants/ComponentNames';
import {DateTime} from 'luxon';

const exportConfigCommand = new SlashCommandBuilder();
exportConfigCommand.setName(ComponentCommands.EXPORT_CONFIG);
exportConfigCommand.setDescription('Exports the guilds djmtbot config');
exportConfigCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

const resetConfigCommand = new SlashCommandBuilder();
resetConfigCommand.setName(ComponentCommands.RESET_CONFIG);
resetConfigCommand.setDescription('Resets the guilds djmtbot config');
resetConfigCommand.setDefaultMemberPermissions(
  PermissionFlagsBits.Administrator,
);

type ConfigComponentSave = Record<string, unknown>;
export class ConfigComponent extends Component<ConfigComponentSave> {
  name: ComponentNames = ComponentNames.CONFIG;
  commands: SlashCommandBuilder[] = [exportConfigCommand, resetConfigCommand];

  onMessageCreateWithGuildPrefix(
    _args: string[],
    _message: Message,
  ): Promise<void> {
    return Promise.resolve();
  }

  getSaveData(): Promise<ConfigComponentSave> {
    return Promise.resolve({} as ConfigComponentSave);
  }

  afterLoadJSON(_parsedJSON: ConfigComponentSave | undefined): Promise<void> {
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

  onMessageUpdate(_oldMessage: Message, _newMessage: Message): Promise<void> {
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
    if (interaction.commandName === ComponentCommands.EXPORT_CONFIG) {
      await this.exportConfig(interaction);
    } else if (interaction.commandName === ComponentCommands.RESET_CONFIG) {
      await this.resetConfig(interaction);
    }
  }

  async exportConfig(interaction: ChatInputCommandInteraction) {
    // Admin only
    if (!isInteractionAdmin(interaction)) {
      await interaction.reply({
        content: 'This command requires administrator permissions.',
        ephemeral: true,
      });
      return;
    }
    const jsonString = `${JSON.stringify(
      {[this.djmtGuild.guildId]: this.djmtGuild.getSaveData()},
      JSONStringifyReplacer,
      '  ',
    )}`;
    const attachment = new AttachmentBuilder(Buffer.from(jsonString), {
      name: `config_${this.djmtGuild.guildId}_${DateTime.local().toLocaleString(
        DateTime.DATETIME_FULL_WITH_SECONDS,
      )}.txt`,
    });
    await interaction.reply({files: [attachment], ephemeral: true});
  }

  async resetConfig(interaction: ChatInputCommandInteraction) {
    // Admin only
    if (!isInteractionAdmin(interaction)) {
      await interaction.reply({
        content: 'This command requires administrator permissions.',
        ephemeral: true,
      });
      return;
    }
    await this.djmtGuild.resetJSON();
    await interaction.reply({
      content: 'Reset my guild config to default settings.',
      ephemeral: true,
    });
  }
}
