import {
  Colors,
  CommandExecInfo,
  CustomEvent,
  Disc,
  Event,
  Module,
  ModuleCommand,
  Player,
  Room,
} from "haxball-extended-room";
import Settings from "../settings.json";
import { BallChangeT } from "./ballHeight";
import { RoomState } from "../roomState";

const positionsMode = Settings.gameMode.positions;

@Module
export class baseGameMode {
  private currentPossession: 1 | 2 = 1;

  private redRotation: number = 0;
  private blueRotation: number = 0;

  private ballNetCollision: boolean = false;

  private ignoreDoubleTouch: boolean = false;

  private saqueTimeout : number | null = null;

  private currentServer: Player | null = null;

  private lastScore: 1 | 2 = 1;
  private lastSide: 1 | 2 = 1;

  constructor(private $: Room<RoomState>) {}

  getServer(team: Player[], score: number): Player {
    const index = score % team.length;
    return team[index];
  }

  // [0, 1, 2, 3, 4, 5]
  getListOrderWithRotation(team: Player[], rotation: number): Player[] {
    if (rotation == 0) return team;
    const indexStart = rotation % team.length;
    const newTeam = [];
    let finishedList = false;
    for (let i = indexStart; i < team.length + 1; i++) {
      if (i == team.length) {
        i = 0;
        finishedList = true;
      }
      if (i == indexStart && finishedList) break;
      newTeam.push(team[i]);
    }
    return newTeam;
  }

  getLastToucherTeam(): 1 | 2 {
    const touchers = this.$.state.absTouchers as Player[];
    let team: 1 | 2 = 1;
    if (touchers[0] && touchers[0].team == 1) team = 2;
    return team;
  }

  startServe() {
    const team = this.$.players
      .getAll((p) => p.team == this.currentPossession)
      .order(this.$);
    const p = this.getServer(
      team,
      this.currentPossession == 1 ? this.redRotation : this.blueRotation,
    );

    this.$.state.setTouchPhase!("serve", p);

    const randomizer = Math.round(Math.random() * 2 - 1);

    const ball = this.$.ball;
    ball.radius = Settings.mapSettings[this.$.state.currentMap!].ballRadius + 0.1;
    ball.x =
      Settings.gameMode.servePosition[this.$.state.currentMap!].ball.x *
      (this.currentPossession == 2 ? -1 : 1);
    ball.y = (Settings.gameMode.servePosition[this.$.state.currentMap!].ball.y * randomizer || 1);

    if (team.length == 0) {
      if (this.currentPossession == 1) return;
      console.log("[RVC] Empty team detected. Restarting game...");
      this.$.stop();
      this.$.start();
      return;
    }

    const cf =
      this.currentPossession == 1
        ? this.$.CollisionFlags.c1
        : this.$.CollisionFlags.c2;
    team.forEach((p) => {
      if (p.cGroup == undefined || p.cGroup == null) return;
      p.cGroup = p.cGroup | cf;
    });

    const server = this.getServer(
      team,
      this.currentPossession == 1 ? this.redRotation : this.blueRotation,
    );
    server.x =
      Settings.gameMode.servePosition[this.$.state.currentMap!].player.x *
      (this.currentPossession == 2 ? -1 : 1);
    server.y = (Settings.gameMode.servePosition[this.$.state.currentMap!].player.y * randomizer || 1);
    this.$.send({
      message: `[🤾] Saque de ${server.name}.`,
      color: Colors.AquaMarine,
    });
    this.saqueTimeout = 20;
    this.currentServer = server;
    this.lastSide = this.currentPossession;
  }

  scoreTo(team: 1 | 2, reason: string, force : boolean = false) {
    if (!this.$.state.ballInGame && !force) return;
    this.$.state.ballInGame = false;
    this.$.send({
      message: `[🏐] ${reason}. Ponto do ${team == 1 ? "vermelho" : "azul"}.`,
      color: Colors.AquaMarine,
    });
    this.$.state.scorePoint(team);
  }

  positionPlayers() {
    const red = this.$.players.red().order(this.$);
    const blue = this.$.players.blue().order(this.$);
    const redOrder = this.getListOrderWithRotation(red, this.redRotation);
    const blueOrder = this.getListOrderWithRotation(blue, this.blueRotation);
    for (let i = 0; i < redOrder.length; i++) {
      const order = (redOrder.length + "") as keyof typeof positionsMode;
      if (!redOrder[i] || !positionsMode[order]) continue;
      redOrder[i].x = positionsMode[order][i][0];
      redOrder[i].y = positionsMode[order][i][1];
    }
    for (let i = 0; i < blueOrder.length; i++) {
      const order = (blueOrder.length + "") as keyof typeof positionsMode;
      if (!blueOrder[i] || !positionsMode[order]) continue;
      blueOrder[i].x = positionsMode[order][i][0] * -1;
      blueOrder[i].y = positionsMode[order][i][1];
    }
  }

  distanceBetween(d1 : Disc, d2 : Disc) {
    if(!d1.x || !d1.y || !d2.x || !d2.y) return null;
    return Math.sqrt(Math.pow((d1.x-d2.x), 2) + Math.pow((d1.y-d2.y), 2));
  }

  @Event onGameTick() {
    if (!this.$.state.ballInGame) return;
    const ball = this.$.ball;
    if (!ball || !ball.radius || !ball.x || !ball.y) return;

    // if(ball.radius < Settings.mapSettings.ballRadius+0.1) {
    //     this.ballNetCollision = true;
    //     ball.cGroup = this.$.CollisionFlags.ball | this.$.CollisionFlags.kick;
    // }else{
    //     this.ballNetCollision = false;
    //     ball.cGroup = this.$.CollisionFlags.kick;
    // }

    // if(ball.cGroup !== null && ball.cGroup !== undefined) {
    //     if(ball.radius > Settings.gameMode.intouchableBallHeight) {
    //         ball.cGroup = ball.cGroup & ~this.$.CollisionFlags.kick;
    //     }else{
    //         ball.cGroup = ball.cGroup | this.$.CollisionFlags.kick;
    //     }
    // }

    // const touchingNet = this.$.players.values().find(p => p.x && p.x >= -15.1 && p.x <= 15.1);
    // if(touchingNet) {
    //     const scoreTo = touchingNet.team == 1 ? 2 : 1;
    //     this.scoreTo(scoreTo, `${touchingNet.name} encostou na rede`);
    // }

    let ballTouchingAntenna = false;
    const dist1 = this.distanceBetween(ball, this.$.discs[2])
    const dist2 = this.distanceBetween(ball, this.$.discs[3])
    if (dist1 && dist1 < Settings.mapSettings[this.$.state.currentMap!].ballRadius)
      ballTouchingAntenna = true;
    if (dist2 && dist2 < Settings.mapSettings[this.$.state.currentMap!].ballRadius)
      ballTouchingAntenna = true;
    if (ballTouchingAntenna) {
      const team = this.getLastToucherTeam();
      this.scoreTo(team, `Bola encostou na antena`);
    }

    const mapY = Settings.mapSettings[this.$.state.currentMap!].mapY;

    const ballSide = ball.x > 0 ? 2 : 1;
    if (ballSide != this.lastSide) {
      if (ball.y < -mapY || ball.y > mapY) {
        const team = this.getLastToucherTeam();
        this.scoreTo(team, `Bola passou por fora`);
      } else {
        this.$.customEvents.emit("onBallChangeSide", ballSide);
      }
    }
    this.lastSide = ballSide;
  }

  setBlockTouch(player: Player) {
    if(this.$.state.firstTouch) return;
    this.$.state.removeLastTouch();
    const ball = this.$.ball;
    this.$.state.setAvatar!(player, "🚫", true);
    if (ball.yspeed) ball.yspeed /= 2;
    return;
  }

  @Event onGameStart() {
    this.$.state.ballInGame = false;
    this.$.state.lastTeamTouch = 1;
    this.$.state.firstTouch = false;
    this.redRotation = 0;
    this.blueRotation = 0;
    this.currentPossession = 1;
    this.lastScore = 1;
    this.lastSide = 1;
    const players = this.$.players.teams();
    this.ignoreDoubleTouch = players.size <= 3 ? true : false;
    this.positionPlayers();
    this.startServe();
    if(this.$.ball.xspeed !== undefined) this.$.ball.xspeed = 0.000001;
  }
  @Event onGameStop() {
    this.currentServer = null;
  }
  @Event onPositionsReset() {
    this.$.discs[4].x = 0;
    this.$.discs[4].y = 2000;
    this.$.state.ballInGame = false;
    this.positionPlayers();
    this.startServe();
    if(this.$.ball.xspeed !== undefined) this.$.ball.xspeed = 0.000001;
  }
  @Event onTeamGoal(team: 1 | 2) {
    this.currentPossession = team;
    if (this.lastScore != team) {
      if (team == 1) this.redRotation++;
      if (team == 2) this.blueRotation++;
    }
    this.lastScore = team;
  }
  @Event onPlayerBallKick(player: Player) {
    if (this.$.state.touchPhase == "block"
      && player.x 
      && player.x > -20
      && player.x < 20
    ) this.setBlockTouch(player);


    if(this.$.state.touchPhase == "levantFast") {
      this.$.state.ignoreBallCount = true;
    }else{
      this.$.state.ignoreBallCount = false;
    }

    if(this.$.state.touchPhase == "fastServeCurve") {
      const playerY = player.y || 0;
      const ballY = this.$.ball.y || 0;
      const curveLevel = playerY - ballY;
      setTimeout(() => {
        this.$.ball.ygravity = curveLevel * 0.015;
      }, 200);
      setTimeout(() => { if(this.$.ball) this.$.ball.ygravity = 0; }, 600)
    }

    if (this.$.state.touchPhase == "serveReception") {
      const lastTouchers = this.$.state.touchers;
      const team = lastTouchers[0].team == 1 ? 2 : 1;
      this.scoreTo(team, player.name + " encostou durante o saque");
    } else if (this.$.state.touchPhase == "fastServeTouch") {
      this.$.state.setTouchPhase!("fastServeCurve", player);
      this.$.state.ballInGame = true;
      this.saqueTimeout = null;
      this.$.state.firstTouch = true;
    } else if (this.$.state.touchPhase == "fastServe" || this.$.state.touchPhase == "fastServeCurve") {
      this.currentServer = null;
      this.$.state.setTouchPhase!("serveReception", player);
      const team = this.$.players.getAll(
        (p) => p.team == this.currentPossession,
      );
      const cf =
        this.currentPossession == 1
          ? this.$.CollisionFlags.c1
          : this.$.CollisionFlags.c2;
      team.values().forEach((p) => {
        if (p.cGroup === null || p.cGroup === undefined) return;
        p.cGroup = p.cGroup & ~cf;
      });
    } else if (this.$.state.touchPhase == "serve") {
      this.$.state.setTouchPhase!("serveReception", player);
      this.$.state.ballInGame = true;
      this.$.state.firstTouch = true;
      this.saqueTimeout = null;
      this.currentServer = null;
      const team = this.$.players.getAll(
        (p) => p.team == this.currentPossession,
      );
      const cf =
        this.currentPossession == 1
          ? this.$.CollisionFlags.c1
          : this.$.CollisionFlags.c2;
      team.values().forEach((p) => {
        if (p.cGroup === null || p.cGroup === undefined) return;
        p.cGroup = p.cGroup & ~cf;
      });
    } else if (this.$.state.touchPhase == "reception") {
      this.$.state.firstTouch = false;
      this.$.state.setTouchPhase!("levantFast", player);
    } else if (this.$.state.touchPhase == "levant" || this.$.state.touchPhase == "levantFast") {
      this.$.customEvents.emit("onPlayerLevant", player);
      if(player.team != this.$.state.lastTeamTouch) {
        this.$.state.setTouchPhase!("reception");
      }else{
        this.$.state.setTouchPhase!("attack", player);
      }
    } else if (this.$.state.touchPhase == "attack") {
      this.$.customEvents.emit("onPlayerCorte", player);
      if(player.team != this.$.state.lastTeamTouch) {
        this.$.state.setTouchPhase!("reception");
      }else{
        this.$.state.setTouchPhase!("block");
      }
    }else if (this.$.state.touchPhase == "block") {
      this.$.customEvents.emit("onPlayerBlock", player);
      this.$.state.setTouchPhase!("receptionBlock");
    }else if (this.$.state.touchPhase == "receptionBlock") {
      this.$.state.setTouchPhase!("levant");
    }

    this.$.state.lastTeamTouch = player.team;

    const lastTouchers = this.$.state.touchers;
    const absTouchers = this.$.state.absTouchers;
    if (!lastTouchers) return;
    if (
      lastTouchers[1] &&
      lastTouchers[1].id == lastTouchers[0].id &&
      absTouchers[1] &&
      absTouchers[1].id == absTouchers[0].id &&
      !this.ignoreDoubleTouch
    ) {
      const team = lastTouchers[1].team == 1 ? 2 : 1;
      this.scoreTo(team, "Toque duplo");
    } else if (
      lastTouchers[3] &&
      lastTouchers[0].team == lastTouchers[1].team &&
      lastTouchers[1].team == lastTouchers[2].team &&
      lastTouchers[2].team == lastTouchers[3].team &&
      absTouchers[3] &&
      absTouchers[0].team == absTouchers[1].team &&
      absTouchers[1].team == absTouchers[2].team &&
      absTouchers[2].team == absTouchers[3].team
    ) {
      const team = lastTouchers[0].team == 1 ? 2 : 1;
      this.scoreTo(team, "Mais de 3 toques");
    }
  }

  @CustomEvent onBallChangeSide() {
    if(this.$.state.touchPhase == "receptionBlock") {
      this.$.state.setBallChange!({ height: 8, increaseRate: 0.3, type: "up" });
    }
    this.$.state.setTouchPhase!("reception");
  }

  @CustomEvent onClockTick() {
    if(this.saqueTimeout === null) return;
    if(!this.currentServer) {
      this.saqueTimeout = null;
      return;
    }
    this.saqueTimeout--;
    if(this.saqueTimeout == 10) {
      this.$.send({ message: `[🤾] ${this.currentServer.name} tem 10 segundos para sacar.`, color: Colors.AquaMarine });
    }else if(this.saqueTimeout == 0) {
      const team = this.currentPossession == 1 ? 2 : 1;
      this.scoreTo(team, `${this.currentServer.name} demorou para sacar`, true);
      this.saqueTimeout = null;
    }
  }

  @Event onPlayerLeave(player: Player) {
    if (this.$.state.ballInGame) return;
    if (this.currentServer && this.currentServer.id == player.id) {
      this.startServe();
    }
  }
  @Event onPlayerTeamChange(changed: Player) {
    if (this.$.state.ballInGame) return;
    if (this.currentServer && this.currentServer.id == changed.id) {
      this.startServe();
    }
  }

  @ModuleCommand({
    aliases: ["sa"],
    deleteMessage: true,
  })
  setToHighServe(command: CommandExecInfo) {
    if (this.$.state.ballInGame) return;
    if (!this.currentServer || this.currentServer.id != command.player.id)
      return;
    if (this.$.state.touchPhase == "fastServeTouch") return;
    const player = command.player;
    const ball = this.$.ball;
    if (!ball) return;

    const randomizer = Math.round(Math.random() * 2 - 1);

    player.x =
      Settings.gameMode.servePosition[this.$.state.currentMap!].fastPlayer.x *
      (player.team == 2 ? -1 : 1);

    player.y = (Settings.gameMode.servePosition[this.$.state.currentMap!].fastPlayer.y * randomizer || 1);

    ball.x =
      Settings.gameMode.servePosition[this.$.state.currentMap!].fastBall.x * (player.team == 2 ? -1 : 1);
    ball.y = (Settings.gameMode.servePosition[this.$.state.currentMap!].fastBall.y * randomizer || 1);

    this.$.state.setTouchPhase!("fastServeTouch", player);

    this.$.send({
      message: `[🤾‍♂️] ${command.player.name} ativou o saque alto.`,
      color: Colors.AquaMarine,
    });
  }

  @CustomEvent onBallHeightEnd(info: BallChangeT) {
    if(info.type == "up" && this.$.state.touchPhase == "levantFast") {
      this.$.state.setTouchPhase!("levant");
    }else if(info.type == "up" && this.$.state.touchPhase == "fastServeCurve") {
      this.$.state.setTouchPhase!("fastServe");
    }

    if (info.type != "down") return;
    const ball = this.$.ball;
    if (!ball || !ball.x || !ball.y) return;

    const map = this.$.state.currentMap!;
    const mapX = Settings.mapSettings[map].mapX + 5;
    const mapY = Settings.mapSettings[map].mapY + 5;

    if (ball.x > -mapX && ball.x < mapX && ball.y > -mapY && ball.y < mapY) {
      if (ball.x > 0) {
        this.scoreTo(1, "Bola caiu na quadra do azul");
      } else {
        this.scoreTo(2, "Bola caiu na quadra do vermelho");
      }
    } else {
      const team = this.getLastToucherTeam();
      this.scoreTo(team, "Bola caiu fora da quadra");
    }
    this.$.discs[4].x = ball.x;
    this.$.discs[4].y = ball.y;
    if (ball.xspeed) ball.xspeed /= 4;
    if (ball.yspeed) ball.yspeed /= 4;

    this.$.state.ballInGame = false;
  }
}
