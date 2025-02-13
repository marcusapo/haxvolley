import { Player } from "haxball-extended-room";
import Settings from "./settings.json";
import { BallChangeT } from "./modules/ballHeight";
import { TPhases } from "./modules/TouchPhase";

export interface RoomState {
    touchPhase: keyof typeof Settings.gameMode.phases["volleyx3"];
    setAvatar: (player : Player, avatar : string, priority? : boolean) => void;
    setBallChange: (change : BallChangeT) => void;
    currentMap: "volleyx6" | "volleyx3";
    firstTouch: boolean;
    ballInGame: boolean;
    lastTeamTouch: number;
    setTouchPhase: (phase: TPhases, player?: Player) => void;
}