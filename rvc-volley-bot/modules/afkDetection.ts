import { Colors, CustomEvent, Event, Module, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";

@Module export class AntiAfkSystem {
    constructor(private $: Room) {}
    
    @CustomEvent onClockTick() {
        if(Settings.afkTimeLimit == 0) return;
        let teams = this.$.players.teams();
        if(teams.size <= 2) return;

        if(this.$.state.disableAfkDetectionForBlue) teams = this.$.players.red();
        for(const p of teams) {
            if(!p.settings.afkTime) p.settings.afkTime = 0;
            p.settings.afkTime++;
            if(p.settings.afkTime == Math.trunc(Settings.afkTimeLimit/2)) p.reply({
                message: `[💤] Ei, ${p.name}! Você está por aí? Dê algum sinal de vida.`,
                sound: 2,
                style: "bold",
                color: Colors.LightYellow
            })
            if(p.settings.afkTime >= Settings.afkTimeLimit) p.kick("Você ficou AFK durante a jogatina.");
        }
    }
    @Event onPlayerTeamChange(changedPlayer : Player) {
        changedPlayer.settings.afkTime = 0;
    }
    @Event onPlayerActivity(player : Player) {
        player.settings.afkTime = 0;
    }
}