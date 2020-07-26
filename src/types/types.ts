export interface GuildRegistry {
    bruhChannels: string[];
    starChannels: string[];
    dotwChannels: string[];
}

export interface GuildConfig {
    "devMode": boolean,
    "prefix": string,
    "bruhCmd": BruhCommand;
}

export interface BruhCommand {
    onCooldown: boolean;
}