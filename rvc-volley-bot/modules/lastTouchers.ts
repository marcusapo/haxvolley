import { Event, Module, Player, Room } from "haxball-extended-room";

@Module export class ToucherModule {
    constructor(private $ : Room) {
        this.$.state.removeLastTouch = () => {
            const [last, ...rest] = this.$.state.touchers as number[] || [] 
            this.$.state.touchers = rest;
        }
    }

    addNewToucher(player : Player) {
        const touchers = this.$.state.touchers || [];
        this.$.state.touchers = [player, ...touchers];
    }

    addNewAbsToucher(player : Player) {
        const absTouchers = this.$.state.absTouchers || [];
        this.$.state.absTouchers = [player, ...absTouchers];
    }

    @Event onPlayerBallKick(player : Player) {
        this.addNewAbsToucher(player);
        if(this.$.state.touchPhase == "fastServeTouch") return;
        this.addNewToucher(player);
    }

    @Event onGameStart() {
        this.$.state.touchers = [];
        this.$.state.absTouchers = [];
    }
    @Event onPositionsReset() {
        this.$.state.touchers = [];
        this.$.state.absTouchers = [];
    }
}