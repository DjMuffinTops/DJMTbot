import {Component} from "../Component";
import {Cron} from "../Cron";
import {
    GuildMember,
    Message,
    MessageReaction,
    TextChannel,
    User,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import {dayOfTheWeekConstants} from "../Constants/DayOfTheWeekConstants";
import {isAdmin} from "../HelperFunctions";
import {ComponentCommands} from "../Constants/ComponentCommands";


// Declare data you want to save in JSON here
interface DayOfTheWeekComponentSave {
    dotwChannels: string[];
}

interface DayOfTheWeek {
    day: string,
    messages: string[]
}

export class DayOfTheWeekComponent extends Component<DayOfTheWeekComponentSave> {

    name: ComponentNames = ComponentNames.DAY_OF_THE_WEEK;
    dotwChannels: string[] = [];


    async getSaveData(): Promise<DayOfTheWeekComponentSave> {
        return {
            dotwChannels: this.dotwChannels
        };
    }

    async afterLoadJSON(loadedObject: DayOfTheWeekComponentSave | undefined): Promise<void> {
        if (loadedObject) {
            this.dotwChannels = loadedObject.dotwChannels;
        }
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
        Cron.getInstance().schedule('0 59 10 * * *', async () => {
            await this.dotwJob();
        });

        Cron.getInstance().schedule('0 30 17 * * *', async () => {
            await this.pleasantEveningJob();
        });

        return Promise.resolve(undefined);
    }

    async onGuildMemberAdd(member: GuildMember): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreate(args: string[], message: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionAdd(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageReactionRemove(messageReaction: MessageReaction, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageUpdate(oldMessage: Message, newMessage: Message): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onMessageCreateWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === ComponentCommands.SET_DOTW) {
            await this.setDotwCmd(args, message);
        }
        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async dotwJob() {
        const date = new Date();
        const today: DayOfTheWeek = dayOfTheWeekConstants[date.getDay()];
        console.log(`[${this.djmtGuild.guildId}] Running Day of the Week Job: ${today.day} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        for (const channelId of this.dotwChannels) {
            const channel = (this.djmtGuild.getGuildChannel(channelId) as TextChannel);
            if (!channel) {
                console.error(`[DOTW Job]: ${channelId} could not be found.`)
            } else {
                // Determine which dotw post to send
                let randomMessage = today.messages[Math.floor(today.messages.length * Math.random())];
                await channel.send(randomMessage);
                console.log(`[${this.djmtGuild.guildId}] Sent: ${date.toLocaleTimeString()} ${randomMessage ? randomMessage : ''}`);
            }
        }
    }

    async pleasantEveningJob() {
        if (Math.random() < .4) {
            for (const channelId of this.dotwChannels) {
                const channel = this.djmtGuild.getGuildChannel(channelId) as TextChannel;
                if (!channel) {
                    console.error(`[PleasantEveningJob]: Could not find channel ${channelId}`);
                } else {
                    // Determine which dotw post to send
                    const msg = 'https://cdn.discordapp.com/attachments/683557958327730219/793229701920718858/unknown.png';
                    await channel.send(msg);
                }
            }
        }
    }

    async setDotwCmd(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (args.length === 0) {
            let channelString = "";
            if (this.dotwChannels?.length > 0) {
                this.dotwChannels.forEach((channelId: string) => {
                    channelString += `<#${channelId}> `;
                });
                await message.channel.send(`Day of the Week Channel: ${channelString}`);
            } else {
                await message.channel.send(`No Day of the Week Channel has been set!`);
            }
        } else {
            for (const rawChannelId of args) {
                let channelId = rawChannelId.substring(2, rawChannelId.indexOf('>'));
                const foundChannel = await this.djmtGuild.getGuildChannel(channelId);
                if (!foundChannel) {
                    await message.channel.send("The given channel is invalid!");
                    continue;
                }
                if (this.dotwChannels.includes(channelId)) {
                    this.dotwChannels = [];
                    await this.djmtGuild.saveJSON();
                    await message.channel.send(`Removed ${rawChannelId} as the Day of the Week Channel!`);
                } else {
                    this.dotwChannels = [channelId];
                    await this.djmtGuild.saveJSON();
                    await message.channel.send(`Set ${rawChannelId} as the Day of the Week Channel!`);
                }
            }
        }
    }
}
