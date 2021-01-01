export interface Register {
    bruhCooldown: boolean;
    bruhChannels: string[];
    starChannels: string[];
    dotwChannels: string[];
    vcChannelPairs: string[][];
    emoteChannelPairs: (string | (string|number)[])[][];
}

export interface GuildConfig {
    "devMode": boolean,
    "prefix": string,
    "registered": boolean,
    "register": Register;
}

export interface DayOfTheWeek {
    day: string,
    messages: string[]
}
