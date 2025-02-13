import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Guild, GuildBasedChannel, GuildMember, Interaction, InteractionReplyOptions, MessageCreateOptions, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import Settings from "../settings.json";

export class DiscordUtil {
    static client : Client | null;
    static embeds = {
        InviteToRegister: () => {
            return new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle('Escolha seu nickname')
            .setDescription(`Seu nickname será utilizado para proteger seu nickname na sala da HaxVolley.`)
        },
        ChangeNickname: () => {
            return new EmbedBuilder()
            .setColor(0xffffff)
            .setTitle('Mude seu apelido')
            .setDescription(`Seu apelido pode ser alterado apenas UMA vez. Tenha cuidado ao usar essa função.`)
        },
        Confirmation: (nickname: string, auth: string, ip: string) => {
            return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Verificação de conta')
            .setDescription(`Ei, ${nickname}! Parece que um IP desconhecido tentou acessar a sua conta. É você? Caso não seja, ignore esta mensagem.`)
            .addFields(
                { name: 'AUTH', value: `${auth}` },
                { name: 'IP', value: `${ip}` },
            )
            .setTimestamp()
            .setFooter({ 
                text: 'Haxvolley', 
                iconURL: 'https://cdn.discordapp.com/icons/1160576492401590334/b735599632fc12346e098ad60d89979a.png' 
            });
        },
        SuccessCreation: (nickname: string) => {
            return new EmbedBuilder()
            .setColor(0x34d513)
            .setTitle(`Boa, ${nickname}!`)
            .setDescription(`Nickname registrado com sucesso.`)
        }
    }
    static components = {
        ConfirmationButton: (auth: string, conn: string) => {
            const buttonComponent = new ButtonBuilder()
            .setCustomId(`confirm-AUTH=${auth}&CONN=${conn}`)
            .setLabel('Confirmar')
            .setStyle(ButtonStyle.Success); 
            return new ActionRowBuilder<ButtonBuilder>().addComponents(buttonComponent);
        },
        RegisterButton: () => {
            const buttonComponent = new ButtonBuilder()
            .setCustomId('register')
            .setLabel('Registrar')
            .setStyle(ButtonStyle.Success); 
            return new ActionRowBuilder<ButtonBuilder>().addComponents(buttonComponent);
        },
        ChangeNicknameButton: () => {
            const buttonComponent = new ButtonBuilder()
            .setCustomId('changeNickname')
            .setLabel('Alterar')
            .setStyle(ButtonStyle.Danger); 
            return new ActionRowBuilder<ButtonBuilder>().addComponents(buttonComponent);
        },
        RegisterModalInputsRow: () => {
            const usernameInput = new TextInputBuilder()
            .setCustomId('usernameInput')
            .setLabel("Digite o seu nickname no Haxball:")
            .setMinLength(3)
            .setRequired(true)
            .setMaxLength(25)
            .setStyle(TextInputStyle.Short);
            return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(usernameInput);
        },
        ChangeNickModalInputsRow: () => {
            const usernameInput = new TextInputBuilder()
            .setCustomId('usernameInput')
            .setLabel("Digite o seu novo nickname:")
            .setMinLength(3)
            .setRequired(true)
            .setMaxLength(25)
            .setStyle(TextInputStyle.Short);
            return new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(usernameInput);
        }
    }
    static modals = {
        Register: () => {
            return new ModalBuilder()
            .setCustomId("registerModal")
            .setTitle("Registro na HaxVolley")
            .addComponents(DiscordUtil.components.RegisterModalInputsRow());
        },
        ChangeNick: () => {
            return new ModalBuilder()
            .setCustomId("changeNickModal")
            .setTitle("Alterar seu nickname na CIRS")
            .addComponents(DiscordUtil.components.ChangeNickModalInputsRow());
        }
    }

    static async giveRoleTo(member: GuildMember, roleId: string) {
        try {
            await member.roles.add(roleId);
        } catch {
            console.log("log", `Couldn't give role ${roleId} to ${member.user.displayName}`);
        }
    }

    static async getGuild(guildId : string) {
        const guild = DiscordUtil.client?.guilds.cache.get(guildId);
        if(!guild) console.log("log", `Discord Guild not found.`);
        return guild || null;
    }

    static async getDefaultGuild() {
        return this.getGuild(Settings.discordGuildId);
    }

    static async getMember(guild : Guild, memberId : string) {
        try {
            const member = await guild.members.fetch(memberId);
            return member;
        }catch { return null; }
    }

    static async hasRole(userId: string, roleId: string) {
        const guild = await this.getDefaultGuild();
        if(!guild) return false;
        const member = await this.getMember(guild, userId);
        if(!member) return false;
        return member.roles.cache.has(roleId);
    }

    static async isUserInServer(userId : string) {
        const user = await this.getUserByDiscordId(userId);
        if(!user) return false;
        return true;
    }

    static async uploadFileToChannel(channelId: string, file: Buffer, name: string, description: string) {
        const channel = await DiscordUtil.getChannelById(channelId);
        if(!channel?.isSendable()) return;
        const att = new AttachmentBuilder(file)
        .setName(name);
        await channel.send({
            content: description,
            files: [att]
        })
    }

    static async setMemberNickname(member: GuildMember, nickname: string) {
        try {
            await member.setNickname(nickname);
        } catch {
            console.log("log", `Couldn't change ${member.user.displayName}'s nickname to ${nickname}.`);
        }
    }

    static async getUserByDiscordId(discordId: string) {
        try {
            return await DiscordUtil.client?.users.fetch(discordId) || null;
        }catch { return null; }
    }

    static async sendDMTo(user: string | User | null, message: MessageCreateOptions) {
        if(typeof user === "string") user = await this.getUserByDiscordId(user);
        if(!user) return false;
        try {
            await user.send(message);
            return true;
        } catch {
            console.log("log", `Couldn't send DM to ${user.username}`);
            return false;
        }
    }

    static async getChannelById(channelId : string) {
        const guild = await this.getDefaultGuild();
        return guild?.channels.cache.get(channelId) || null;
    }

    static async sendMessageInChannel(channel: GuildBasedChannel | string | null, message: string) {
        if(typeof channel === "string") channel = await DiscordUtil.getChannelById(channel);
        if(!channel) {
            console.log("log", `Channel not found.`);
            return;
        }
        if(channel.isSendable()) channel.send(message);
    }

    static async replyToInteraction(interaction : Interaction, reply : InteractionReplyOptions | string) {
        if(!interaction.isRepliable()) return;
        try {
            await interaction.reply(reply);
        } catch {
            return;
        }
    } 
}