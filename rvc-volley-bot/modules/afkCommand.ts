import { Colors, CommandExecInfo, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";

@Module export class AFKCommand {

    constructor(private $: Room) {}

    @ModuleCommand({
        aliases: ["afk", "aus"],
        deleteMessage: true
    })
    toggleAfkMode(command : CommandExecInfo) {
        const player = command.player;
        const currentMode = this.$.state.currentMapName;
        if(player.team != 0 && currentMode != "skill" || player.team == 1 && currentMode == "skill") {
            player.reply({ message: `[💤] Você não pode ficar AFK enquanto joga!`, color: Colors.IndianRed });
            return;
        }
        const afks = this.$.players.getAll(p => p.settings.afk);
        if(!player.settings.afk && afks.size >= 3) {
            player.reply({ message: `[💤] O limite de AFKs já foi atingido! Aguarde.`, color: Colors.IndianRed });
            return;
        } 
        player.settings.afk = !command.player.settings.afk;
        if(player.settings.afk) player.team = 0;
        if(!player.settings.afk) clearTimeout(player.settings.AfkCommandTimeout);
        if(player.settings.afk && !player.topRole?.admin) player.settings.AfkCommandTimeout = setTimeout(() => { player.kick("Você ficou muito tempo AFK."); }, 10 * 60 * 1000);
        this.$.send({ message: `[💤] ${player.name} ${player.settings.afk ? "está AFK e não pode ser movido" : "está de volta e pode ser movido."}!`, color: player.settings.afk ? Colors.IndianRed : Colors.LimeGreen });
    }

    @Event onPlayerTeamChange(changedPlayer : Player, byPlayer : Player | null) {
        if(!byPlayer) return;
        if(!changedPlayer.settings.afk) return;
        changedPlayer.team = 0;
        this.$.send({ message: `[💤] ${changedPlayer.name} está AFK!`, color: Colors.IndianRed });
    }
}