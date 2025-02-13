import { Colors, CommandExecInfo, CustomEvent, Event, Module, ModuleCommand, Player, Room } from "haxball-extended-room";
import { DiscordUtil } from "../discord/utils";
import Settings from "../settings.json";

@Module export class RecordingModule {

    private recording : boolean = false;

    constructor(private $: Room) {}

    pad(number : number) {
        return number < 10 ? "0"+number : ""+number;
    }

    @Event onGameStart() {
        if(this.recording) this.$.stopRecording();
        this.$.startRecording();
        this.recording = true;
    }

    @CustomEvent async onTeamVictory(redScore : number, blueScore : number, players : Player[]) {
        const recording = this.$.stopRecording();
        if(!recording) return;
        const file = Buffer.from(recording);

        const recordMsg = `🔴 VERMELHO ${redScore} x ${blueScore} AZUL 🔵\n\n
        🔴 Time vermelho\n
        ${players.filter(p => p.team == 1).map(p => p.name).join("\n")}\n\n
        🔵 Time azul
        ${players.filter(p => p.team == 2).map(p => p.name).join("\n")}`;

        const date = new Date();
        const dateFormatted = `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}-${this.pad(date.getDate())}-${this.pad(date.getMonth())}-${date.getFullYear()}`;
        const name = dateFormatted+".hbr2";

        await DiscordUtil.uploadFileToChannel(Settings.discordRecordingChannel, file, name, recordMsg);
    }
    
}