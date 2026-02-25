import {promises as FileSystem} from 'fs';
import * as jsonDiff from 'json-diff';
import defaultConfigJson from '../json/defaultConfig.json';
import {GUILD_CONFIG_PATH, DEFAULT_PREFIX} from './Constants/GuildConstants';
import {JSONStringifyReplacer, JSONStringifyReviver} from './HelperFunctions';
import {logger} from './Logger';

// Type definitions
type ComponentDataMap = Record<string, unknown>;

/**
 * Represents the configuration structure for a Guild.
 */
export interface GuildConfig {
  debugMode: boolean;
  prefix: string;
  debugChannelId?: string;
  modAlertsChannelId?: string;
  modLoggingChannelId?: string;
  componentData?: ComponentDataMap;
}

/**
 * Manages the configuration and persistence of a Discord guild's settings.
 * Encapsulates all config-related logic including loading, saving, and resetting.
 * Provides getters and setters for all configuration properties with automatic persistence.
 */
export class GuildConfigManager {
  private readonly guildId: string;
  private propertyStorage: Map<string, unknown>;

  // Backward-compatible underscore-prefixed fields
  private _debugMode: boolean;
  private _prefix: string;
  private _debugChannelId: string | undefined;
  private _modAlertsChannelId: string | undefined;
  private _modLoggingChannelId: string | undefined;
  private componentData: ComponentDataMap;

  // Callbacks for persistence lifecycle
  private onBeforeSave: (() => Promise<void>) | null = null;
  private onConfigSaved: (() => Promise<void>) | null = null;

  // Track last saved JSON for diff logging
  private lastSavedJson: string = '';

  /**
   * Creates a new GuildConfigManager for a specific guild.
   * Initializes all configuration properties to default values.
   * @param guildId The ID of the guild to manage configuration for
   */
  // ============ Constructor ============

  constructor(guildId: string) {
    this.guildId = guildId;
    this.propertyStorage = new Map();
    const defaultConfig = defaultConfigJson as Partial<
      typeof defaultConfigJson
    >;
    this._debugMode = !!defaultConfig.debugMode;
    this._prefix = defaultConfig.prefix || DEFAULT_PREFIX;
    this._debugChannelId = defaultConfig.debugChannelId || undefined;
    this._modAlertsChannelId =
      ((defaultConfig as Record<string, unknown>)
        .modAlertsChannelId as string) || undefined;
    this._modLoggingChannelId =
      ((defaultConfig as Record<string, unknown>)
        .modLoggingChannelId as string) || undefined;
    this.componentData =
      (defaultConfig.componentData as ComponentDataMap) || {};

    this.initializePropertyStorage();
  }

  /**
   * Initializes the propertyStorage map with default values.
   * Used during construction and when resetting configuration.
   * @private
   */
  private initializePropertyStorage(): void {
    this.propertyStorage.set('debugMode', this._debugMode);
    this.propertyStorage.set('prefix', this._prefix);
    this.propertyStorage.set('debugChannelId', this._debugChannelId);
    this.propertyStorage.set('modAlertsChannelId', this._modAlertsChannelId);
    this.propertyStorage.set('modLoggingChannelId', this._modLoggingChannelId);
  }

  /**
   * Validates that a channel ID is in the correct format (non-empty string).
   * @param id The channel ID to validate
   * @returns True if the channel ID is valid
   * @private
   */
  private isValidChannelId(id: string): boolean {
    return typeof id === 'string' && id.length > 0;
  }

  /**
   * Sets a callback to be invoked before configuration is saved.
   * Used by DJMTGuild to collect component data before persistence.
   * @param callback The callback function to invoke
   */
  setOnBeforeSave(callback: (() => Promise<void>) | null): void {
    this.onBeforeSave = callback;
  }

  /**
   * Sets a callback to be invoked after configuration is saved.
   * Used by DJMTGuild to perform additional actions on config persistence.
   * @param callback The callback function to invoke
   */
  setOnConfigSaved(callback: (() => Promise<void>) | null): void {
    this.onConfigSaved = callback;
  }

  /**
   * Gets the current save data for this configuration.
   * Returns a snapshot of all config values suitable for JSON serialization.
   * @returns The configuration object ready for saving
   */
  // ============ Persistence Methods ============

  getSaveData(): GuildConfig {
    return {
      debugMode: this._debugMode,
      prefix: this._prefix,
      debugChannelId: this._debugChannelId,
      modAlertsChannelId: this._modAlertsChannelId,
      modLoggingChannelId: this._modLoggingChannelId,
      componentData: this.componentData,
    };
  }

  /**
   * Builds the JSON string representation of this guild's configuration.
   * Saves the config without wrapping in [guildId] object for simplified structure.
   * @returns The serialized JSON string
   * @private
   */
  private getSaveDataAsJSON(): string {
    return JSON.stringify(this.getSaveData(), JSONStringifyReplacer, '\t');
  }

  /**
   * Loads configuration from this guild's JSON file.
   * Updates all fields and invokes the onConfigSaved callback.
   * Supports both new flat and legacy wrapped JSON structures for backwards compatibility.
   */
  async loadJSON(): Promise<void> {
    const fileName = GUILD_CONFIG_PATH(this.guildId);
    let gConfig: GuildConfig | undefined;
    try {
      const buffer = await FileSystem.readFile(fileName);
      const parsed = JSON.parse(buffer.toString(), JSONStringifyReviver) as
        | Record<string, unknown>
        | undefined;

      // Support both new flat structure and legacy wrapped structure
      if (parsed) {
        // Try new flat structure first
        if ('debugMode' in parsed && 'prefix' in parsed) {
          gConfig = parsed as unknown as GuildConfig;
        } else if (this.guildId in parsed) {
          // Fall back to legacy wrapped structure
          gConfig = parsed[this.guildId] as unknown as GuildConfig | undefined;
        }
      }
    } catch (e) {
      logger.warn('Could not load JSON, resetting to defaults', {
        guildId: this.guildId,
        error: e,
      });
      await this.resetJSON();
      return;
    }

    if (gConfig && gConfig.componentData) {
      this._debugMode = !!gConfig.debugMode;
      this._prefix = gConfig.prefix || this._prefix;
      this._debugChannelId = gConfig.debugChannelId || this._debugChannelId;
      this._modAlertsChannelId =
        gConfig.modAlertsChannelId || this._modAlertsChannelId;
      this._modLoggingChannelId =
        gConfig.modLoggingChannelId || this._modLoggingChannelId;
      this.componentData = gConfig.componentData || this.componentData;

      // Update propertyStorage with loaded values
      this.initializePropertyStorage();
      // Capture current state for diff tracking
      this.lastSavedJson = this.getSaveDataAsJSON();
    } else {
      logger.info(
        'Guild file read but gConfig contents not found. Resetting file',
        {
          guildId: this.guildId,
        },
      );
      await this.resetJSON();
    }
  }

  /**
   * Saves configuration to this guild's JSON file.
   * Writes the config in the new flat structure (without [guildId] wrapper).
   * Invokes onBeforeSave to collect component data, then onConfigSaved after successful save.
   * Logs a diff of changes with each save.
   */
  async saveJSON(): Promise<void> {
    // Call onBeforeSave to allow component data collection
    if (this.onBeforeSave) {
      await this.onBeforeSave();
    }

    const filename = GUILD_CONFIG_PATH(this.guildId);
    const newJson = this.getSaveDataAsJSON();

    

    let diff: ReturnType<typeof jsonDiff.diff> | undefined;
    if (this.lastSavedJson !== newJson) {
      try {
        const oldConfig = this.lastSavedJson
          ? JSON.parse(this.lastSavedJson, JSONStringifyReviver)
          : {};
        const newConfig = JSON.parse(newJson, JSONStringifyReviver);
        diff = jsonDiff.diff(oldConfig, newConfig);
      } catch (e) {
        logger.warn('Failed to generate config diff', {
          guildId: this.guildId,
          error: e,
        });
      }
    }

    await FileSystem.writeFile(filename, newJson);
    this.lastSavedJson = newJson;
    logger.info('Guild config saved', {
      filename,
      guildId: this.guildId,
      ...(diff ? {changes: diff} : {}),
    });
    
    // Call onConfigSaved for post-save actions (like debug channel attachment)
    if (this.onConfigSaved) {
      await this.onConfigSaved();
    }
  }

  /**
   * Resets all configuration to default values and saves to JSON.
   */
  async resetJSON(): Promise<void> {
    const defaultConfig = defaultConfigJson as Partial<
      typeof defaultConfigJson
    >;
    this._debugMode = !!defaultConfig.debugMode;
    this._prefix = defaultConfig.prefix || DEFAULT_PREFIX;
    this._debugChannelId = defaultConfig.debugChannelId || undefined;
    this._modAlertsChannelId =
      ((defaultConfig as Record<string, unknown>)
        .modAlertsChannelId as string) || undefined;
    this._modLoggingChannelId =
      ((defaultConfig as Record<string, unknown>)
        .modLoggingChannelId as string) || undefined;
    this.componentData =
      (defaultConfig.componentData as ComponentDataMap) || {};
    this.initializePropertyStorage();

    logger.info('Reset config to default settings', {guildId: this.guildId});
    await this.saveJSON();
  }

  /**
   * Gets the component data for a specific component.
   * @param componentName The name of the component
   * @returns The component's saved data, or undefined if not found
   */
  getComponentData(componentName: string): unknown {
    return this.componentData[componentName];
  }

  /**
   * Sets the component data for a specific component.
   * Does not auto-save to JSON.
   * @param componentName The name of the component
   * @param data The data to save for this component
   */
  setComponentData(componentName: string, data: unknown): void {
    this.componentData[componentName] = data;
  }

  /**
   * Gets all component data.
   * @returns The component data map
   */
  getAllComponentData(): ComponentDataMap {
    return this.componentData;
  }

  /**
   * Sets all component data at once.
   * @param data The new component data map
   */
  setAllComponentData(data: ComponentDataMap): void {
    this.componentData = data;
  }

  // ============ Configuration Property Accessors ============

  /**
   * Gets the debug mode setting.
   */
  get debugMode(): boolean {
    return (
      (this.propertyStorage.get('debugMode') as boolean) ?? this._debugMode
    );
  }

  /**
   * Sets the debug mode and auto-saves to JSON.
   */
  set debugMode(value: boolean) {
    this.propertyStorage.set('debugMode', value);
    this._debugMode = value;
    void this.saveJSON();
  }

  /**
   * Gets the command prefix.
   */
  get prefix(): string {
    return (this.propertyStorage.get('prefix') as string) ?? this._prefix;
  }

  /**
   * Sets the command prefix and auto-saves to JSON.
   */
  set prefix(value: string) {
    this.propertyStorage.set('prefix', value);
    this._prefix = value;
    void this.saveJSON();
  }

  /**
   * Gets the debug channel ID.
   */
  get debugChannelId(): string {
    return (
      (this.propertyStorage.get('debugChannelId') as string) ??
      this._debugChannelId ??
      ''
    );
  }

  /**
   * Sets the debug channel ID with validation and auto-saves to JSON.
   * Pass undefined to unset the channel.
   */
  set debugChannelId(value: string | undefined) {
    if (value === undefined || this.isValidChannelId(value)) {
      this.propertyStorage.set('debugChannelId', value ?? '');
      this._debugChannelId = value;
      void this.saveJSON();
    } else {
      logger.warn('Invalid debugChannelId provided', {
        channelId: value,
        guildId: this.guildId,
      });
    }
  }

  /**
   * Gets the mod alerts channel ID.
   */
  get modAlertsChannelId(): string {
    return (
      (this.propertyStorage.get('modAlertsChannelId') as string) ??
      this._modAlertsChannelId ??
      ''
    );
  }

  /**
   * Sets the mod alerts channel ID with validation and auto-saves to JSON.
   * Pass undefined to unset the channel.
   */
  set modAlertsChannelId(value: string | undefined) {
    if (value === undefined || this.isValidChannelId(value)) {
      this.propertyStorage.set('modAlertsChannelId', value ?? '');
      this._modAlertsChannelId = value;
      void this.saveJSON();
    } else {
      logger.warn('Invalid modAlertsChannelId provided', {
        channelId: value,
        guildId: this.guildId,
      });
    }
  }

  /**
   * Gets the mod logging channel ID.
   */
  get modLoggingChannelId(): string {
    return (
      (this.propertyStorage.get('modLoggingChannelId') as string) ??
      this._modLoggingChannelId ??
      ''
    );
  }

  /**
   * Sets the mod logging channel ID with validation and auto-saves to JSON.
   * Pass undefined to unset the channel.
   */
  set modLoggingChannelId(value: string | undefined) {
    if (value === undefined || this.isValidChannelId(value)) {
      this.propertyStorage.set('modLoggingChannelId', value ?? '');
      this._modLoggingChannelId = value;
      void this.saveJSON();
    } else {
      logger.warn('Invalid modLoggingChannelId provided', {
        channelId: value,
        guildId: this.guildId,
      });
    }
  }
}
