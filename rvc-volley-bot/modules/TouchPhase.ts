import {
  CommandExecInfo,
  Event,
  Module,
  ModuleCommand,
  Player,
  Room,
} from "haxball-extended-room";
import Settings from "../settings.json";
import { RoomState } from "../roomState";

const phases = Settings.gameMode.phases;

export type TPhases = keyof typeof phases["volleyx3"];

@Module
export class TouchPhaseModule {
  constructor(private $: Room<RoomState>) {
    this.$.state.setTouchPhase = (
      phase: TPhases,
      player?: Player,
    ) => {
      const ball = this.$.ball;
      ball.invMass = phases[this.$.state.currentMap!][phase].invMass;
      const color = phases[this.$.state.currentMap!][phase].color;
      if(color) ball.color = parseInt(color, 16)
      else ball.color = parseInt(Settings.defaultBallColor, 16);
      this.$.state.touchPhase = phase;
      this.$.customEvents.emit("onTouchPhaseChange", phase, player);
    };
  }
  @Event onPositionsReset() {
    this.$.discs[1].xspeed = 0;
    this.$.discs[1].x = 0;
  }

  @Event onPlayerBallKick() {
    const touchPhase = this.$.state.touchPhase!;
    const increaseRate = phases[this.$.state.currentMap!][touchPhase].increaseRate;
    const height = phases[this.$.state.currentMap!][touchPhase].height;
    this.$.state.setBallChange!({ type: "up", increaseRate, height });
  }
}
