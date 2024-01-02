import {Component} from "./Component";
import {GuildMember, Interaction, Message, MessageReaction, SlashCommandBuilder, User, VoiceState} from "discord.js";
import {ComponentNames} from "./Constants/ComponentNames";

const exampleCommand = new SlashCommandBuilder();
exampleCommand.setName("exampleCmd");
exampleCommand.setDescription("This is an example slash command!");
/**
 * Declare data you want to save in JSON here. This interface is used for getSaveData and
 * afterLoadJSON, as it tells Typescript what data you're expecting to write and load.
 */
interface ExampleComponentSave {}

/**
 * Describe your component here! Be sure to mention what its for and if it has any command strings
 * that users can use to interact.
 * NOTE: This component class file must be exported in the index.ts within the Components folder to be run by the bot!
 */
export class ExampleComponentTemplate extends Component<ExampleComponentSave> {

    // MANDATORY: Define a name in ComponentNames.ts and place it here.
    name: ComponentNames = ComponentNames.EXAMPLE_COMPONENT;
    // Place SlashCommandBuilder(s) directly into this array for them to be registered.
    commands: SlashCommandBuilder[] = [exampleCommand]

    async getSaveData(): Promise<ExampleComponentSave> {
        return {};
    }

    async afterLoadJSON(loadedObject: ExampleComponentSave | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
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
        return Promise.resolve(undefined);
    }


    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onInteractionCreate(interaction: Interaction): Promise<void> {
        // if (!interaction.isChatInputCommand()) {
        //     return;
        // }
        // // Any interactive commands should be defined in ComponentCommands.ts
        // if (interaction.commandName === ComponentCommands.ADD_YOUR_COMMAND_TAG_HERE) {
        //     await this.yourCommandHere(interaction);
        // } 
        return Promise.resolve(undefined);
    }
}
