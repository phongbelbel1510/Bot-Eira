const { EmbedBuilder } = require('discord.js');
const { getUser, getMats } = require('../utils/db');
const { upgradeRod } = require('../utils/upgrade');
const { requirement, eiraCost, nextTier5Level } = require('../data/upgrades');
const rods = require('../data/rods');
const { label, checkReq, fmtCheck } = require('../utils/crafting');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'nang',
    aliases: ['nangcan', 'nangcap'],
    description: 'Nâng cấp cần câu bằng nguyên liệu + Eira',
    async run(msg, args) {
        const id = msg.author.id;

        let steps = 1;
        if (args[0]) {
            const a = args[0].toLowerCase();
            if (a === 'max') steps = rods.MAX_LEVEL;
            else if (/^\d+$/.test(a) && Number(a) >= 1) steps = Math.min(Number(a), rods.MAX_LEVEL);
            else return msg.reply('Dùng: `enang` (1 cấp), `enang <số cấp>` hoặc `enang max`.');
        }

        if (getUser(id).rod_level >= rods.MAX_LEVEL) {
            return msg.reply(`🎣 Cần câu của bạn đã đạt cấp tối đa (**${rods.rodName(rods.MAX_LEVEL)}**, cấp ${rods.MAX_LEVEL}).`);
        }

        const r = upgradeRod(id, steps);
        const u = getUser(id);
        const lines = [];

        if (r.steps > 0) {
            lines.push(`**${rods.rodName(r.from)}** cấp ${r.from} ➔ **${rods.rodName(r.to)}** cấp **${r.to}**`);
            const usedLines = Object.entries(r.used).map(([k, q]) => {
                const [fam, tier] = k.split('|');
                return `${num(q)}× ${label(fam, Number(tier))}`;
            });
            lines.push(`Đã dùng: ${usedLines.join(', ')}`, `Chi phí: ${eira(r.spent)}`);
            if (rods.tierOf(r.to) > rods.tierOf(r.from)) {
                const z = rods.unlockedZones(r.to).filter((x) => x.minLevel > r.from);
                lines.push('', `🎉 Lên mốc **${rods.rodName(r.to)}**!` + (z.length ? ` Mở vùng ${z.map((x) => `${x.emoji} ${x.name}`).join(', ')}.` : ''));
            }
        } else {
            lines.push('Chưa nâng được, bạn còn thiếu:');
        }

        // Cấp kế tiếp cần gì (hiện cả khi vừa nâng xong, để người chơi chuẩn bị)
        if (r.to < rods.MAX_LEVEL) {
            const next = requirement(r.to + 1);
            const mats = getMats(id);
            const cost = eiraCost(next.level);
            lines.push('', `**Cấp ${next.level}** cần:`,
                ...checkReq(mats, next).map((c) => `• ${fmtCheck(c)}`),
                `• ${eira(cost)} (có ${eira(u.eira)} ${u.eira >= cost ? '✅' : '❌'})`);
            const t5 = nextTier5Level(r.to);
            if (t5) lines.push('', `⚠️ Cấp mốc tiếp theo cần bậc 5: **cấp ${t5}** (1 món, tương đương 10.000 món bậc 1).`);
        }

        const embed = new EmbedBuilder()
            .setColor(r.steps > 0 ? 0x2ecc71 : 0xe67e22)
            .setTitle(r.steps > 0 ? '🎣 Nâng cấp thành công!' : '🎣 Nâng cấp cần câu')
            .setDescription(lines.join('\n'));
        return msg.reply({ embeds: [embed] });
    },
};