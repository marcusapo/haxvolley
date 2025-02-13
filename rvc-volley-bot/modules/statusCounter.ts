import { Colors, CommandExecInfo, CustomEvent, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import { prisma } from "../database/prisma";
import { Roles } from "./roles";
import { Status } from "@prisma/client";

type StatusT = {
    cortes?: number;
    levants?: number;
    blocks?: number;
    wins?: number;
    loses?: number;
}

@Module export class StatusCounter {

    private counting : boolean = false;
    private streak : number = 0;

    private matchStatus : {[key: string]: StatusT} = {}
    private StatusCache : {[key: number]: Status} = {}

    constructor(private $: Room) {}

    private addStatus(player : Player, name : keyof StatusT, increase : number = 1) {
        const discordId = player.settings.account?.discordId;
        if(!discordId) return;
        if(!this.matchStatus[discordId]) this.matchStatus[discordId] = {};
        if(!this.matchStatus[discordId][name]) this.matchStatus[discordId][name] = 0;
        this.matchStatus[discordId][name] += increase;
    }

    private async savematchStatus() {
        for(const discordId of Object.keys(this.matchStatus)) {
            const status = this.matchStatus[discordId];
            const previousStatus = await prisma.status.findFirst({ where: { discordId } });
            if(!previousStatus) {
                await prisma.status.create({
                    data: {
                        discordId,
                        ...status
                    }
                });
                continue;
            }
            const dataUpdate : {[key: string]: {increment?: number, set?: number}} = {};
            if(!status || !Object.keys(status)) continue;
            for(const element of Object.keys(status)) {
                dataUpdate[element] = {
                    increment: Number(status[(element as keyof StatusT)]) || 0
                }
            }
            await prisma.status.update({
                where: { id: previousStatus.id },
                data: dataUpdate
            })
        }

        this.clearmatchStatus();
    }
    private clearmatchStatus() { this.matchStatus = {}; }

    setStatusAvatar(player : Player, avatar : string) {
        player.setAvatar(avatar);
        clearTimeout(player.settings.statusAvatarTimeout);
        player.settings.statusAvatarTimeout = setTimeout(() => {
            player.clearAvatar();
        }, 1000);
    }

    @CustomEvent onPlayerCorte(player : Player) {
        if(!this.counting) return;
        this.addStatus(player, "cortes");
    }

    @CustomEvent onPlayerLevant(player : Player) {
        if(!this.counting) return;
        this.addStatus(player, "levants");
    }

    @CustomEvent onPlayerBlock(player : Player) {
        if(!this.counting) return;
        this.addStatus(player, "blocks");
    }

    @Event onGameStart() { 
        this.counting = true; 
        this.matchStatus = {};
    }
    @Event onPositionsReset() { this.counting = true; }
    @Event onStadiumChange() { this.streak = 0; this.matchStatus = {}; }

    @CustomEvent async onTeamVictory() {
        //if(this.$.state.currentMap == "volleyx3") {
        //    this.matchStatus = {};
         //   return;
        //}
        const scores = this.$.scores;
        if(scores) {
            const redScore = scores.red;
            const blueScore = scores.blue;
            const winnerTeam = (redScore > blueScore) ? 1 : 2;
            const winner = this.$.players.teams().values().filter(p => p.team == winnerTeam);
            const looser = this.$.players.teams().values().filter(p => p.team != winnerTeam);
            for(const p of winner) { this.addStatus(p, "wins") }
            for(const p of looser) { this.addStatus(p, "loses") }
        }
        await this.savematchStatus();
        this.StatusCache = {};
    }

    @ModuleCommand({
        aliases: ["status"],
        roles: [Roles.RegistredRole]
    })
    async sendStatusToPlayer(command : CommandExecInfo) {
        if(!command.player.settings.account) return;

        const playerStatus = this.StatusCache[command.player.id];
        let status : Status | null = null;
        if(!status) {
            status = await prisma.status.findFirst({ where: { discordId: command.player.settings.account.discordId } });
            if(status) this.StatusCache[command.player.id] = status;
        }

        const cortes = status?.cortes || 0;
        const levants = status?.levants || 0;
        const blocks = status?.blocks || 0;
        const wins = status?.wins || 0;
        const loses = status?.loses || 0;

        this.$.send({
            message: `📊 Estatísticas de ${command.player.name}:`,
            color: Colors.White,
            sound: 1,
        });
        this.$.send({
            message: `⚽ Cortes: ${cortes} | 🏌️ Levantamentos: ${levants} | 🤡 Bloqueios: ${blocks}`,
            color: Colors.GreenYellow,
            sound: 0
        });
        this.$.send({
            message: `✅ Vitórias: ${wins} | ❌ Derrotas: ${loses} | 🥅 Partidas: ${wins+loses}`,
            color: Colors.GreenYellow,
            sound: 0
        });
    }

}