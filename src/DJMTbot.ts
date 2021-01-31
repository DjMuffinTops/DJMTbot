import Discord, {Client, Message, User} from "discord.js";
import {promises as FileSystem} from "fs";
// import ReactBoard from "./listeners/reactBoard";
import startCronJobs from "./cron";
import {Guild} from "./Guild";
import {ComponentNames} from "./Components/ComponentNames";
// let reactBoard: ReactBoard; // TODO: This is currently global, needs a class that has one react board per guild
// Here we load the guildConfigs.json file that contains our token and our prefix values.
require('dotenv').config();

export class DJMTbot {
    private static instance: DJMTbot;
    client: Client;
    guilds: Map<string, Guild>;
    private constructor() {
        this.client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
        this.guilds = new Map<string, Guild>();
        this.initializeGuilds().then(r => console.log('Guilds Initialized'));
    }

    public static async getInstance(): Promise<DJMTbot> {
        if (!DJMTbot.instance) {
            DJMTbot.instance = new DJMTbot();
        }
        return DJMTbot.instance;
    }

    private async initializeGuilds(): Promise<void> {
        const files = await FileSystem.readdir('./json/guilds');
        const guildIds = files.map((filename) => filename.substr(0, filename.indexOf('.')));
        for (const id of guildIds) {
            const guild = new Guild(this.client, id);
            this.guilds.set(id, guild);
        }
    }

    async run() {
        this.client.on("ready", async () => {
            // This event will run if the bot starts, and logs in, successfully.
            console.log(`Bot has started, with ${this.client.users.cache.size} users, in ${this.client.channels.cache.size} channels of ${this.client.guilds.cache.size} guilds.`);
            // Example of changing the bot's playing game to something useful. `client.user` is what the
            // docs refer to as the "ClientUser".
            this.client?.user?.setActivity(`@DJMTbot for help!`);
            // reactBoard = await ReactBoard.getInstance();
            await startCronJobs(this.client);
            // const debugChannel = (await client.channels.fetch(reactMapValue.channelId) as TextChannel);
        });

        this.client.on("guildCreate", guild => {
            // This event triggers when the bot joins a guild.
            console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
            this.client?.user?.setActivity(`@DJMTbot for help! | ${this.client.users.cache.size} users`);
        });

        this.client.on("guildDelete", guild => {
            // this event triggers when the bot is removed from a guild.
            console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
            this.client?.user?.setActivity(`@DJMTbot for help! | ${this.client.users.cache.size} users`);
        });

        this.client.on('messageReactionAdd', async (reaction, user) => {
            // When we receive a reaction we check if the reaction is partial or not
            if (reaction.partial) {
                // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Something went wrong when fetching the message: ', error);
                    // Return as `reaction.message.author` may be undefined/null
                    return;
                }
            }
            for (const id of Array.from(this.guilds.keys())) {
                if (id === reaction.message.guild?.id) {
                    this.guilds.get(id)?.onMessageReactionAdd(reaction, user as User);
                    return;
                }
            }
        });

        this.client.on("message", async (message: Message) => {
            // Ignore bot messages
            if (message.author.bot) return;
            let args: string[] = message.content.trim().split(/ +/g);
            for (const id of Array.from(this.guilds.keys())) {
                if (id === message.guild?.id) {
                    this.guilds.get(id)?.onMessage(args, message);
                    return;
                }
            }

            // Listeners
            // await executeListeners(this.client, args, message);

            // const command = args?.shift()?.toLowerCase() || '';

            // try {
            //     if ((Object.values(CommandStrings) as string[]).includes(command)) {
            //         message.channel.startTyping();
            //         // Admin Commands
            //         if (command === CommandStrings.SET_DEBUG_CHANNEL) {
            //             await setDebugChannel(this.client, args, message);
            //         }

            //         if (command === CommandStrings.SET_HOURS) {
            //             await setHoursCmd(this.client, args, message);
            //         }


            //         if (command === CommandStrings.SET_DOTW) {
            //             await setDotwCmd(this.client, args, message);
            //         }




            //     }
            // } catch (e) {
            //     console.error(`Errored with message content: ${message.content}`);
            //     console.error(`Errored with message: ${JSON.stringify(message, null, 2)}`);
            //     console.log(e);
            // }
            message.channel.stopTyping(true);
        });
        this.client.login(process.env.DEV_TOKEN);
    }
}
