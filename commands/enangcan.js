const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder,
} = require('discord.js');
const { getUser, getMats } = require('../utils/db');
const { upgradeRod } = require('../utils/upgrade');
const { requirement, eiraCost, nextTier5Level } = require('../data/upgrades');
const rods = require('../data/rods');
const { label, checkReq, fmtCheck } = require('../utils/crafting');
const { eira, num } = require('../utils/format');

const comma = (n) => String(n).replace('.', ',');
const secs = (ms) => comma((ms / 1000).toFixed(2));

// Các chỉ số của cần ở cấp l: [tên, giá trị hiển thị]
function stats(l) {
    const [w1, w2] = rods.waitRange(l);
    return [
        ['LUK', String(rods.luk(l))],
        ['Tỉ lệ cá hiếm (từ Hiếm trở lên)', `×${comma(rods.rareMult(l).toFixed(2))}`],
        ['Khối lượng cá', `×${comma(rods.weightMult(l).toFixed(3))}`],
        ['Chờ cá cắn', `${secs(w1)}–${secs(w2)} giây`],
        ['Thời gian giật dây', `${secs(rods.reactMs(l))} giây`],
    ];
}

const zoneList = (l) => rods.unlockedZones(l).map((z) => `${z.emoji} ${z.name}`).join(', ');

// Dựng màn hình nâng cấp từ dữ liệu mới nhất. note: dòng kết quả của lần bấm trước (nếu có)
function buildScreen(id, username, note) {
    const u = getUser(id);
    const lv = u.rod_level;
    const title = `⬆️ Nâng cấp cần câu của ${username}`;
    const lines = [];
    if (note) lines.push(note, '');

    // --- Cần hiện tại ---
    const cur = stats(lv);
    lines.push(`**Cần hiện tại:** ${rods.rodLabel(lv)} · cấp **${lv}**/${rods.MAX_LEVEL}`,
        ...cur.map(([k, v]) => `• ${k}: **${v}**`),
        `• Vùng đã mở: ${zoneList(lv)}`);

    if (lv >= rods.MAX_LEVEL) {
        lines.push('', '🏆 Cần câu đã đạt cấp tối đa!');
        return { embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle(title).setDescription(lines.join('\n'))], components: [] };
    }

    // --- Sau khi nâng: chỉ số tăng gì ---
    const next = requirement(lv + 1);
    const nxt = stats(next.level);
    lines.push('', `**Sau khi nâng:** ${rods.rodLabel(next.level)} · cấp **${next.level}**`,
        ...cur.map(([k, v], i) => `• ${k}: ${v} ➔ **${nxt[i][1]}**`));
    if (rods.tierOf(next.level) > rods.tierOf(lv)) {
        const z = rods.unlockedZones(next.level).filter((x) => x.minLevel > lv);
        lines.push(`🎉 **Đổi cần:** ${rods.rodLabel(lv)} ➔ ${rods.rodLabel(next.level)}` +
            (z.length ? `, mở vùng ${z.map((x) => `${x.emoji} ${x.name}`).join(', ')}` : ''));
    }

    // --- Cần gì để nâng ---
    const cost = eiraCost(next.level);
    const checks = checkReq(getMats(id), next);
    const enough = checks.every((c) => c.ok) && u.eira >= cost;
    lines.push('', '**Cần để nâng:**',
        ...checks.map((c) => `• ${fmtCheck(c)}`),
        `• ${eira(cost)} (có ${eira(u.eira)} ${u.eira >= cost ? '✅' : '❌'})`);

    const zone = rods.ZONES.find((z) => z.minLevel > lv);
    if (zone) lines.push('', `🎯 Mốc đổi cần kế tiếp: cấp **${zone.minLevel}** (${rods.rodLabel(zone.minLevel)}, mở ${zone.emoji} ${zone.name})`);
    const t5 = nextTier5Level(lv);
    if (t5) lines.push(`⚠️ Mốc bậc 5 tiếp theo: **cấp ${t5}** (1 món, tương đương 10.000 món bậc 1).`);
    lines.push('', enough ? 'Đủ điều kiện, bấm nút bên dưới để nâng.' : 'Chưa đủ: mua bằng `eshopcan`, ghép bằng `eghep`.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`nangcan:${id}`).setLabel(`Nâng lên cấp ${next.level}`)
            .setEmoji('⬆️').setStyle(enough ? ButtonStyle.Success : ButtonStyle.Secondary));
    return {
        embeds: [new EmbedBuilder().setColor(enough ? 0x2ecc71 : 0xe67e22).setTitle(title).setDescription(lines.join('\n'))],
        components: [row],
    };
}

module.exports = {
    name: 'nangcan',
    description: 'Xem cần hiện tại, chỉ số tăng khi nâng, điều kiện nâng, và bấm nút để nâng',
    async run(msg) {
        const id = msg.author.id;
        const username = msg.author.username;
        const sent = await msg.reply(buildScreen(id, username));

        const col = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            idle: 60_000,
            filter: (i) => {
                if (i.user.id !== id) {
                    i.reply({ content: 'Đây là cần câu của người khác nhé!', ephemeral: true }).catch(() => {});
                    return false;
                }
                return true;
            },
        });

        col.on('collect', (i) => {
            const r = upgradeRod(id, 1);
            let note;
            if (r.steps > 0) {
                const used = Object.entries(r.used).map(([k, q]) => {
                    const [fam, tier] = k.split('|');
                    return `${num(q)}× ${label(fam, Number(tier))}`;
                }).join(', ');
                note = `✅ **Nâng cấp thành công!** ${rods.rodLabel(r.from)} cấp ${r.from} ➔ ${rods.rodLabel(r.to)} cấp **${r.to}**\n` +
                    `Đã dùng: ${used} + ${eira(r.spent)}`;
            } else {
                note = r.stop === 'money' ? '❌ Chưa đủ Eira để nâng.' : '❌ Chưa đủ nguyên liệu để nâng.';
            }
            i.update(buildScreen(id, username, note)).catch(() => {});
        });
        col.on('end', () => { sent.edit({ components: [] }).catch(() => {}); });
    },
};