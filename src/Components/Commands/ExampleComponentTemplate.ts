import {Component} from "../Component";
import {Channel, GuildMember, Message, MessageReaction, User, VoiceState} from "discord.js";
import {ComponentNames} from "../ComponentNames";

// Declare data you want to save in JSON here
export interface ExampleComponentInterface {

}

export class ExampleComponentTemplate extends Component<ExampleComponentInterface> {

    name: ComponentNames = ComponentNames.EXAMPLE_COMPONENT;

    async getSaveData(): Promise<ExampleComponentInterface> {
        return {};
    }

    async afterLoadJSON(loadedObject: ExampleComponentInterface | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onReady(): Promise<void> {
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
        // const command = args?.shift()?.toLowerCase() || '';
        // if (command === CommandStrings.ADD_YOUR_COMMAND_TAG_HERE) {
        //     await this.yourCommandHere(args, message);
        // }
        return Promise.resolve(undefined);
    }

    async onTypingStart(channel: Channel, user: User): Promise<void> {
        return Promise.resolve(undefined);
    }

    async onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        return Promise.resolve(undefined);
    }

}
