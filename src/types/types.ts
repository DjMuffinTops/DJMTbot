export interface Register {
    bruhCooldown: boolean;
    bruhChannels: string[];
    autoReacts: autoReactEntry[];
    dotwChannels: string[];
    vcChannelPairs: string[][];
    reactBoards: ReactBoardEntry[];
}

export interface ReactBoardEntry {
    rawEmoteId: string,
    channelId: string,
    threshold: number,
}

export interface autoReactEntry {
    rawEmoteId: string,
    channelIds: string[],
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
