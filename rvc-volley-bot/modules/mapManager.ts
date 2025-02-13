import { Event, Module, Player, Room } from "haxball-extended-room";
import path from "path";
import * as fs from "fs";
import { RoomState } from "../roomState";

@Module
export class MapManager {
  constructor(private $: Room<RoomState>) {
    this.changeMapTo("volleyx3");
  }

  private async getJsonFromMap(
    filename: string,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      try {
        const mapsFolder = path.resolve(__dirname, "../maps");
        const filePath = path.join(mapsFolder, filename);
        fs.readFile(filePath, (err, data) => {
          if (err) reject(err);
          if (!data) return reject("Couldn't find file.");
          const fileContent = data.toString() || "";
          const finalMapContent = fileContent.replace(
            /\/\*[\s\S]*?\*\/|\/\/.*/g,
            "",
          );
          try {
            const content = JSON.parse(finalMapContent);
            resolve(content);
          } catch (e) {
            reject("Couldn't read file.");
            return e;
          }
        });
      } catch (e) {
        reject("Couldn't read file.");
        return e;
      }
    });
  }

  private checkMap() {
    const players = this.$.players;
    if (players.size >= 1) {
      this.changeMapTo("volleyx6");
    } else {
      this.changeMapTo("volleyx3");
    }
  }

  @Event onPlayerJoin() {
    setTimeout(() => {
      this.checkMap();
    }, 50);
  }

  @Event onPlayerLeave() {
    setTimeout(() => {
      this.checkMap();
    }, 50);
  }

  private changeMapTo(mapName: "volleyx3" | "volleyx6") {
    if (this.$.state.currentMap == mapName) return;
    this.$.state.currentMap = mapName;
    this.$.stop();
    this.$.setScoreLimit(0);
    this.$.setTimeLimit(0);
    this.$.lockTeams();
    this.getJsonFromMap(mapName + ".json").then((stadium) => {
      this.$.stop();
      this.$.setStadium(stadium);
      this.$.start();
    });
  }

  @Event onStadiumChange(stadiumName: string, player: Player | null) {
    if (!player) return;
    if (!player.topRole?.admin) this.changeMapTo(this.$.state.currentMap!);
  }
}
