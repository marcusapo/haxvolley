import { Colors, CommandExecInfo, CustomEvent, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";
import { Roles } from "./roles";

@Module export class pointModule {
    maxScore : number = 12;
    redScore : number = 0;
    blueScore : number = 0;

    constructor(private $: Room) {}
    
    @Event onGameStart() {
        this.$.send({ message: `[🏐] Jogo vai até ${this.maxScore} pontos.`, color: Colors.AquaMarine });
        this.redScore = 0;
        this.blueScore = 0;
    }

    @Event onTeamGoal(team : number) {
        if(team == 1) this.redScore++
        else this.blueScore++;
        this.$.send({ message: `[🏐] PLACAR: 🔴 RED ${this.redScore} x ${this.blueScore} BLUE 🔵`, color: Colors.AquaMarine });
    
    }

    @Event onPositionsReset() {
        if(this.redScore >= this.maxScore || this.blueScore >= this.maxScore) {
            const diff = Math.abs(this.redScore - this.blueScore);
            if(diff >= 2) {
                this.$.stop();
                const winner = this.redScore > this.blueScore ? 1 : 2;
                this.$.customEvents.emit("onTeamVictory", this.redScore, this.blueScore, this.$.players.values());
                this.$.send({ message: `[🏐] VITÓRIA DO TIME ${winner == 1 ? "VERMELHO" : "AZUL"}`, color: Colors.AquaMarine });
            }else {
                const higherScore = this.redScore > this.blueScore ? this.redScore : this.blueScore;
                const newValue = higherScore + (2-diff);
                this.$.send({ message: `[🏐] QUEM MARCAR ${newValue} PONTOS VENCE.`, color: Colors.AquaMarine });
            }
        }
    }

    @ModuleCommand({
        aliases: ["setlimit"],
        roles: [Roles.DeveloperRole]
    })
    setLimitCommand(command : CommandExecInfo) {
        if(!command.arguments[0] || !command.arguments[0].number) {
            command.player.reply({ message: `!setlimit (numero)` });
            return;
        }

        this.maxScore = Number(command.arguments[0]);

        this.$.send({ message: `[🏐] ${command.player.name} alterou o score limit para ${this.maxScore}.`, color: Colors.AliceBlue });
    }

    @ModuleCommand({
        aliases: ["setscore"],
        roles: [Roles.DeveloperRole]
    })
    setScoreCommand(command : CommandExecInfo) {
        if(!command.arguments[1] || !command.arguments[0].number || !command.arguments[1].number) {
            command.player.reply({ message: `!setscore (numero) (numero)` });
            return;
        }

        this.redScore = Number(command.arguments[0]);
        this.blueScore = Number(command.arguments[1]);

        this.$.send({ message: `[🏐] ${command.player.name} alterou o placar para 🔴 RED ${this.redScore} x ${this.blueScore} AZUL 🔵`, color: Colors.AliceBlue });
    }
}