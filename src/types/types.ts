export interface Register {
    bruhCooldown: boolean;
    bruhChannels: string[];
    starChannels: string[];
    dotwChannels: string[];
    vcChannelPairs: string[][];
    reactBoards: ReactBoardEntry[];
}

export interface ReactBoardEntry {
    rawEmoteId: string,
    channelId: string,
    threshold: number,
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
