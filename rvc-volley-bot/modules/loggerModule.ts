import { Colors, CustomEvent, Event, Module, Player, Room } from "haxball-extended-room";
import Settings from "../settings.json";
import { DiscordUtil } from "../discord/utils";
import { User } from "@prisma/client";

@Module export class LoggerModule {
    constructor(private $: Room) {}
    
    chatLogTimeout : null | NodeJS.Timeout = null;
    messageCache : string = "";

    @CustomEvent onPlayerAuth(player : Player, account : User) {
        DiscordUtil.sendMessageInChannel(Settings.discordJoinLog, `'\n\`${player.name}\` (${account ? `<@${account.discordId}>` : ""}) entrou.\n\`AUTH\`: \`${player.auth || ""}\`\n\`IP\`: \`${player.ip || ""}\``);
    }

    @Event onPlayerChat(player : Player, message : string) {
        const addMsg = `\`${player.name}\`: \`${message}\`\n`
        const newCache = this.messageCache + addMsg;
        if(newCache.length > 1999) {
            DiscordUtil.sendMessageInChannel(Settings.discordChatLog, this.messageCache);
            this.messageCache = addMsg;
            this.chatLogTimeout = null;
        }else{
            this.messageCache = newCache;
        }
        if(!this.chatLogTimeout) {
            this.chatLogTimeout = setTimeout(() => {
                if(this.messageCache.length > 1 && this.messageCache.length < 1999) {
                    DiscordUtil.sendMessageInChannel(Settings.discordChatLog, this.messageCache);
                    this.messageCache = "";
                }
                this.chatLogTimeout = null;
            }, 30 * 1000);
        }
    }
}