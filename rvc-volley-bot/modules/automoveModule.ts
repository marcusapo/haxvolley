import { Colors, CommandExecInfo, CustomEvent, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";
import { RoomState } from "../roomState";

@Module export class AutoMoveModule {
    private movingTeam = false;
    private pickMode = false;

    constructor(private $: Room<RoomState>) {
        this.updateTeams();
    }

    updateTeams() {
        if(this.movingTeam) return;
        if(this.pickMode) return;
        const allPlayers = this.$.players.getAll(p => !p.settings.afk && p.settings.playable);
        const red = allPlayers.getAll(p => p.team == 1).order(this.$);
        const blue = allPlayers.getAll(p => p.team == 2).order(this.$);
        const spec = allPlayers.getAll(p => p.team == 0).order(this.$);
        if(allPlayers.size == 1) {
            allPlayers.first().team = 1;
            this.$.start();
            return;
        }
        if(red.length == blue.length) {
            if(red.length == Settings.mapPlayers) {
                this.$.start();
                this.$.unpause();
                return;   
            }
            if(spec.length % 2 == 0) {
                for(let i = 0; i < spec.length; i++) {
                    const moveTo = (i % 2 == 0 ? 1 : 2);
                    spec[i].team = moveTo;
                } 
            }
            this.$.start();
            this.$.unpause();
            return;
        }
        const excessPlayers : Player[] = [];
        let excessNumber = 0;
        if(red.length > blue.length) {
            excessNumber = red.length - blue.length;
            for(let i = red.length-1; i >= red.length-excessNumber; i--) {
                excessPlayers.push(red[i]);
            }
        }else if(blue.length > red.length) {
            excessNumber = blue.length - red.length;
            for(let i = blue.length-1; i >= blue.length-excessNumber; i--) {
                excessPlayers.push(blue[i]);
            }
        }
        const moveList = [...spec, ...excessPlayers];
        if(moveList.length % 2 != 0 && spec.length == 0) {
            moveList[moveList.length-1].team = 0;
            moveList.splice(moveList.length-1, 1);
            if(moveList.length == 0) return;
        }
        const moveToTeam = red.length > blue.length ? 2 : 1;
        if(spec.length == 0) excessNumber /= 2;
        for(let i = 0; i < excessNumber; i++) moveList[i].team = moveToTeam;
    }

    updatePickList() {
        const pickers = this.$.players.getAll(p => p.settings.picking);
        for(const p of pickers) {
            for(let i = 0; i<5; i++) p.reply({message: ` `});
            p.reply({
                message: `[🫵] Como escolher:`,
                color: Colors.IndianRed,
                sound: 2,
                style: "bold"
            });
            p.reply({
                message: `[🧑‍🤝‍🧑] Se já tiver algum jogador em mente, digite @ e marque o jogador que deseja selecionar utilizando as setinhas e TAB. Ex: @jogador_pro`,
                color: Colors.IndianRed,
                sound: 2,
                style: "bold"
            });
            p.reply({
                message: `[🔁] Para escolher de acordo com a fila, digite (número de cima para baixo). Ex: 1`,
                color: Colors.IndianRed,
                sound: 2,
                style: "bold"
            });
            p.reply({
                message: `[💥] Caso queira escolher aleatoriamente ou automaticamente, digite auto ou random. Ex: auto`,
                color: Colors.IndianRed,
                sound: 2,
                style: "bold"
            });
        }
    }

    setPicker(team : 1 | 2, index : number) {
        const teamPlayers = this.$.players.getAll(p => p.team == team).order(this.$);
        const pickerPlayer = teamPlayers[index];
        if(!pickerPlayer) return;
        if(pickerPlayer.settings.picking) return;
        pickerPlayer.settings.picking = true;
        this.$.send({
            message: `[🫵] ${pickerPlayer.name} tem 20 segundos para escolher um jogador para o seu time.`,
            color: Colors.IndianRed,
            sound: 1,
            style: "bold"
        });
        pickerPlayer.settings.pickingTimeout = setTimeout(() => {
            pickerPlayer.reply({ message: `[⚠️] Metade do tempo já se passou! Escolha logo.`, color: Colors.IndianRed, sound: 2 });
            pickerPlayer.settings.pickingTimeout = setTimeout(() => {
              pickerPlayer.reply({ message: `[⚠️] Você tem 5 segundos! Caso não saiba quem escolher, digite auto.`, color: Colors.IndianRed, sound: 2 });
              pickerPlayer.settings.pickingTimeout = setTimeout(() => {
                pickerPlayer.kick("Você não escolheu a tempo");
              }, 5000);
            }, 5000);
        }, 10000);
        this.$.customEvents.emit("onPlayerStartPicking", pickerPlayer);
        this.updatePickList();
    }

    updatePickers(ignoreRed : boolean = false, ignoreBlue : boolean = false) {
        const players = this.$.players.getAll(p => !p.settings.afk && p.settings.playable);
        const red = players.getAll(p => p.team == 1).order(this.$);
        const blue = players.getAll(p => p.team == 2).order(this.$);
        const spec = players.getAll(p => p.team == 0).order(this.$);
        if(red.length < Settings.mapPlayers && !ignoreRed) {
            //Util.log("log", "Vermelho inCompleto");
            if(red.length < Settings.minAutoPlayers) {
                for(let i = 0; i < Settings.minAutoPlayers - red.length; i++) {
                    spec[i].team = 1;
                    red.push(spec[i]);
                    spec.splice(i, 1);
                }
            }
            this.setPicker(1, 0);
        }
        if(blue.length < Settings.mapPlayers && !ignoreBlue) {
            //Util.log("log", "Azul inCompleto");
            if(blue.length < Settings.minAutoPlayers) {
                for(let i = 0; i < Settings.minAutoPlayers - blue.length; i++) {
                    spec[i].team = 2;
                    blue.push(spec[i]);
                    spec.splice(i, 1);
                }
            }
            this.setPicker(2, 0);
        }
    }

    startPickMode() {
        const players = this.$.players.getAll(p => !p.settings.afk && p.settings.playable);
        const red = players.getAll(p => p.team == 1).order(this.$);
        const blue = players.getAll(p => p.team == 2).order(this.$);
        if(red.length == blue.length && red.length == Settings.mapPlayers) {
            //Util.log("log", "Times Completos");
            this.endPickMode();
            this.$.start();
            this.$.unpause();
            return;
        }
        const scores = this.$.scores;
        let ignoreRed = false;
        let ignoreBlue = false;
        /* if(scores) {
            const timeReimaing = Math.trunc(scores.timeLimit) - Math.trunc(scores.time);
            if(scores.time > 30 && red.length < Settings.maxPlayers && scores.red < scores.blue && timeReimaing <= 30) ignoreRed = true;
            if(scores.time > 30 && blue.length < Settings.maxPlayers && scores.red > scores.blue && timeReimaing <= 30) ignoreBlue = true;
        }
        if(red.length == Settings.maxPlayers) ignoreRed = true;
        if(blue.length == Settings.maxPlayers) ignoreBlue = true;
        if(ignoreRed && ignoreBlue) {
            this.endPickMode();
            this.$.start();
            return;
        } */
        this.$.pause();
        this.pickMode = true;
        this.updatePickers(ignoreRed, ignoreBlue);
    }

    endPickMode() {
        const pickers = this.$.players.getAll(p => p.settings.picking);
        pickers.values().forEach(p => { clearTimeout(p.settings.pickingTimeout); p.settings.picking = false } );
        this.pickMode = false;
    }

    @CustomEvent onPlayerAuth() {
      setTimeout(() => { this.updateTeams(); }, 100)
    }
    @Event onPlayerLeave(player : Player) {
        const players = this.$.players.getAll(p => !p.settings.afk && p.settings.playable);
        if(players.size < (Settings.mapPlayers*2+2)) {
            this.endPickMode();
            setTimeout(() => { this.updateTeams(); }, 100)
        }else{
            if(this.pickMode && player.settings.picking) this.updatePickers()
            else {
                setTimeout(() => {
                    this.startPickMode();
                }, 50); 
            }
        }
    }
    @Event onPlayerKicked() {
        this.updateTeams();
    }
    @CustomEvent onTeamVictory(redScore : number, blueScore : number) {
        const blueTeam = this.$.players.blue().values();
        const redTeam = this.$.players.red().values();
        const specTeam = this.$.players.spectators().getAll(p => !p.settings.afk && p.settings.playable).order(this.$);
        const playersLength = this.$.players.getAll(p => !p.settings.afk && p.settings.playable).size;
        this.movingTeam = true;
        setTimeout(() => {
            this.$.stop();
            if(redScore > blueScore) {
                blueTeam.forEach(p => p.team = 0);
                this.$.customEvents.emit("onRedStreak");
            }else{
                redTeam.forEach(p => p.team = 0);
                blueTeam.forEach(p => { p.settings.noLossPosition = true; p.team = 1 } );
                this.$.customEvents.emit("onRedLoseStreak");
            }
            if(playersLength < Settings.mapPlayers*2+2) {
                const loserTeam = redScore < blueScore ? redTeam : blueTeam;
                const winnerTeam = redScore < blueScore ? blueTeam : redTeam;
                [...specTeam, ...loserTeam].forEach((p : Player, i : number) => { if(i < winnerTeam.length) p.team = 2;});
                this.$.start();
            }else{
                specTeam.forEach((p : Player, i : number) => { if(i <= 2) p.team = 2;});
                setTimeout(() => { this.startPickMode(); }, 200);
            }
            this.movingTeam = false;
        }, 200)
    }

    @Event onPlayerTeamChange(changed : Player) {
        clearTimeout(changed.settings.pickingTimeout); 
        changed.settings.picking = false
    }

    @Event onPlayerChat(player : Player, message : string) {
        if(!player.settings.picking) return;
        let pickedPlayer = null;
        message = message.trim();
        if(message.startsWith("@")) {
            pickedPlayer = this.$.players.getAll(p => p.name.toLowerCase().replace(/ /g, "_") == message.substring(1).toLowerCase()).first();
            if(!pickedPlayer) {
                player.reply({ message: `Não identifiquei quem você marcou. Verifique se você usou o @ corretamente.`, color: Colors.IndianRed });
                player.reply({ message: `Você pode pickar por: @, #, número de fila, auto ou random`, color: Colors.IndianRed });
                return;
            }
        }
        if(message.startsWith("#")) {
            const id = Number(message.substring(1))
            if(!Number.isNaN(id)) pickedPlayer = this.$.players[id];
            if(!pickedPlayer) {
                player.reply({ message: `Não identifiquei quem você marcou. Verifique se você usou o # corretamente.`, color: Colors.IndianRed });
                player.reply({ message: `Você pode pickar por: @, #, número de fila, auto ou random`, color: Colors.IndianRed });
                return;
            }
        }
        if(Number(message)) {
            const index = Number(message);
            const spec = this.$.players.spectators().order(this.$);
            pickedPlayer = spec[index-1];
            if(!pickedPlayer) {
                player.reply({ message: `Parece que você contou errado. Digite um número entre 1 e ${spec.length}.`, color: Colors.IndianRed });
                player.reply({ message: `Você pode pickar por: @, #, número de fila, auto ou random`, color: Colors.IndianRed });
                return;
            }
        }
        if(message.toLowerCase() == "auto") {
            pickedPlayer = this.$.players.spectators().getAll(p => !p.settings.afk && p.settings.playable).first();
        }
        if(message.toLowerCase() == "random") {
            const specs = this.$.players.spectators().getAll(p => !p.settings.afk && p.settings.playable).values();
            const randomNumber = Math.trunc(Math.random() * (specs.length-1));
            pickedPlayer = specs[randomNumber];
        }
        if(!pickedPlayer) {
            player.reply({ message: `Não consegui identificar sua forma de pick.`, color: Colors.IndianRed });
            player.reply({ message: `Você pode pickar por: @, #, número de fila, auto ou random`, color: Colors.IndianRed });
            return;
        }
        if(pickedPlayer.team != 0) {
            player.reply({ message: `[🛑] ${pickedPlayer.name} já tem um time.`, color: Colors.IndianRed, style: "bold" });
            return;
        }
        if(pickedPlayer.settings.afk || !pickedPlayer.settings.playable) {
            player.reply({ message: `[🛑] ${pickedPlayer.name} está AFK e não pode ser escolhido.`, color: Colors.IndianRed, style: "bold" });
            return;
        }
        pickedPlayer.team = player.team;
        this.$.send({ message: `[🫵] ${player.name} escolheu ${pickedPlayer.name}.`, color: Colors.IndianRed, style: "bold" });
        player.settings.picking = false;
        clearTimeout(player.settings.pickingTimeout);
        setTimeout(() => { this.startPickMode(); }, 100);
    }

    @ModuleCommand({
        aliases: ["endpick"]
    })
    manualEndPick(command : CommandExecInfo) {
        if(!command.player.admin) return;
        const pickers = this.$.players.getAll(p => p.settings.picking);
        pickers.values().forEach(p => { clearTimeout(p.settings.pickingTimeout); p.settings.picking = false } );
        command.player.reply({ message: `Pick encerrado manualmente.` })
    }
}