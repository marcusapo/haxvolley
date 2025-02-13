import { Role } from "haxball-extended-room"

const RegistredRole = new Role().setPrefix("✅").setPosition(1).setColor(0xffffff);
RegistredRole.settings.delay = 2;
const ToxicoRole = new Role().setPrefix("🤮").setPosition(2).setColor(0x363636).setName("toxico");
ToxicoRole.settings.delay = 3;
const BoosterRole = new Role().setPrefix("💫").setPosition(3).setColor(0xff57eb).setName("booster");
BoosterRole.settings.delay = 1;
const ModeradorRole = new Role().setPrefix("👮").setPosition(4).setAdmin().setColor(0x57cfff).setName("moderador");
ModeradorRole.settings.delay = 0;
const DiretorRole = new Role().setPrefix("👑").setPosition(5).setAdmin().setColor(0xf03c4e).setName("diretor");
DiretorRole.settings.delay = 0;

type TRoles = {
    [key: string]: Role;
};

export const Roles = {
    RegistredRole,
    ToxicoRole,
    BoosterRole,
    ModeradorRole,
    DiretorRole
}

export function getRoleByName(name : string) {
    const roles = Roles as TRoles;
    for(const r of Object.keys(roles)) {
        const role = roles[r];
        if(role.name == name) return role;
    }
    return null;
}