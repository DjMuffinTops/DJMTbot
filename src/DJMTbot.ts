import Discord, {
  Client,
  GuildMember,
  GatewayIntentBits,
  Partials,
  Message,
  User,
  VoiceState,
  Events,
} from "discord.js";
import { promises as FileSystem } from "fs";
import { DJMTGuild } from "./DJMTGuild";
import { Cron } from "./Cron";
import dotenv from "dotenv";
// Here we load the guildConfigs.json file that contains our token and our prefix values.
dotenv.config();
Cron.getInstance();

export class DJMTbot {
  private static instance: DJMTbot;
  client: Client;
  guilds: Map<string, DJMTGuild>;
  private constructor() {
    this.client = new Discord.Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
    this.guilds = new Map<string, DJMTGuild>();
    void this.initGuildInstancesFromFiles()
      .then(() => console.log(`${this.guilds.size} DJMT Guilds Initialized`))
      .catch((err) => console.error("Failed initializing guild instances:", err));
  }

  public static getInstance(): DJMTbot {
    if (!DJMTbot.instance) {
      DJMTbot.instance = new DJMTbot();
    }
    return DJMTbot.instance;
  }

  private async initGuildInstancesFromFiles(): Promise<void> {
    const filenames = await FileSystem.readdir("./json/guilds");
    const guildIds = filenames.map((filename) =>
      filename.substr(0, filename.indexOf(".")),
    );
    for (const id of guildIds) {
      const guild = new DJMTGuild(id);
      this.guilds.set(id, guild);
    }
  }

  async run() {
    this.client.on(Events.ClientReady, () => {
      void (async () => {
        // Make guild instances for guilds we didnt have a file for
        for (const cachedGuild of [...this.client.guilds.cache.values()]) {
          const guildId = cachedGuild.id;
          if (!this.guilds.get(guildId)) {
            const guild = new DJMTGuild(guildId);
            this.guilds.set(guildId, guild);
          }
        }
        this.client?.user?.setActivity("@DJMTbot for help!");
        for (const id of Array.from(this.guilds.keys())) {
          await this.guilds.get(id)?.onReady();
        }
        console.log("DJMTbot is ready!");
      })().catch((err) => console.error("ClientReady handler error:", err));
    });

    this.client.on(Events.GuildMemberAdd, (member: GuildMember) => {
      void (async () => {
        const guild = this.guilds.get(member.guild?.id || "");
        if (guild) {
          await guild.onGuildMemberAdd(member);
        } else {
          console.log("member does not have an associated guild instance:", member);
        }
      })().catch((err) => console.error("GuildMemberAdd handler error:", err));
    });

    this.client.on(Events.MessageCreate, (message: Message) => {
      void (async () => {
        if (message.author.bot) return; // Ignore bot messages
        const args: string[] = message.content.trim().split(/ +/g);
        const guild = this.guilds.get(message.guild?.id || "");
        if (guild) {
          await guild.onMessageCreate(args, message);
        } else {
          console.log("Message does not have an associated guild instance:", message);
        }
      })().catch((err) => console.error("MessageCreate handler error:", err));
    });

    this.client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
      void (async () => {
        const guild = this.guilds.get(newMessage.guild?.id || "");
        if (guild) {
          await guild.onMessageUpdate(
            oldMessage as Message,
            newMessage as Message,
          );
        } else {
          console.log("NewMessage does not have an associated guild instance:", newMessage);
        }
      })().catch((err) => console.error("MessageUpdate handler error:", err));
    });

    this.client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => {
      void (async () => {
        const guild = this.guilds.get(newState.guild?.id || "");
        if (guild) {
          await guild.onVoiceStateUpdate(
            oldState,
            newState,
          );
        } else {
          console.log("newState does not have an associated guild instance:", newState);
        }
      })().catch((err) => console.error("VoiceStateUpdate handler error:", err));
    });

    this.client.on(Events.MessageReactionAdd, (messageReaction, user) => {
      void (async () => {
        // When we receive a reaction we check if the reaction is partial or not
        if (messageReaction.partial) {
          // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
          try {
            await messageReaction.fetch();
          } catch (error) {
            console.error(
              "Something went wrong when fetching the message: ",
              error,
            );
            return;
          }
        }
        const guild = this.guilds.get(messageReaction.message.guild?.id || "");
        if (!messageReaction.partial && guild) {
          await guild.onMessageReactionAdd(messageReaction, user as User);
        } else {
          console.log("Reaction does not have an associated guild instance:", messageReaction);
        }
      })().catch((err) => console.error("MessageReactionAdd handler error:", err));
    });

    this.client.on(Events.MessageReactionRemove, (messageReaction, user) => {
      void (async () => {
        // When we receive a reaction we check if the reaction is partial or not
        if (messageReaction.partial) {
          // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
          try {
            await messageReaction.fetch();
          } catch (error) {
            console.error(
              "Something went wrong when fetching the message: ",
              error,
            );
            return;
          }
        }
        const guild = this.guilds.get(messageReaction.message.guild?.id || "");
        if (!messageReaction.partial && guild) {
          await guild.onMessageReactionRemove(messageReaction, user as User);
        } else {
          console.log("Reaction does not have an associated guild instance:", messageReaction);
        }
      })().catch((err) => console.error("MessageReactionRemove handler error:", err));
    });

    this.client.on(Events.InteractionCreate, (interaction) => {
      void (async () => {
        const guild = this.guilds.get(interaction.guild?.id || "");
        if (guild) {
          await guild.onInteractionCreate(interaction);
        } else {
          console.log("Interaction does not have an associated guild instance:", interaction);
        }
      })().catch((err) => console.error("InteractionCreate handler error:", err));
    });

    this.client.on(Events.GuildCreate, (guild) => {
      console.log(
        `New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`,
      );
    });

    this.client.on(Events.GuildDelete, (guild) => {
      console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    });

    await this.client.login(process.env.TOKEN);
  }
}
