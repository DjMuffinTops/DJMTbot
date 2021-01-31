import {Component} from "../Component";
import {Cron} from "../../Cron";
import {
    Channel,
    GuildMember,
    Message,
    MessageReaction,
    TextChannel,
    User,
    VoiceState
} from "discord.js";
import {ComponentNames} from "../ComponentNames";
import {dotwConstants} from "../../Constants/dotwConstants";
import {isAdmin} from "../../helper";
import {CommandStrings} from "../../Constants/CommandStrings";


// Declare data you want to save in JSON here
export interface DayOfTheWeekComponentSave {
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

    async onMessage(args: string[], message: Message): Promise<void> {
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

    async onMessageWithGuildPrefix(args: string[], message: Message): Promise<void> {
        const command = args?.shift()?.toLowerCase() || '';
        if (command === CommandStrings.SET_DOTW) {
            await this.setDotwCmd(args, message);
        }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async dotwJob() {
        const date = new Date();
        const today: DayOfTheWeek = dotwConstants[date.getDay()];
        console.log(`[${this.guild.guildId}] Running Day of the Week Job: ${today.day} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        for (const channelId of this.dotwChannels) {
            const channel = (await this.guild.client.channels.fetch(channelId) as TextChannel);
            // Determine which dotw post to send
            let randomMessage = today.messages[Math.floor(today.messages.length * Math.random())];
            await channel.send(randomMessage);
            console.log(`[${this.guild.guildId}] Sent: ${date.toLocaleTimeString()} ${randomMessage ? randomMessage : ''}`);
        }
    }

    async pleasantEveningJob() {
        if (Math.random() < .4) {
            for (const channelId of this.dotwChannels) {
                try {
                    const channel = (await this.guild.client.channels.fetch(channelId) as TextChannel);
                    // Determine which dotw post to send
                    const msg = 'https://cdn.discordapp.com/attachments/683557958327730219/793229701920718858/unknown.png';
                    await channel.send(msg);
                } catch (e) {
                    console.log(e);
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
        if (!this.guild.registered) {
            await message.channel.send(`Please register your guild to use this command.`);
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
                try {
                    const foundChannel = await this.guild.client.channels.fetch(channelId);
                } catch (e) {
                    console.error(e);
                    await message.channel.send("The given channel is invalid!");
                    continue;
                }
                if (this.dotwChannels.includes(channelId)) {
                    this.dotwChannels = [];
                    await this.guild.saveJSON();
                    await message.channel.send(`Removed ${rawChannelId} as the Day of the Week Channel!`);
                } else {
                    this.dotwChannels = [channelId];
                    await this.guild.saveJSON();
                    await message.channel.send(`Set ${rawChannelId} as the Day of the Week Channel!`);
                }
            }
        }
    }
}
