import DB from "./backup.json";
import { prisma } from "./database/prisma";

export async function Backup() {
    const users = DB.users;
    let count = 0;
    for(const user of users) {
        await prisma.user.create({
            data: {
                name: user.name,
                discordId: user.discordId,
                nickname: user.nickname
            }
        });
        count++;
        console.log(`${user.name} | ${user.discordId} | USER CREATED | ${count}`);
    }
    const bans = DB.bans;
    count = 0;
    for(const ban of bans) {
        await prisma.ban.create({
            data: {
                auth: ban.auth,
                ip: ban.ip
            }
        });
        count++;
        console.log(`${ban.auth} | ${ban.ip} | BAN CREATED | ${count}`);
    }
    const status = DB.status;
    count = 0;
    for(const statu of status) {
        await prisma.status.create({
            data: {
                ...statu
            }
        });
        count++;
        console.log(`${statu.discordId} | STATUS CREATED | ${count}`);
    }
}