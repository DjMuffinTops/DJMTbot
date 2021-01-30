import {IBruhCommand} from "../Components/Commands/BruhCommand";
import {ComponentNames} from "../Components/ComponentNames";
import {TextChannel, VoiceChannel} from "discord.js";


export interface ReactBoardEntry {
    rawEmoteId: string,
    channelId: string,
    threshold: number,
}

export interface autoReactEntry {
    rawEmoteId: string,
    channelIds: string[],
}

// What should be written to JSON
export interface GuildConfig {
    debugMode: boolean,
    prefix: string,
    registered: boolean,
    debugChannel: string,
    register: Register,
}

export interface VoiceTextPairs {
    voiceChannel: VoiceChannel,
    textChannel: TextChannel
}

export interface ComponentConfig {
    [ComponentNames.BRUH]: IBruhCommand
}

export interface Register {
    bruhCooldown?: boolean;
    bruhChannels?: string[];
    starChannels?: string[];
    autoReacts?: autoReactEntry[];
    dotwChannels?: string[];
    vcChannelPairs?: string[][];
    reactBoards?: ReactBoardEntry[];
}

export interface DayOfTheWeek {
    day: string,
    messages: string[]
}
