import { Event, Module, Room } from "haxball-extended-room";

@Module export class ScoreModule {
    constructor(private $ : Room) {
        this.$.state.scorePoint = (team : 1 | 2) => {
            if(team == 1) {
                this.$.discs[1].xspeed = -5;
            }else{
                this.$.discs[1].xspeed = 5;
            }
        }
    }
    @Event onTeamGoal() { this.$.discs[1].xspeed = 0; this.$.discs[1].x = 0; }
    @Event onPositionsReset() { this.$.discs[1].xspeed = 0; this.$.discs[1].x = 0; }
}