import {Client, Message} from "discord.js";
import {getConfig, updateConfig} from "./config";
import {isAdmin} from "./helper";

export async function pingCmd(client: Client, args: string[], message: Message) {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    await m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
}

export async function sayCmd(client: Client, args: string[], message: Message) {
    const sayMessage:string  = args.join(" ");
    const userId = `<@${message.author.id}>`;
    const deniedMsgs = [
        `Sorry ${userId}, there\'s a 5% chance i\'ll actually say that.`,
        'Reh',
        ':RioluUgh:767528910065762315',
        `I\'m gonna send you to the ranch, ${userId}`,
        `You have no power over me, ${userId}`,
        `I\'m not gonna say that ${userId}...`,
        `Why should I say ${sayMessage}?`,
        `${sayMessage}???????`,
        `${args.reverse().join(" ")}`,
        `${sayMessage.toUpperCase().substring(0, Math.round(sayMessage.length / 2))}-`];
    if (!isAdmin(message) && Math.random() < .95) {
        await message.channel.send(deniedMsgs[Math.round(Math.random() * deniedMsgs.length)]);
        return;
    }
    // makes the bot say something and delete the message. As an example, it's open to anyone to use.
    // To get the "message" itself we join the `args` back into a string with spaces:

    // And we get the bot to say the thing:
    await message.channel.send(sayMessage.length ? sayMessage : `You didn't say anything! >:(`);
    await message.delete();

}

export async function helpCmd(client: Client, args: string[], message: Message) {
    const gConfig = await getConfig(message);
    let prefix = gConfig.prefix;
    let helpCommands =
        `#FUN
${prefix}cheems [text] -> Cheemsifies the given text.\n
${prefix}b [text] -> Applies b-speak to the given text.\n
${prefix}bruh -> Spits out a random message contained in marked bruh channels. Admins can mark channels to read from using the setbruh command.`;
    let helpAdminCommands =
        `#ADMIN ONLY
--------------------------------------------------------------------------------------
If the bot seems to not be responding, try using the resetconfig command (my bad ^^)
--------------------------------------------------------------------------------------
${prefix}prefix [text] -> Sets a new command prefix for this bot. Use this command without text to reset to the default: \`${process.env.DEFAULT_PREFIX}\`\n
${prefix}register -> Registers this server to have data saved that is required for certain commands.\n
${prefix}unregister -> Unregisters this server and deletes all register data saved.\n
${prefix}resetconfig -> Restores the guild's config settings to the bot's default config.\n
${prefix}dev -> When enabled, the bot will print out the states of the guild config, and guild registry.\n
${prefix}setautoreact [Emoji] [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be auto starred with the given emoji by the bot. Use command without mentioning channels to see the list of marked channels.\n`;
let helpAdminCommands2 =
`${prefix}setreactpairs [Emoji] [TextChannel Mention] [Threshold for ReactionBoard]-> {REGISTER REQUIRED} Marks/unmarks the mentioned channel to be act as a starboard for the given emoji after threshold reacts is reached on a msg. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setbruh [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel(s) to be used by the bruh command. Use command without mentioning channels to see the list of marked channels.\n
${prefix}setdotw [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channel to get Day of the Week messages. Will send a message to the channel at 11:59 EST everyday (does not account for daylight savings). Use command without mentioning channels to see the list of marked channels.\n
${prefix}setvcpairs [VoiceChannelId] [TextChannel Mention] -> {REGISTER REQUIRED} Marks/unmarks the mentioned channels as a pair. Will send occasional reminder messages to the vc text channel. Use command without mentioning channels to see the list of marked channel pairs.\n
${prefix}sethours [VoiceChannelId] [TextChannelId] -> {REGISTER REQUIRED} Manually sets the hour count for a given vc text channel pair.\n\n`;

    if (isAdmin(message)) {
        await message.channel.send(`\`\`\`css\n${helpAdminCommands}\`\`\``);
        await message.channel.send(`\`\`\`css\n${helpAdminCommands2}\`\`\``);
    }
    await message.channel.send(`\`\`\`css\n${helpCommands}\`\`\``);
}
