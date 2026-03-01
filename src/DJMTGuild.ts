import {
  Guild,
  GuildBasedChannel,
  GuildMember,
  Message,
  AttachmentBuilder,
  MessageReaction,
  TextChannel,
  User,
  VoiceState,
  Interaction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  REST,
  Routes,
} from 'discord.js';

import {DJMTbot} from './DJMTbot';
import {logger} from './Logger';
import {ComponentNames} from './Constants/ComponentNames';
// JSONStringifyReplacer/Reviver: Custom JSON serialization for handling special types (dates, etc.)
import {JSONStringifyReplacer} from './HelperFunctions';
import {Component} from './Component';
import {GuildChannelManager} from './GuildChannelManager';
import {GuildConfigManager, GuildConfig} from './GuildConfigManager';
import * as components from './Components'; // All components are imported from here!

/**
 * Represents a single discord server (referred to as a Guild by discord js api). Each guild instance
 * maintains its own component instances as well. Every Component class exported within the Components index.ts file
 * will be instantiated.
 */
export class DJMTGuild {
  guild: Guild | undefined;
  isReady: boolean = false;
  readonly guildId: string;
  private channelManager: GuildChannelManager;

  // Configuration manager for all guild settings
  private configManager: GuildConfigManager;
  private components: Map<ComponentNames, Component<unknown>>;

  // ============ Constructor ============

  constructor(guildId: string) {
    this.guildId = guildId;
    this.configManager = new GuildConfigManager(guildId);
    this.components = new Map<ComponentNames, Component<unknown>>();
    this.channelManager = new GuildChannelManager(undefined);

    // Setup callback to collect component data before any save
    this.configManager.setOnBeforeSave(async () => {
      await this.collectComponentData();
    });

    // Setup callback to send debug channel attachment after save
    this.configManager.setOnConfigSaved(async () => {
      if (this.configManager.debugMode) {
        const debugChannel = this.getDebugChannel();
        if (debugChannel) {
          const attachment = new AttachmentBuilder(
            Buffer.from(this.buildGuildConfigJSON()),
            {name: 'config.txt'},
          );
          await debugChannel.send({files: [attachment]});
        }
      }
    });

    try {
      void this.initializeComponents()
        .then(() => {
          logger.info('DJMTGuild initialized', {guildId});
        })
        .catch((err: unknown) =>
          logger.error('Failed initializing components', {guildId, error: err}),
        );
    } catch (e) {
      logger.error('DJMTGuild constructor error', {guildId, error: e});
    }
  }

  // ============ Initialization ============

  /**
   * Initializes each component class exported in the /Components index.ts file for this guild.
   * @private
   */
  private async initializeComponents(): Promise<void> {
    /**
     * Creates an instance of a component class, from the import 'components'
     * @param className The name of the class as a string
     * @param args Arguments to pass to that classes constructor
     */
    function createInstance(
      className: string,
      guild: DJMTGuild,
    ): Component<unknown> {
      const ctor = (
        components as unknown as Record<
          string,
          new (g: DJMTGuild) => Component<unknown>
        >
      )[className];
      if (!ctor) {
        throw new Error(`Component class ${className} not found`);
      }
      return new ctor(guild);
    }
    const guildCommands: (
      | SlashCommandBuilder
      | SlashCommandOptionsOnlyBuilder
    )[] = [];
    for (const className of Object.keys(components)) {
      const instance = createInstance(className, this);
      guildCommands.push(...instance.commands);
      this.components.set(instance.name, instance);
    }

    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.TOKEN as string);
    try {
      logger.info('Started refreshing application commands', {
        guildId: this.guildId,
        count: guildCommands.length,
      });

      // The put method is used to fully refresh all commands in the guild with the current set
      const data: unknown = await rest.put(
        Routes.applicationGuildCommands(
          process.env.APPLICATION_ID as string,
          this.guildId,
        ),
        {body: guildCommands.map(command => command.toJSON())},
      );

      const num = Array.isArray(data) ? data.length : 0;
      logger.info('Successfully reloaded application commands', {
        guildId: this.guildId,
        count: num,
      });
    } catch (error) {
      // And of course, make sure you catch and log any errors!
      logger.error('Failed to reload application commands', {
        guildId: this.guildId,
        error,
      });
    }
  }

  /**
   * Retrieves all component instances for this guild.
   * @returns Array of all component instances
   * @private
   */
  private getAllComponents(): Component<unknown>[] {
    return Array.from(this.components.values());
  }

  /**
   * Builds the guild configuration JSON string for file output.
   * Delegates to configManager to get the JSON representation.
   * @returns The serialized JSON string of the guild config
   * @private
   */
  private buildGuildConfigJSON(): string {
    return JSON.stringify(
      this.configManager.getSaveData(),
      JSONStringifyReplacer,
      '\t',
    );
  }

  /**
   * Dispatches a component event to all components in this guild.
   * Handles the isReady check and iteration over all components.
   * @param methodName The name of the method to call on each component
   * @param args The arguments to pass to the method
   * @param requireReady If true, only dispatch if isReady is true. Default: true.
   * @private
   */
  private async dispatchComponentEvent<Args extends unknown[]>(
    methodName: string,
    args: Args,
    requireReady = true,
  ): Promise<void> {
    if (requireReady && !this.isReady) return;

    for (const component of this.getAllComponents()) {
      const method = component[methodName as keyof Component<unknown>];
      if (typeof method === 'function') {
        await (method as (...methodArgs: Args) => Promise<void>).apply(
          component,
          args,
        );
      }
    }
  }

  /**
   * Gets a component from this guild's components map. You will need to cast the return Component
   * to access it's properties. Expects the component's assigned ComponnetNames enum value.
   * @param name The ComponentNames (enum) name of the component to return.
   */
  // ============ Component Access ============

  getComponent(name: ComponentNames): Component<unknown> | undefined {
    return this.components.get(name);
  }

  /**
   * Returns the guild data that will be saved to JSON.
   * Delegates to configManager for the actual data retrieval.
   */
  // ============ Configuration Management ============

  getSaveData(): GuildConfig {
    return this.configManager.getSaveData();
  }

  /**
   * Loads data from this guild's respective JSON file.
   * Delegates to configManager for configuration load, then distributes component data.
   */
  async loadJSON(): Promise<void> {
    await this.configManager.loadJSON();

    // Get component data and pass to each component
    const componentData = this.configManager.getAllComponentData();
    for (const component of this.getAllComponents()) {
      await component.afterLoadJSON(componentData[component.name]);
    }
  }

  /**
   * Collects component data from all components and updates the config manager.
   * Called automatically before any save operation via the onBeforeSave callback.
   * @private
   */
  private async collectComponentData(): Promise<void> {
    const componentData = this.configManager.getAllComponentData();
    for (const component of this.getAllComponents()) {
      componentData[component.name] = await component.getSaveData();
    }
    logger.info('Collected component data', {
      guildId: this.guildId,
      componentData,
    });
    this.configManager.setAllComponentData(componentData);
  }

  /**
   * Saves data for this guild to a JSON file.
   * Component data is automatically collected via the onBeforeSave callback.
   * Delegates to configManager for persistence.
   */
  async saveJSON(): Promise<void> {
    // Delegate to configManager for actual saving (which will trigger onBeforeSave)
    await this.configManager.saveJSON();
  }

  /**
   * Resets the guild's data to default and saves the reset config.
   * Delegates to configManager for the reset logic.
   */
  async resetJSON(): Promise<void> {
    await this.configManager.resetJSON();
    logger.info('Reset config to default settings', {guildId: this.guildId});
    if (this.configManager.debugChannelId) {
      const debugChannel = this.getDebugChannel();
      if (debugChannel) {
        await debugChannel.send("Reset this guild's config");
      }
    }
    await this.loadJSON();
  }

  // ============ Event Handlers ============

  /**
   * Relay's the discord client's 'ready' event to all components
   */
  async onReady(): Promise<void> {
    try {
      this.guild = await DJMTbot.getInstance().client.guilds.fetch(
        this.guildId,
      );
      this.channelManager.setGuild(this.guild);
    } catch (e) {
      logger.error('DJMTGuild error', {guildId: this.guildId, error: e});
    }
    if (!this.guild) {
      logger.info(
        'Could not fetch guild with this id, guild cannot be readied.',
        {guildId: this.guildId},
      );
      return;
    }
    await this.loadJSON();
    logger.info('Loaded JSON', {guildId: this.guild.id});
    // Dispatch onReady to all components (execute regardless of isReady state)
    await this.dispatchComponentEvent('onReady', [], false);
    logger.info('Guild fetched and ready', {
      guildId: this.guild.id,
      guildName: this.guild.name,
    });
    this.isReady = true;
    // Send a message to the mod alerts channel if it exists
    const modAlertsChannel = this.getModAlertsChannel();
    if (modAlertsChannel) {
      await modAlertsChannel.send('DJMTbot is now online!');
    }
  }

  /**
   * Relay's the discord client's 'guildMemberAdd' event to all components
   * @param member The added guild member
   */
  async onGuildMemberAdd(member: GuildMember): Promise<void> {
    await this.dispatchComponentEvent('onGuildMemberAdd', [member]);
  }

  /**
   * Relay's the discord client's 'messageCreate' event to all components
   * @param args array of strings containing the message content, separated by spaces
   * @param message the Message object
   */
  async onMessageCreate(args: string[], message: Message): Promise<void> {
    if (this.isReady) {
      // Display the prefix when mentioned. Don't do this if the message is from an everyone ping
      if (
        this.guild?.client.user &&
        message.mentions.has(this.guild?.client.user) &&
        !message.mentions.everyone &&
        message.channel.isSendable()
      ) {
        await message.channel.send('Type / to see my slash commands!');
      }
      for (const component of this.getAllComponents()) {
        await component.onMessageCreate(args, message); // All messages go through here

        // Additionally, messages will go through here if the msg starts with our guild prefix
        if (message.content.indexOf(this.prefix) === 0) {
          // set args to be everything after the prefix, separated by spaces
          args = message.content.slice(this.prefix.length).trim().split(/ +/g);
          await component.onMessageCreateWithGuildPrefix(args, message);
        }
      }
    }
  }

  /**
   * Relay's the discord client's 'messageUpdate' event to all components
   * @param oldMessage the message prior to updating
   * @param newMessage the message after updating
   */
  async onMessageUpdate(
    oldMessage: Message,
    newMessage: Message,
  ): Promise<void> {
    await this.dispatchComponentEvent('onMessageUpdate', [
      oldMessage,
      newMessage,
    ]);
  }

  /**
   * Relay's the discord client's 'voiceStateUpdate' event to all components
   * @param oldState the old voice state
   * @param newState the new voice state
   */
  async onVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    await this.dispatchComponentEvent('onVoiceStateUpdate', [
      oldState,
      newState,
    ]);
  }

  /**
   * Relay's the discord client's 'messageReactionAdd' event to all components
   * @param messageReaction the reaction added to the message
   * @param user the user who added the reaction
   */
  async onMessageReactionAdd(
    messageReaction: MessageReaction,
    user: User,
  ): Promise<void> {
    await this.dispatchComponentEvent('onMessageReactionAdd', [
      messageReaction,
      user,
    ]);
  }

  /**
   * Relay's the discord client's 'messageReactionRemove' event to all components
   * @param messageReaction the reaction removed from the message
   * @param user the user who removed the reaction
   */
  async onMessageReactionRemove(
    messageReaction: MessageReaction,
    user: User,
  ): Promise<void> {
    await this.dispatchComponentEvent('onMessageReactionRemove', [
      messageReaction,
      user,
    ]);
  }

  /**
   * Relay's the discord client's 'interactionCreate' event to all components
   * @param interaction the interaction
   */
  async onInteractionCreate(interaction: Interaction): Promise<void> {
    await this.dispatchComponentEvent('onInteractionCreate', [interaction]);
  }

  private getDebugChannel(): TextChannel | undefined {
    return this.channelManager.getDebugChannel(this.debugChannelId);
  }

  /**
   * Retrieves a channel from the guild by its ID.
   * Public method for components that need to access channels.
   * @param channelId The ID of the channel to retrieve
   * @returns The channel if found, undefined otherwise
   */
  getGuildChannel(channelId: string): GuildBasedChannel | undefined {
    return this.channelManager.getGuildChannel(channelId);
  }

  getModAlertsChannel(): TextChannel | undefined {
    return this.channelManager.getModAlertsChannel(this.modAlertsChannelId);
  }

  getModLoggingChannel(): TextChannel | undefined {
    return this.channelManager.getModLoggingChannel(this.modLoggingChannelId);
  }

  // Getters / Setters
  /**
   * Gets the debug mode setting for this guild.
   * Delegates to configManager.
   */
  // ============ Configuration Property Accessors ============

  get debugMode(): boolean {
    return this.configManager.debugMode;
  }

  /**
   * Sets the debug mode setting and auto-saves to JSON.
   * Delegates to configManager.
   * @param value The new debug mode value
   */
  set debugMode(value: boolean) {
    this.configManager.debugMode = value;
  }

  /**
   * Gets the command prefix for this guild.
   * Delegates to configManager.
   */
  get prefix(): string {
    return this.configManager.prefix;
  }

  /**
   * Sets the command prefix and auto-saves to JSON.
   * Delegates to configManager.
   * @param value The new prefix value
   */
  set prefix(value: string) {
    this.configManager.prefix = value;
  }

  /**
   * Gets the debug channel ID for this guild.
   * Delegates to configManager.
   */
  get debugChannelId(): string {
    return this.configManager.debugChannelId;
  }

  /**
   * Sets the debug channel ID with validation and auto-saves to JSON.
   * Delegates to configManager.
   * @param value The new debug channel ID, or undefined to unset
   */
  set debugChannelId(value: string | undefined) {
    this.configManager.debugChannelId = value;
  }

  /**
   * Gets the mod alerts channel ID for this guild.
   * Delegates to configManager.
   */
  get modAlertsChannelId(): string {
    return this.configManager.modAlertsChannelId;
  }

  /**
   * Sets the mod alerts channel ID with validation and auto-saves to JSON.
   * Delegates to configManager.
   * @param value The new mod alerts channel ID, or undefined to unset
   */
  set modAlertsChannelId(value: string | undefined) {
    this.configManager.modAlertsChannelId = value;
  }

  /**
   * Gets the mod logging channel ID for this guild.
   * Delegates to configManager.
   */
  get modLoggingChannelId(): string {
    return this.configManager.modLoggingChannelId;
  }

  /**
   * Sets the mod logging channel ID with validation and auto-saves to JSON.
   * Delegates to configManager.
   * @param value The new mod logging channel ID, or undefined to unset
   */
  set modLoggingChannelId(value: string | undefined) {
    this.configManager.modLoggingChannelId = value;
  }
}
