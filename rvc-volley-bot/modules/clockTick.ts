import { Event, Module, Room } from "haxball-extended-room";

@Module export class ClockDetector {
    private lastTime : number = 0;
    constructor(private $: Room) {}

    @Event onGameTick() {
        const time = Math.trunc(this.$.scores?.time) || 0;
        if(time != this.lastTime) {
            this.$.customEvents.emit('onClockTick', time);
            this.lastTime = time;
        }
    }

    @Event onGameStart() {
        this.lastTime = 0;
    }
}