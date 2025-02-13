import { Colors, CommandExecInfo, CustomEvent, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";
import { RoomState } from "../roomState";

@Module export class VoteBanModule {

    private currentBanning : Player | null = null;
    private yesPlayers : Player[] = [];
    private noPlayers : Player[] = [];

    private banList : string[] = [];

    constructor(private $: Room<RoomState>) {}

    finishVotation() {
        this.currentBanning = null;
        this.yesPlayers = [];
        this.noPlayers = [];
    }

    @Event onPlayerJoin(player : Player) {
        if(this.banList.includes(player.conn)) player.ban("Fugiu do voteban");
    }

    @Event onPlayerLeave(player : Player) {
        if(!this.currentBanning) return;
        const registredLen = this.$.players.getAll(p => p.settings.account && p.settings.playable);
        if(player.id == this.currentBanning.id 
            && this.yesPlayers.length > this.noPlayers.length
        && this.yesPlayers.length > registredLen.size / 3) {
            this.banList.push(player.conn);
        }
        if(player.id == this.currentBanning.id) {
            this.finishVotation();
        }
    }

    @ModuleCommand({
        aliases: ["sim"],
        deleteMessage: true
    })
    voteSimCommand(command : CommandExecInfo) {
        if(!this.currentBanning) return;
        if(this.yesPlayers.map(p => p.id).includes(command.player.id)
        || this.noPlayers.map(p => p.id).includes(command.player.id)) {
            command.player.reply({ message: "Você já votou!" });
            return;
        }
        this.yesPlayers.push(command.player);
        command.player.reply({message: `Você votou a favor de banir ${this.currentBanning.name}.`});
    }

    @ModuleCommand({
        aliases: ["nao"],
        deleteMessage: true
    })
    voteNaoCommand(command : CommandExecInfo) {
        if(!this.currentBanning) return;
        if(this.yesPlayers.map(p => p.id).includes(command.player.id)
        || this.noPlayers.map(p => p.id).includes(command.player.id)) {
            command.player.reply({ message: "Você já votou!" });
            return;
        }
        this.noPlayers.push(command.player);
        command.player.reply({message: `Você votou contra banir ${this.currentBanning.name}.`});
    }

    @ModuleCommand({
        aliases: ["voteban"],
        deleteMessage: true
    })
    voteBanCommand(command : CommandExecInfo) {
        if(!command.player.settings.account) return;
        if(!command.arguments[0]) {
            command.player.reply({ message: `Utilize !voteban #id`, color: Colors.BlueViolet })
            return;
        }
        if(this.currentBanning) {
            command.player.reply({ message: `${this.currentBanning.name} já está sendo julgado atualmente.`, color: Colors.BlueViolet })
            return;
        }
        const registredLen = this.$.players.getAll(p => p.settings.account && p.settings.playable);
        if(registredLen.size <= 3) {
            command.player.reply({ message: `É necessário ter mais de 4 registrados na sala para isso.`, color: Colors.BlueViolet })
            return;
        }
        const pId = command.arguments[0].toString().substring(1);
        const playerToBan = this.$.players[Number(pId)];
        if(!playerToBan) {
            command.player.reply({ message: `Não encontrei ninguém com esse ID.`, color: Colors.BlueViolet })
            return;
        }
        if(playerToBan.settings.account) {
            command.player.reply({ message: `Um jogador registrado não pode ser banido. Faça uma denúncia no Discord.`, color: Colors.BlueViolet })
            return;
        }
        this.yesPlayers = [command.player];
        this.noPlayers = [];
        this.currentBanning = playerToBan;
        this.$.send({ 
            message: `[👨‍⚖️] ${command.player.name} abriu um processo de ban contra ${playerToBan.name}. Registrados, digitem !sim para concordar ou !nao para discordar.`,
            color: Colors.AliceBlue
        });
        setTimeout(() => {
            if(!this.currentBanning) {
                this.finishVotation();
                return;
            }
            if(this.yesPlayers.length < this.noPlayers.length) {
                this.finishVotation();
                return;
            }
            const registredLen = this.$.players.getAll(p => p.settings.account && p.settings.playable);
            if(this.yesPlayers.length > registredLen.size / 2) {
                this.currentBanning.ban("Voteban");
            }
        }, 60 * 1000);
    }
}