import {Guild, GuildBasedChannel, TextChannel} from 'discord.js';

/**
 * Manages channel access for a Discord guild.
 * Provides type-safe methods for retrieving guild channels, particularly TextChannels.
 */
export class GuildChannelManager {
  /**
   * Creates a new GuildChannelManager
   * @param guild The Discord guild this manager operates on
   */
  constructor(private guild: Guild | undefined) {}

  /**
   * Updates the guild reference when it becomes available.
   * Call this when the guild is fetched from Discord.
   * @param guild The Discord guild instance
   */
  setGuild(guild: Guild | undefined): void {
    this.guild = guild;
  }

  /**
   * Retrieves a channel from the guild by its ID.
   * @param channelId The ID of the channel to retrieve
   * @returns The channel if found, undefined otherwise
   */
  getGuildChannel(channelId: string): GuildBasedChannel | undefined {
    return this.guild?.channels.cache.find(channel => channel.id === channelId);
  }

  /**
   * Retrieves a TextChannel from the guild by its ID.
   * Safely casts to TextChannel after verifying the channel type.
   * @param channelId The ID of the text channel to retrieve
   * @returns The TextChannel if found and is a valid text channel, undefined otherwise
   * @private
   */
  private getTextChannel(channelId: string): TextChannel | undefined {
    const channel = this.getGuildChannel(channelId);
    return channel?.isTextBased() ? (channel as TextChannel) : undefined;
  }

  /**
   * Retrieves the debug channel for this guild.
   * @param debugChannelId The ID of the debug channel
   * @returns The debug channel if found, undefined otherwise
   */
  getDebugChannel(debugChannelId: string): TextChannel | undefined {
    return this.getTextChannel(debugChannelId);
  }

  /**
   * Retrieves the mod alerts channel for this guild.
   * @param modAlertsChannelId The ID of the mod alerts channel
   * @returns The mod alerts channel if found, undefined otherwise
   */
  getModAlertsChannel(modAlertsChannelId: string): TextChannel | undefined {
    return this.getTextChannel(modAlertsChannelId);
  }

  /**
   * Retrieves the mod logging channel for this guild.
   * @param modLoggingChannelId The ID of the mod logging channel
   * @returns The mod logging channel if found, undefined otherwise
   */
  getModLoggingChannel(modLoggingChannelId: string): TextChannel | undefined {
    return this.getTextChannel(modLoggingChannelId);
  }
}
