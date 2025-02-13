import { Colors, CommandExecInfo, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";

@Module export class BetterChat {
    private chatoff : boolean = false;

    constructor(private $ : Room) {}

    private getMentionedPlayers(message : string) {
        const mentionedTexts = message.trim().split(" ").filter(m => m.startsWith("@"));
        const mentionedPlayers = [];
        for(const mention of mentionedTexts) {
            for(const p of this.$.players) {
                if(p.name.replace(/ /g, "_") == mention.substring(1)) mentionedPlayers.push(p)
            }
        }
        return mentionedPlayers;
    }

    @Event onPlayerJoin(player : Player) {
        for(const text of Settings.ultraBlackWordsList) {
            if(player.name.includes(text)) {
                player.ban();
                return;
            }
        }
    }

    private teamMessage(player: Player, message: string) {
        let emoji = "🔴";
        let color = Colors.IndianRed;
        if(player.team == 2) {
            emoji = "🔵";
            color = Colors.LightSkyBlue;
        }else if(player.team == 0){
            emoji = "○";
            color = Colors.WhiteSmoke;
        }
        const members = this.$.players.getAll(p => p.team == player.team);
        members.reply({
            message: `[${emoji}] ${player.name}: ${message.substring(1).trimStart()}`,
            color,
            sound: 2
        })
    }

    @Event onPlayerChat(player : Player, message : string) {
        if(message.startsWith("!")) return;
        if(player.settings.picking) return;
        if(player.settings.playable !== true) return;

        if(player.settings.delayTimeout) {
            player.reply({ message: `[🛑] Você está falando rápido demais!`, color: Colors.Red });
            if(!player.settings.account) {
                player.reply({ message: `[🛑] Para falar mais rápido, se registre no !discord`, color: Colors.Red });
            }
            return;
        }

        if(player.settings.muted) {
            player.reply({ message: `[🛑] Você está mutado!`, color: Colors.Red })
            return;
        }

        const analyzeMsg = message
        .replace(/0/g, "o")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/1/g, "i")
        .toLowerCase();
        for(const text of Settings.ultraBlackWordsList) {
            if(analyzeMsg.includes(text)) {
                player.ban();
                return;
            }
        }
        for(const text of Settings.blackWordsList) { 
            if(analyzeMsg.includes(text)) {
                if(!player.settings.toxicWarn) player.settings.toxicWarn = 0
                else if(player.settings.toxicWarn == 2) {
                    player.settings.muted = true;
                    setTimeout(() => { if(player.settings) player.settings.muted = false }, 2 * 60 * 1000)
                    this.$.send({ message: `[😠] ${player.name} foi mutado 2 minutos por toxicidade.`, color: Colors.Red });
                    return;
                }else if(player.settings.toxicWarn == 3) {
                    player.ban("Tóxico");
                    return;
                }
                player.reply({ message: `[😠] Cuidado com as palavras, ${player.name}! Você recebeu um aviso. [1/2]`, color: Colors.Red });
                player.settings.toxicWarn++;
                return;
            } 
        }

        if(message.startsWith("t ") || message.startsWith(";")) {
            this.teamMessage(player, message);
            return;
        }

        if(this.chatoff && !player.admin) return;

        const mentionedPlayers = this.getMentionedPlayers(message);

        const topRole = player.topRole;
        const emoji = topRole?.prefix || "❌";
        const color = topRole?.color || 0x7d7d7d;

        for(const p of this.$.players) {
            const wasMentioned = !!mentionedPlayers.find(pl => pl.id == p.id);
            p.reply({
                message: `[${emoji}] ${player.name}: ${message.trim()}`,
                color,
                sound: wasMentioned ? 2 : 1,
                style: wasMentioned ? "bold" : "normal"
            });
        }
        if(player.topRole?.settings.delay === 0) return;
        const pDelay = (player.topRole?.settings.delay || 10) * 1000;
        player.settings.delayTimeout = setTimeout(() => {
            player.settings.delayTimeout = null;
        }, pDelay)
    }

    @ModuleCommand({
        aliases: ["chatoff"],
        deleteMessage: true
    })
    chatOffCommand(command : CommandExecInfo) {
        if(!command.player.admin) return;
        this.chatoff = !this.chatoff;
        this.$.send({ message: `[🔇] Chat ${this.chatoff ? "des":""}ativado por ${command.player.name}`, color: Colors.Orange });
    }
}