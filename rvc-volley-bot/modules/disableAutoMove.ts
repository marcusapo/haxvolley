import {
    CommandExecInfo,
    CustomEvent,
    Event,
    Module,
    ModuleCommand,
    Room,
} from "haxball-extended-room";
import Settings from "../settings.json";
import { RoomState } from "../roomState";
import { Roles } from "./roles";
import { AutoMoveModule } from "./automoveModule";
  
@Module
export class DisableAutoMove {

    private disabled : boolean = false;

    constructor(private $ : Room<RoomState>) {}

    @ModuleCommand({
        aliases: ["disablemove"],
        roles: [Roles.DeveloperRole]
    })
    disableMove(command : CommandExecInfo) {
        if(this.disabled) {
            this.$.module(AutoMoveModule);
        }else{
            this.$.removeModule(AutoMoveModule);
        }
        this.disabled = !this.disabled;
        command.player.reply({ message: `${this.disabled ? "desativado" : "ativado"}` });
    }

}
  