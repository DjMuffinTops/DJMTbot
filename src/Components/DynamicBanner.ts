import { Component } from "../Component";
import { ChatInputCommandInteraction, GuildMember, Interaction, Message, MessageReaction, PermissionFlagsBits, SlashCommandBuilder, User, VoiceState } from "discord.js";
import { ComponentNames } from "../Constants/ComponentNames";
import probe, { ProbeResult } from "probe-image-size";
import { ComponentCommands } from "../Constants/ComponentCommands";
import { Cron } from "../Cron";
import { isMessageAdmin } from "../HelperFunctions";

const setBannerCommand = new SlashCommandBuilder();
setBannerCommand.setName(ComponentCommands.SET_BANNER);
setBannerCommand.setDescription("Adds a banner to the banner queue");
setBannerCommand.addStringOption(input => input.setName("imageurl").setDescription("The image url of the banner").setRequired(true))
setBannerCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const rotateBannerCommand = new SlashCommandBuilder();
rotateBannerCommand.setName(ComponentCommands.ROTATE_BANNER);
rotateBannerCommand.setDescription("Rotate to the next banner in the queue");
rotateBannerCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const printBannerCommand = new SlashCommandBuilder();
printBannerCommand.setName(ComponentCommands.PRINT_BANNER);
printBannerCommand.setDescription("Prints the banner queue");
printBannerCommand.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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
    commands: SlashCommandBuilder[] = [setBannerCommand, rotateBannerCommand, printBannerCommand];

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
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) {
            return;
        }
        if (interaction.commandName === ComponentCommands.PRINT_BANNER) {
            await this.printBannerQueue(interaction);
        }
        else if (interaction.commandName === ComponentCommands.SET_BANNER) {
            await this.addOrRemoveImageUrl(interaction.options.getString("imageurl", true), interaction);
        } else if (interaction.commandName === ComponentCommands.ROTATE_BANNER) {
            await this.rotateServerBanner(interaction);
        }
    }

    /**
     * Changes the server banner to the next image in the image url list
     * @param interaction The message object this command was called by
     */
    async rotateServerBanner(interaction?: ChatInputCommandInteraction) {
        if (this.imageUrls.length <= 0) {
            console.log(`[${this.djmtGuild.guildId}] No Dynamic Banner images in queue to change to.`)
            if (interaction) {
                await interaction.reply({ content: `No Dynamic Banner images in queue to rotate to.`, ephemeral: true });
            }
        } else {
            const nextUrl = this.imageUrls.shift();
            if (nextUrl) {
                try {
                    await this.djmtGuild.guild?.setBanner(nextUrl, `DJMTbot Dynamic Banner Change`);
                    this.imageUrls.push(nextUrl); // Push to the back of the array
                    await this.djmtGuild.saveJSON();
                    console.log(`[${this.djmtGuild.guildId}] Changed server banner to ${nextUrl} successfully`);
                    if (interaction) {
                        await interaction.reply({ content: `Changed server banner to ${nextUrl} successfully!`, ephemeral: true });
                    }
                } catch (e) {
                    console.log(`[${this.djmtGuild.guildId}] Failed to change server banner to ${nextUrl}: ${e}`);
                    if (interaction) {
                        await interaction.reply({ content: `Failed to change server banner to ${nextUrl}: ${e}`, ephemeral: true });
                    }
                }


            }
        }
    }

    private async printBannerQueue(interaction: ChatInputCommandInteraction) {
        if (this.imageUrls.length > 0) {
            let msg = 'Dynamic Banner Queue in order:';
            this.imageUrls.forEach(url => {
                msg += `\n${url}`;
            })
            await interaction.reply({ content: msg, ephemeral: true });
        } else {
            await interaction.reply({ content: `No Dynamic Banner Images in the queue`, ephemeral: true });
        }
    }

    /**
     * Adds or removes a imageUrl to the queue from a message. Expects one argument, the url.
     * When no arguments are given, it prints the current queue.
     * @param args array of strings containing the message content, separated by spaces
     * @param interaction the Message object
     * @private
     */
    private async addOrRemoveImageUrl(imageUrl: string, interaction: ChatInputCommandInteraction) {
        if (this.imageUrls.includes(imageUrl)) {
            await this.removeImageUrl(imageUrl);
            await interaction.reply({ content: `Removed ${imageUrl} from Dynamic Banner queue`, ephemeral: true });
        } else {
            try {
                await this.addImageUrl(imageUrl);
                await interaction.reply({ content: `Added ${imageUrl} to Dynamic Banner queue`, ephemeral: true });
            } catch (e) {
                if (e instanceof Error) {
                    await interaction.reply({ content: e.message, ephemeral: true });
                } else {
                    await interaction.reply({ content: JSON.stringify(e), ephemeral: true });
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
