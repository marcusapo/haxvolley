import { ButtonInteraction, Client, Events, GuildMember, Message, ModalSubmitInteraction } from "discord.js";
import { Database } from "../database/database";
import { DiscordUtil } from "./utils";
import Settings from "../settings.json";
import { prisma } from "../database/prisma";

export class DiscordConnector {
    client;

    constructor(token : string) {
        console.log("log", `Conectando com Discord...`);
        this.client = new Client({
            intents: ["MessageContent", "GuildMessages", "GuildMembers", "Guilds"]
        });
        this.startListening();
        this.connect(token);
    }

    private connect(token : string) {
        this.client.login(token);
    }

    private async handleNewAccount(nickname: string, discordId: string, member: GuildMember | null) {
        if(!member) return;
        const exists = await this.giveRolesIfAccountExists(member);
        if(exists) return;
        await Database.createNewAccount(nickname, discordId);
        await DiscordUtil.giveRoleTo(member, Settings.discordRegistredRoleId);
        await DiscordUtil.setMemberNickname(member, nickname);
        this.client.emit("customOnAccountCreated", nickname);
    }

    private async giveRolesIfAccountExists(member : GuildMember) {
        const accountExists = await Database.findUserByDiscordId(member.user.id);
        if(!accountExists) return false;
        await DiscordUtil.giveRoleTo(member, Settings.discordRegistredRoleId);
        await DiscordUtil.setMemberNickname(member, accountExists.nickname);
        return true;
    }

    private async onDiscordReady(info : Client) {
        console.log("important", `Discord conectado com @${info.user?.username}`);
        DiscordUtil.client = this.client;
    }

    private async onRequestAccountModalCreation(info : Message) {
        const channel = info.channel;
        if(!channel.isSendable()) {
            console.log("error", "Can't send messages to this channel.");
            return;
        }
        await channel.send({
            embeds: [DiscordUtil.embeds.ChangeNickname()],
            components: [DiscordUtil.components.ChangeNicknameButton()]
        });
        await info.delete();
    }

    private async onRequestNicknameChange(interaction : ButtonInteraction) {
        await interaction.showModal(DiscordUtil.modals.ChangeNick());
    }

    async onChangeNickModalSubmit(interaction : ModalSubmitInteraction) {
        const nickname = interaction.fields.getTextInputValue("usernameInput");
        const userExists = await Database.findUserByNickname(nickname);
        const canChangeNickname = await Database.canDiscordIdChangeNickname(interaction.user.id);
        if(userExists) {
            await DiscordUtil.replyToInteraction(interaction, {
                content: "Esse nickname já está em uso. Tente novamente.",
                ephemeral: true
            });
        }else if(!canChangeNickname) {
            await DiscordUtil.replyToInteraction(interaction, {
                content: "Você já alterou seu nickname uma vez.",
                ephemeral: true
            });
        }else{
            await Database.updateNicknameByDiscordId(interaction.user.id, nickname);
            await DiscordUtil.setMemberNickname(interaction.member as GuildMember, nickname);
            await DiscordUtil.replyToInteraction(interaction, {
                content: "Nickname alterado!",
                ephemeral: true
            });
        }
    }

    private async onRequestRegisterModalCreation(info : Message) {
        const channel = info.channel;
        if(!channel.isSendable()) {
            console.log("error", "Can't send messages to this channel.");
            return;
        }
        await channel.send({
            embeds: [DiscordUtil.embeds.InviteToRegister()],
            components: [DiscordUtil.components.RegisterButton()]
        });
        await info.delete();
    }

    async onRequestRegisterModal(interaction : ButtonInteraction) {
        try {
            await interaction.showModal(DiscordUtil.modals.Register());
        }catch{
            console.log("[WARN] Couldn't show modal.")
        }
    }

    async onRegisterModalSubmit(interaction : ModalSubmitInteraction) {
        const nickname = interaction.fields.getTextInputValue("usernameInput");
        const userExists = await Database.findUserByNickname(nickname);
        if(userExists) {
            await DiscordUtil.replyToInteraction(interaction, {
                content: "Esse nickname já está em uso. Tente novamente.",
                ephemeral: true
            });
        }else{
            await this.handleNewAccount(nickname, interaction.user.id, interaction.member as GuildMember);
            await DiscordUtil.sendDMTo(interaction.user, {
                embeds: [
                    DiscordUtil.embeds.SuccessCreation(nickname)
                ]
            });
            await DiscordUtil.replyToInteraction(interaction, {
                content: "Registrado!",
                ephemeral: true
            });
        }
    }

    private async onConfirmAccountButton(interaction : ButtonInteraction) {
        const info = interaction.customId.substring(13);
        const [auth, conn] = info.split("&CONN=");
        const user = await Database.updateAuthByDiscordId(interaction.user.id, auth, conn);
        DiscordUtil.replyToInteraction(interaction, "Confirmado!");
        this.client.emit("customOnAuthUpdate", user);
    }


    private async onMemberJoin(member: GuildMember) {
        await this.giveRolesIfAccountExists(member);
    }

    private startListening() {
        this.client.once(Events.ClientReady, (info) => { this.onDiscordReady(info); })
        this.client.on(Events.MessageCreate, async (info) => {
            const member = info.member;
            if(!member?.roles.highest.permissions.has("Administrator")) return;
            if(info.content != "##createregistermodal") return;
            this.onRequestRegisterModalCreation(info);
        })
        this.client.on(Events.MessageCreate, async (info) => {
            const member = info.member;
            if(!member?.roles.highest.permissions.has("Administrator")) return;
            if(!info.content.startsWith("!ban")) return;
            const auth = info.content.split(" ")[1]; 
            const ip = info.content.split(" ")[2];
            if(!ip) return;
            if(!auth) return;
            await prisma.ban.create({ data: { auth, ip } });
            info.reply(`auth ${auth} e ip ${ip} banido.`);
            this.client.emit("onPlayerBan", auth, ip);

        })
        this.client.on(Events.MessageCreate, async (info) => {
            if(info.content != "!roominfo") return;
            this.client.emit("requestRoomInfo", info.channel.id, info.author.id);
        })
        this.client.on(Events.MessageCreate, async (info) => {
            const member = info.member;
            if(!member?.roles.highest.permissions.has("Administrator")) return;
            if(!info.content.startsWith("!unban")) return;
            const ipOrAuth = info.content.split(" ")[1]; 
            if(!ipOrAuth) return;
            await prisma.ban.deleteMany({
                where: {
                    OR: [
                        {
                            auth: ipOrAuth
                        },
                        {
                            ip: ipOrAuth
                        }
                    ]
                }
            });

        })
        this.client.on(Events.MessageCreate, async (info) => {
            const member = info.member;
            if(!member?.roles.highest.permissions.has("Administrator")) return;
            if(info.content != "##createaccountmodal") return;
            this.onRequestAccountModalCreation(info);
        })
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction.isButton()) return;
            if(interaction.customId != "register") return;
            this.onRequestRegisterModal(interaction);
        })
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction.isButton()) return;
            if(interaction.customId != "changeNickname") return;
            this.onRequestNicknameChange(interaction);
        })
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction.isModalSubmit()) return;
            if(interaction.customId != "registerModal") return;
            this.onRegisterModalSubmit(interaction);
        })
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction.isModalSubmit()) return;
            if(interaction.customId != "changeNickModal") return;
            this.onChangeNickModalSubmit(interaction);
        })
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if(!interaction.isButton()) return;
            if(!interaction.customId.startsWith("confirm-")) return;
            this.onConfirmAccountButton(interaction);
        })
        this.client.on(Events.GuildMemberAdd, async (member) => { this.onMemberJoin(member); })
    }
}