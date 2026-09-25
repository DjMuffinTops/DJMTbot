/**
 * Guild-related constants
 * These values are used across guild configuration, file paths, and defaults
 */

/** The base directory for guild configuration files */
export const GUILD_CONFIG_DIR = './json/guilds';

/**
 * Constructs the file path for a guild's configuration JSON
 * @param guildId The Discord guild ID
 * @returns The full path to the guild's config file
 */
export const GUILD_CONFIG_PATH = (guildId: string): string =>
  `${GUILD_CONFIG_DIR}/${guildId}.json`;

/** Default bot prefix for new guilds */
export const DEFAULT_PREFIX = 'djmt!';

/** Default debug mode setting for new guilds */
export const DEFAULT_DEBUG_MODE = false;
