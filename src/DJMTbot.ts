import Discord, {Client, Message, User} from "discord.js";
import {promises as FileSystem} from "fs";
import {Guild} from "./Guild";
import {Cron} from "./Cron";
// Here we load the guildConfigs.json file that contains our token and our prefix values.
require('dotenv').config();
Cron.getInstance();

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
            console.log(`Bot is ready!`);
            this.client?.user?.setActivity(`@DJMTbot for help!`);
            for (const id of Array.from(this.guilds.keys())) {
                this.guilds.get(id)?.onReady();
            }
        });

        this.client.on("guildCreate", guild => {
            console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
            this.client?.user?.setActivity(`@DJMTbot for help! | ${this.client.users.cache.size} users`);
        });

        this.client.on("guildDelete", guild => {
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
            if (message.author.bot) return; // Ignore bot messages
            let args: string[] = message.content.trim().split(/ +/g);
            for (const id of Array.from(this.guilds.keys())) {
                if (id === message.guild?.id) {
                    this.guilds.get(id)?.onMessage(args, message);
                    return;
                }
            }
            message.channel.stopTyping(true);
        });
        await this.client.login(process.env.DEV_TOKEN);
    }
}
