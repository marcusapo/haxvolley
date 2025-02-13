import { prisma } from "./prisma";

export class Database {

    static getSanitizedName(nickname : string) {
        return nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().toLowerCase();
    }
    static getUnsanitizedName(nickname : string) {
        return nickname.replace(/\\([.*+?^${}()|[\]\\])/g, '$1').trim().toLowerCase();
    }

    static async findUserByNickname(nickname : string) {
        try {
            return await prisma.user.findFirst({
                where: {
                    name: this.getSanitizedName(nickname)
                }
            })
        }catch(e) {
            console.log(`Error in database; Username: "${nickname}"`);
            console.log(e);
            return null;
        }
    }

    static async findUserByDiscordId(discordId : string) {
        return await prisma.user.findFirst({
            where: {
                discordId
            }
        })
    }

    static async createNewAccount(nickname : string, discordId : string) {
        return await prisma.user.create({
            data: {
                nickname: nickname.trim(),
                name: this.getSanitizedName(nickname),
                discordId
            }
        })
    }

    static async updateAuthByDiscordId(discordId : string, auth : string, conn : string) {
        try {
            return await prisma.user.update({
                where: {
                    discordId
                },
                data: {
                    auth,
                    conn
                }
            })
        }catch(e) {
            console.log("couldn't update auth from discord id " + discordId)
        }
    }

    static async updateNicknameByDiscordId(discordId : string, nickname : string) {
        return await prisma.user.update({
            where: {
                discordId
            },
            data: {
                nickname: nickname.trim(),
                name: this.getSanitizedName(nickname),
                updatedAt: new Date()
            }
        })
    }

    static async canDiscordIdChangeNickname(discordId : string) {
        const user = await this.findUserByDiscordId(discordId);
        if(!user) return false;
        if(user.createdAt.getTime() != user.updatedAt.getTime()) return false;
        return true;
    }
}