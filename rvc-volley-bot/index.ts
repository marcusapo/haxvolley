import { Room } from "haxball-extended-room";
import HaxballJS from "haxball.js";
import Settings from "./settings.json";
import { ballHeightModule } from "./modules/ballHeight";
import { MapManager } from "./modules/mapManager";
import { baseGameMode } from "./modules/baseGamemode";
import { ScoreModule } from "./modules/score";
import { ToucherModule } from "./modules/lastTouchers";
import { TouchPhaseModule } from "./modules/TouchPhase";
import { BasicCommands } from "./modules/basicCommands";
import { BetterChat } from "./modules/betterChat";
import { AvatarModule } from "./modules/avatarModule";
import { RoomState } from "./roomState";
import { AutoMoveModule } from "./modules/automoveModule";
import { AntiAfkSystem } from "./modules/afkDetection";
import { ClockDetector } from "./modules/clockTick";
import { AuthModule } from "./modules/authModule";
import { DiscordConnector } from "./discord/connector";
import { LoggerModule } from "./modules/loggerModule";
import { VoteBanModule } from "./modules/votebanModule";
import { pointModule } from "./modules/pointModule";
import { DisableAutoMove } from "./modules/disableAutoMove";
import { StatusCounter } from "./modules/statusCounter";
import { AFKCommand } from "./modules/afkCommand";
import { RecordingModule } from "./modules/recordingSystem";

function getEnvMode() {
  return process.argv[2];
}

function getToken() {
  return process.argv[3];
}

HaxballJS.then((HBInit) => {
  const envMode = getEnvMode();
  const token = getToken();
  if (!token) {
    console.log("[RVC] TOKEN não identificado.");
    return;
  }

  const room = new Room<RoomState>(
    {
      roomName: Settings.roomName,
      maxPlayers: Settings.maxPlayers,
      public: envMode == "dev" ? false : true,
      geo: Settings.geo,
      token,
    },
    HBInit as any,
  );

  room.state.devMode = envMode == "dev" ? true : false;

  const discord = new DiscordConnector(process.env.DISCORD_TOKEN || "");

  room.module(AvatarModule);
  room.module(ToucherModule);
  room.module(BasicCommands);
  room.module(TouchPhaseModule);
  room.module(ScoreModule);
  room.module(MapManager);
  room.module(ballHeightModule);
  room.module(baseGameMode);
  room.module(BetterChat);
  room.module(AutoMoveModule);
  room.module(AntiAfkSystem);
  room.module(ClockDetector);
  room.module(AuthModule as any, {
    settings: {
      discord
    }
  });
  room.module(LoggerModule);
  room.module(VoteBanModule);
  room.module(pointModule);
  room.module(DisableAutoMove);
  room.module(StatusCounter);
  room.module(AFKCommand);
  room.module(RecordingModule);

  room.setTeamColors(1, { angle: 60, textColor: 0xffffff, colors: [0xEAB91B, 0xD6A919, 0xC49B17] });
  room.setTeamColors(2, { angle: 60, textColor: 0xffffff, colors: [0x55EB1F, 0x4DD61C, 0x47C41A] });

  room.logging = false;
  room.onPlayerChat = () => false;
  room.onRoomLink = (link: String) => {
    console.log("[RVC] Sala aberta: " + link);
  };
});
