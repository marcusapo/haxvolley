import {
  CommandExecInfo,
  CustomEvent,
  Event,
  Module,
  Room,
} from "haxball-extended-room";
import Settings from "../settings.json";
import { RoomState } from "../roomState";

export type BallChangeT = {
  type: "up" | "down";
  increaseRate: number;
  height: number;
};

@Module
export class ballHeightModule {
  private currentBallChange: BallChangeT | null = null;
  private counting = false;
  private ballCountdown = 0;
  private baseBallRadius = 0;

  constructor(private $: Room<RoomState>) {
    this.$.state.setBallChange = (change: BallChangeT) => {
      if (!this.counting) return;
      this.baseBallRadius = this.$.ball.radius || 0;
      this.currentBallChange = change;
      this.ballCountdown = 0;
    };
  }

  isBallInFinalHeight(ballRadius: number, finalHeight: number) {
    return ballRadius - this.baseBallRadius >= finalHeight;
  }

  @Event onGameTick() {
    if (!this.currentBallChange) return;
    const ball = this.$.ball;
    if (!ball.radius) return;

    if (
      (this.currentBallChange.type == "up" &&
        this.isBallInFinalHeight(ball.radius, this.currentBallChange.height)) ||
      (this.currentBallChange.type == "down" &&
        ball.radius <= this.currentBallChange.height) ||
      (this.currentBallChange.type == "up" &&
        ball.radius >= Settings.gameMode.maxBallRadius)
    ) {
      const count = this.$.state.ignoreBallCount ? 15 : 30;
      if (this.ballCountdown < count) {
        this.ballCountdown++;
        return;
      }
      this.ballCountdown = 0;
      ball.radius =
        (this.currentBallChange.type == "up" && ball.radius) ||
        this.currentBallChange.height;
      const info = { ...this.currentBallChange };
      this.currentBallChange = null;
      this.$.customEvents.emit("onBallHeightEnd", info);
      return;
    }

    this.ballCountdown = 0;
    const coeff = this.currentBallChange.type == "down" ? -1 : 1;
    let newBallRadius =
      ball.radius + this.currentBallChange.increaseRate * coeff;
    if (newBallRadius > Settings.gameMode.maxBallRadius)
      newBallRadius = Settings.gameMode.maxBallRadius;
    ball.radius = newBallRadius;
  }

  @CustomEvent onBallHeightEnd(info: BallChangeT) {
    if (info.type == "down") return;
    this.currentBallChange = {
      type: "down",
      increaseRate: Settings.gameMode.defaultDownRate,
      height: Settings.mapSettings[this.$.state.currentMap!].ballRadius,
    };
  }

  @CustomEvent onBallChangeSide() {
    if (!this.currentBallChange) return;
    if (this.currentBallChange.type == "up") return;
    const ball = this.$.ball;
    if (!ball || !ball.radius) return;
    if (ball.radius >= 7.5) return;
    this.$.state.setBallChange!({
      type: "up",
      increaseRate: this.currentBallChange.increaseRate,
      height: 0.1,
    });
  }

  @Event onGameStart() {
    this.currentBallChange = null;
    this.counting = true;
  }
  @Event onTeamGoal() {
    this.currentBallChange = null;
    this.counting = false;
  }
  @Event onPositionsReset() {
    this.currentBallChange = null;
    this.counting = true;
  }
}
