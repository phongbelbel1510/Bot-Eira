const { EmbedBuilder } = require('discord.js');
const { getUser, setRodLevel } = require('../utils/db');
const rods = require('../data/rods');
const { kg } = require('../utils/format');

let fileCfg = {};
try { fileCfg = require('../config.json'); } catch {}
const OWNER_ID = process.env.OWNER_ID || fileCfg.ownerId;

const f1 = (n) => (n / 1000).toFixed(1).replace('.', ',');

module.exports = {
    name: 'can',
    aliases: ['cancau'],
    description: 'Xem thông tin cần câu',
    async run(msg, args) {
        // Lệnh thử cho chủ bot: ecan set 50  (xóa đi khi đã có nâng cấp thật)
        if (args[0] === 'set' && OWNER_ID && msg.author.id === OWNER_ID) {
            const lv = rods.clampLv(Number(args[1]));
            setRodLevel(msg.author.id, lv);
            return msg.reply(`Đã đặt cấp cần câu = ${lv}.`);
        }

        const u = getUser(msg.author.id);
        const lv = u.rod_level;
        const [wMin, wMax] = rods.waitRange(lv);
        const zones = rods.unlockedZones(lv).map((z) => `${z.emoji} ${z.name}`).join(', ');

        const embed = new EmbedBuilder().setColor(0x3498db)
            .setTitle(`🎣 Cần câu của ${msg.author.username}`)
            .addFields(
                { name: 'Cấp / Bậc', value: `Cấp **${lv}**/${rods.MAX_LEVEL} · Bậc **${rods.tierOf(lv)}**`, inline: true },
                { name: 'LUK', value: `**${rods.luk(lv)}** (cá hiếm ×${rods.rareMult(lv).toFixed(2).replace('.', ',')})`, inline: true },
                { name: 'Khối lượng cá', value: `×${rods.weightMult(lv).toFixed(2).replace('.', ',')}`, inline: true },
                { name: 'Chờ cá cắn', value: `${f1(wMin)}–${f1(wMax)} giây`, inline: true },
                { name: 'Thời gian giật dây', value: `${f1(rods.reactMs(lv))} giây`, inline: true },
                { name: 'Vùng đã mở', value: zones },
                { name: 'Cá nặng nhất', value: u.best_fish ? `${u.best_fish} — ${kg(u.best_kg)}` : 'Chưa có', inline: true },
                { name: 'Rương báu đã câu', value: String(u.chests), inline: true },
            );
        return msg.reply({ embeds: [embed] });
    },
};