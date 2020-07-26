export interface GuildRegistry {
    bruhChannels: string[];
    starChannels: string[];
    dotwChannels: string[];
    vcChannelPairs: string[][];
}

export interface GuildConfig {
    "devMode": boolean,
    "prefix": string,
    "bruhCmd": BruhCommand;
}

export interface BruhCommand {
    onCooldown: boolean;
}

export interface DayOfTheWeek {
    day: string,
    messages: string[]
}