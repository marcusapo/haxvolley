import { Colors, CustomEvent, Event, Module, ModuleSettings, Player, Room } from "haxball-extended-room";
import { Database } from "../database/database";
import { getRoleByName, Roles } from "./roles";
import { DiscordConnector } from "../discord/connector";
import { User } from "@prisma/client";
import { DiscordUtil } from "../discord/utils";
import Settings from "../settings.json";
import { prisma } from "../database/prisma";

@Module export class AuthModule {
    private discord : DiscordConnector;

    constructor(private $: Room, private settings: ModuleSettings) {
        this.discord = this.settings.discord as DiscordConnector;
        this.customListener();
    }

    private customListener() {
        this.discord.client.on("customOnAuthUpdate", (user : User) => {
            const players = this.$.players.getAll(p => p.auth === user.auth);
            for(const p of players) {
                clearTimeout(p.settings.deadInterval);
                p.settings.playable = true;
                this.$.customEvents.emit("onPlayerAuth", p, user);
            }
        });
        this.discord.client.on("onPlayerBan", (auth : string, ip : string) => {
            const players = this.$.players.getAll(p => p.auth === auth || p.ip == ip);
            for(const p of players) {
                p.ban();
            }
        });
        this.discord.client.on("customOnAccountCreated", (nickname : string) => {
            const players = this.$.players.getAll(p => p.name === nickname);
            for(const p of players) {
                this.checkPlayerAuthentication(p);
            }
        });
        this.discord.client.on("requestRoomInfo", async (channelId : string, authorId : string) => {
            const players = this.$.players.values();
            const msg = `Requisitado por <@${authorId}>\n
            🔴 Time vermelho\n
            ${players.filter(p => p.team == 1).map(p => p.name).join("\n")} 
            \n\n⚪ Espectadores\n
            ${players.filter(p => p.team == 0).map(p => p.name).join("\n")} 
            \n\n🔵 Time azul
            ${players.filter(p => p.team == 2).map(p => p.name).join("\n")}`;
            await DiscordUtil.sendMessageInChannel(channelId, msg);
        });
    }

    async checkPlayerAuthentication(player : Player) {
        const registredPlayer = await Database.findUserByNickname(player.name);
        if(!registredPlayer) {
            player.settings.playable = true;
            this.$.customEvents.emit("onPlayerAuth", (player), null);
            return;
        }
        if(player.auth != registredPlayer.auth) {
            player.settings.deadInterval = setTimeout(() => {
                player.kick("Conta não confirmada.");
            }, 30000);
            this.sendAuthVerification(player, registredPlayer);
            return;
        }
        player.settings.playable = true;
        this.$.customEvents.emit("onPlayerAuth", (player), registredPlayer);
    }

    censorIP(ip : string) {
        const parts = ip.split(".");
        return parts
        .map((part : string, index : number) => 
            (index === 0 || index === parts.length - 1 ? part : part.replace(/\d/g, "\\*")))
        .join(".");
    }

    private async sendAuthVerification(player : Player, register : User) {
        const dm = await DiscordUtil.sendDMTo(register.discordId, {
            embeds: [DiscordUtil.embeds.Confirmation(register.nickname, player.auth || "null", this.censorIP(player.ip))],
            components: [DiscordUtil.components.ConfirmationButton(player.auth || "null", player.conn)]
        });
        if(dm) {
            player.reply({ 
                message: `[✅] Enviamos um pedido de verificação na sua DM do Discord. Confirme.`,
                color: Colors.LightGoldenRodYellow
            });
        }else{
            player.reply({ 
                message: `[😢] Não foi possível contatar a sua conta do Discord. Clique na foto do servidor > Privacidade > Mensagens diretas.`, 
                color: Colors.IndianRed
            });
        }
    }

    @CustomEvent async onPlayerAuth(player : Player, account : User | null) {
        player.settings.account = account;
        player.settings.playable = true;
        if(account) {
            const isInServer = await DiscordUtil.isUserInServer(account.discordId);
            if(!isInServer) {
                player.kick("Entre no Discord da HR: " + Settings.discordLink);
            }
            player.addRole(Roles.RegistredRole);
            const integratedRoles = Settings.discordIntegrationRoles;
            for(const r of Object.keys(integratedRoles)) {
                const role = integratedRoles[(r as keyof typeof integratedRoles)];
                const hasRole = await DiscordUtil.hasRole(account.discordId, role);
                if(hasRole) {
                    const roleObject = getRoleByName(r) 
                    if(roleObject !== null) player.addRole(roleObject);
                    if(roleObject?.admin) player.admin = true;
                }
            }
            player.reply({ 
                message: `[👋] Fala, ${player.name}! É um prazer te receber aqui novamente.`,
                color: Colors.LightGoldenRodYellow
            })
        }else{
            player.reply({ message: `[🙋‍♂️] Bem-vindo, ${player.name}! Conheça mais sobre a HaxVolley: ${Settings.discordLink}`, color: Colors.Orange });
            player.reply({ message: `[🙋‍♂️] Caso não conheça o modo, digite !ajuda para um tutorial básico.`, color: Colors.Orange });
            player.reply({ message: `[🙋‍♂️] Se registre em nosso !discord`, color: Colors.Orange });
        
        }
    }

    @Event onPlayerTeamChange(changedPlayer: Player, byPlayer : Player | null) {
        if(!changedPlayer.settings.playable && byPlayer) { 
            changedPlayer.team = 0;
            this.$.send({ 
                message: `[❌] ${changedPlayer.name} não pode jogar no momento.`,
                color: Colors.LightGoldenRodYellow
            })
        }
    }

    async checkForBan(player : Player) {
        const isBan = await prisma.ban.findFirst({
            where: {
                OR: [
                    {ip: player.ip},
                    {auth: player.auth || ""}
                ]
            }
        })
        if(isBan) player.ban();
    }

    @Event onPlayerJoin(player : Player) {
        this.checkForBan(player);

        player.settings.playable = false;
        const equalAuth = this.$.players.getAll(p => p.auth == player.auth && p.id != player.id);
        if(equalAuth.size > 0 && !this.$.state.devMode) {
            equalAuth.kick("Você reentrou na sala.");
        }else{
            const equalName = this.$.players.getAll(p => p.name == player.name && p.id != player.id);
            if(equalName.size > 0) return player.kick("Nome já está sendo utilizado.");
        }
        this.checkPlayerAuthentication(player);
    }
}