import {Component} from "../Component";
import {GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentNames} from "../Constants/ComponentNames";
import probe, {ProbeResult} from "probe-image-size";
import {ComponentCommands} from "../Constants/ComponentCommands";
import {Cron} from "../Cron";
import {isAdmin} from "../HelperFunctions";

interface DynamicBannerSave {
    imageUrls: string[];
}

/**
 * Dynamically changes the server banner. Iterates over a queue of image urls. When the server
 * banner changes, the last banner url is moved to the end of the queue. The banner changes endlessly
 * over each set number of hours.
 */
export class DynamicBanner extends Component<DynamicBannerSave> {

    name: ComponentNames = ComponentNames.DYNAMIC_BANNER;
    imageUrls: string[] = [];
    hourInterval: number = 4; // Banner will change after this many hours

    async getSaveData(): Promise<DynamicBannerSave> {
        return {
            imageUrls: this.imageUrls
        };
    }

    async afterLoadJSON(loadedObject: DynamicBannerSave | undefined): Promise<void> {
        if (loadedObject) {
            this.imageUrls = loadedObject.imageUrls;
        }
    }

    async onReady(): Promise<void> {
        // Every X hours, change the banner
        Cron.getInstance().schedule(`0 0 */${this.hourInterval} * * *`, async () => {
            console.log(`[${this.djmtGuild.guildId}] Running Dynamic Banner Job`);
            await this.rotateServerBanner();
        });
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
        if (command === ComponentCommands.SET_BANNER) {
            await this.addOrRemoveImageUrl(args, message);
        } else if (command === ComponentCommands.ROTATE_BANNER) {
            await this.rotateServerBanner(message);
        }
        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    /**
     * Changes the server banner to the next image in the image url list
     * @param message The message object this command was called by
     */
    async rotateServerBanner(message?: Message) {
        // Admin only
        if (message && !isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (this.imageUrls.length <= 0) {
            console.log(`[${this.djmtGuild.guildId}] No Dynamic Banner images in queue to change to.`)
            if (message) {
                await message.channel.send(`No Dynamic Banner images in queue to rotate to.`);
            }
        } else {
            const nextUrl = this.imageUrls.shift();
            if (nextUrl) {
                await this.djmtGuild.guild?.setBanner(nextUrl, `DJMTbot Dynamic Banner Change`);
                this.imageUrls.push(nextUrl); // Push to the back of the array
                await this.djmtGuild.saveJSON();
                console.log(`[${this.djmtGuild.guildId}] Changed server banner to ${nextUrl} successfully`);
                if (message) {
                    await message.channel.send(`Changed server banner to ${nextUrl} successfully!`);
                }
            }
        }
    }

    /**
     * Adds or removes a imageUrl to the queue from a message. Expects one argument, the url.
     * When no arguments are given, it prints the current queue.
     * @param args array of strings containing the message content, separated by spaces
     * @param message the Message object
     * @private
     */
    private async addOrRemoveImageUrl(args: string[], message: Message) {
        // Admin only
        if (!isAdmin(message)) {
            await message.channel.send(`This command requires administrator permissions.`);
            return;
        }

        if (args.length === 0) {
            if (this.imageUrls.length > 0) {
                let msg = 'Dynamic Banner Queue in order:';
                this.imageUrls.forEach(url => {
                    msg += `\n${url}`;
                })
                await message.channel.send(msg);
            } else {
                await message.channel.send(`No Dynamic Banner Images in the queue`);
            }
        } else if (args.length === 1) {
            const imageUrl = args[0];
            if (this.imageUrls.includes(imageUrl)) {
                await this.removeImageUrl(imageUrl);
                await message.channel.send(`Removed ${imageUrl} from Dynamic Banner queue`);
            } else {
                try {
                    await this.addImageUrl(imageUrl);
                    await message.channel.send(`Added ${imageUrl} to Dynamic Banner queue`);
                } catch(e) {
                    await message.channel.send(e.message);
                }
            }
        }
    }

    /**
     * Adds an image url to the components list of image urls. Image must be a png or jpg and Image must be at least 960x540 pixels.
     * @param imageUrl a url to a png or jpg image
     */
    async addImageUrl(imageUrl: string): Promise<void> {
        // Verify this is an image
        let image: ProbeResult;
        try {
            image = await probe(imageUrl);
        } catch (e) {
            console.error(e);
            console.error(`[${this.djmtGuild.guildId}] Did not add image url ${imageUrl} is not an image file.`);
            throw new Error(`Did not add image url ${imageUrl} is not an image file.`);
        }
        // Image must be a png or jpg
        if (image.type !== 'png' && image.type !== 'jpg') {
            console.error(`[${this.djmtGuild.guildId}] Did not add image url ${imageUrl} is not a png or jpg`);
            throw new Error(`Did not add image url ${imageUrl} is not a png or jpg`);
        }
        // Image must be at least 960x540 pixels
        if (!(image.width >= 960 && image.height >= 540)) {
            console.error(`[${this.djmtGuild.guildId}] Did not add image url ${imageUrl} does not meet the minimum dimensions`);
            throw new Error(`Did not add image url ${imageUrl} does not meet the minimum dimensions`);
        }
        // Successfully verified image
        this.imageUrls.push(imageUrl);
        await this.djmtGuild.saveJSON();
        console.log(`[${this.djmtGuild.guildId}] Added image url ${imageUrl} to Dynamic Banner Image Queue`)
    }

    /**
     * Removes the image url from the list of image urls.
     * @param imageUrl The url to remove
     */
    async removeImageUrl(imageUrl: string): Promise<void> {
        this.imageUrls = this.imageUrls.filter(url => url !== imageUrl);
        await this.djmtGuild.saveJSON();
        console.log(`[${this.djmtGuild.guildId}] Removed image url ${imageUrl} to Dynamic Banner Image Queue`)

    }


}
