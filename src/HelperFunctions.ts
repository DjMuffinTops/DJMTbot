import {
  Channel,
  ChatInputCommandInteraction,
  GuildMember,
  Interaction,
  Message,
  MessageReplyOptions,
  PermissionsBitField,
  Role,
} from 'discord.js';
import {DJMTbot} from './DJMTbot';
import {logger} from './Logger';

export const MEDIA_LINK_REGEX: RegExp = /(https?:\/\/[^\s]+)/; // not great but should work for all but weird edge cases

/** Returns whether the message author has the Administrator permission. */
export function isMessageAdmin(message: Message): boolean | undefined {
  return message?.member?.permissions.has(
    PermissionsBitField.Flags.Administrator,
  );
}

/** Returns whether an interaction member has the Administrator permission. */
export function isInteractionAdmin(
  interaction: Interaction,
): boolean | undefined {
  return interaction.memberPermissions?.has(
    PermissionsBitField.Flags.Administrator,
  );
}

/**
 * Ensures an interaction is made by an administrator and sends a standard
 * ephemeral denial response when it is not.
 */
export async function requireInteractionAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (isInteractionAdmin(interaction)) return true;

  await interaction.reply({
    content: 'This command requires administrator permissions.',
    flags: ['Ephemeral'],
  });
  return false;
}

/** Returns all roles currently assigned to a guild member. */
export function getGuildMembersRoles(member: GuildMember): Role[] {
  return member.roles.cache.map(role => role);
}

/** Formats channel IDs as space-separated Discord channel mentions. */
export function formatChannelMentions(channelIds: string[]): string {
  return channelIds.map(channelId => `<#${channelId}>`).join(' ');
}

/**
 * Adds an ID when absent or removes it when present.
 * @returns true when the ID was added, false when it was removed.
 */
export function toggleId(ids: string[], id: string): boolean {
  const index = ids.indexOf(id);
  if (index === -1) {
    ids.push(id);
    return true;
  }
  ids.splice(index, 1);
  return false;
}

/** Builds reply options that censor message text and attachment filenames. */
export function getCensoredMessageReplyOptions(
  message: Message,
): MessageReplyOptions {
  return {
    content: message.content.length > 0 ? `||${message.content}||` : undefined,
    files: message.attachments.map(attachment => {
      return {
        attachment: attachment.url,
        name: `SPOILER_${attachment.name}`,
      };
    }),
    allowedMentions: {},
    embeds: message.embeds,
  };
}
/**
 * Converts a text-channel mention into its channel ID.
 * @param channelMention A string in the format `<#1234>`.
 * @returns The channel ID contained in the mention.
 * @throws If the value is not a valid channel mention.
 */
export function channelMentionToChannelId(channelMention: string): string {
  if (channelMention.startsWith('<#') && channelMention.endsWith('>')) {
    return channelMention.substring(2, channelMention.length - 1);
  }
  throw new Error(
    `Given string ${channelMention} is not in the Text Channel mention format.`,
  );
}

/**
 * Fetches a channel by ID. Text-channel mentions such as `<#1234>` are also accepted.
 * @param channelId The channel ID or a text-channel mention.
 * @returns The fetched channel, or null when Discord cannot resolve it.
 * @throws If the supplied ID is not numeric.
 */
export async function channelIdToChannel(
  channelId: string,
): Promise<Channel | null> {
  let id: string = channelId;
  // Determine whether the given id is a mention or just the id
  if (channelId.startsWith('<#') && channelId.endsWith('>')) {
    id = channelMentionToChannelId(id);
  }
  if (!id.match('[0-9]+')) {
    throw new Error('channelId must be numerical');
  }
  logger.debug('HelperFunctions id', {id});
  return await DJMTbot.getInstance().client.channels.fetch(id);
}

/** Creates a new map by preserving keys and transforming each value. */
export function mapKeys<T, V, U>(
  m: Map<T, V>,
  fn: (this: void, v: V) => U,
): Map<T, U> {
  function transformPair([k, v]: [T, V]): [T, U] {
    return [k, fn(v)];
  }
  return new Map(Array.from(m.entries(), transformPair));
}

type SerializedMap = {
  dataType: 'Map';
  value: Array<readonly [unknown, unknown]>;
};

/** Determines whether a JSON value has the serialized Map representation. */
function isSerializedMap(v: unknown): v is SerializedMap {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>).dataType === 'Map' &&
    Array.isArray((v as Record<string, unknown>).value)
  );
}

/** JSON replacer that serializes Map instances as tagged objects. */
export function JSONStringifyReplacer(key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from((value as Map<unknown, unknown>).entries()),
    };
  }
  return value;
}

/** JSON reviver that reconstructs Maps serialized by JSONStringifyReplacer. */
export function JSONStringifyReviver(key: string, value: unknown): unknown {
  if (isSerializedMap(value)) {
    return new Map(value.value as Iterable<readonly [unknown, unknown]>);
  }
  return value;
}
