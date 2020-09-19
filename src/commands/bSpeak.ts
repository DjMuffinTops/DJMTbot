import {Client, Message} from "discord.js";

export async function bCmd(client: Client, args: string[], message: Message) {
    const bChars = ['a', 'e', 'i', 'o', 'u', 'r'];
    let result = "";
    let B_OPTIONS = ['b', '🅱️'];
    let B_EMOJI_CHANCE = .05;
    for (let i = 0; i < args.length; i++) {
        let word = args[i];
        let previous = "";
        for (let j = 0; j < word.length; j++) {
            if (word.charAt(j).match(/^[a-zA-Z]+$/)) {
                let bChoice = B_OPTIONS[Math.random() < B_EMOJI_CHANCE ? 1 : 0];
                if (bChars.includes(word.charAt(j).toLowerCase())) {
                    result += `${previous}${bChoice}${word} `;
                } else {
                    result += `${previous}${bChoice}${word.substring(j + 1)} `;
                }
                break;
            } else {
                previous += word.charAt(j);
            }
        }
    }
    await message.channel.send(result.length > 0 ? result : "Given message was empty, try typing something this time.");
}
