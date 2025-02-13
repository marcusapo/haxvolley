import { Event, Module, Player, Room } from "haxball-extended-room";
import { RoomState } from "../roomState";

@Module export class AvatarModule {
    constructor(private $ : Room<RoomState>) {
        this.$.state.setAvatar = this.setAvatar;
    }

    setAvatar(player : Player, avatar : string, priority : boolean = false) {
        if(player.settings.priority) return;
        player.setAvatar(avatar);
        if(player.settings.avatarTimeout) clearTimeout(player.settings.avatarTimeout);
        player.settings.priority = priority;
        player.settings.avatarTimeout = setTimeout(() => {
            player.clearAvatar();
            player.settings.avatarTimeout = null;
            player.settings.priorityAvatar = false;
        }, 1000);
    }

    @Event onPlayerBallKick(player : Player) {
        if(this.$.state.touchPhase == "serveReception") {
            this.setAvatar(player, "😂");
        }else if(this.$.state.touchPhase == "fastServeTouch") {
            this.setAvatar(player, "🙌");
        }else if(this.$.state.touchPhase == "fastServe") {
            const av = player.team == 1 ? "🤜" : "🤛";
            this.setAvatar(player, av);
        }else if(this.$.state.touchPhase == "serve") {
            const av = player.team == 1 ? "🤜" : "🤛";
            this.setAvatar(player, av);
        }else if(this.$.state.touchPhase == "reception") {
            this.setAvatar(player, "1");
        }else if(this.$.state.touchPhase == "levant") {
            this.setAvatar(player, "2");
        }else if(this.$.state.touchPhase == "attack") {
            const av = player.team == 1 ? "🤜" : "🤛";
            this.setAvatar(player, av);
        }
    }
}