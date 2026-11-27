const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder,
} = require('discord.js');
const { getUser, getMats, setMats } = require('../utils/db');
const {
    FAMILIES, RECIPES, MERGE_RATIO, MAX_MERGE_PER_CMD, findRecipe,
} = require('../data/materials');
const { requirement } = require('../data/upgrades');
const { icon, label, mergeOne, canMake, mergeAll, previewMergeAll, missingNote } = require('../utils/crafting');
const { num } = require('../utils/format');

// Nhắc cấp kế tiếp còn thiếu gì (chỉ là thông báo, không chặn gì)
function noteFor(id, mats) {
    const lv = getUser(id).rod_level;
    return missingNote(mats, requirement(lv + 1));
}

function tableEmbed(mats) {
    const lines = ['🔥 Cứ 10 nguyên liệu bậc dưới hợp thành 1 nguyên liệu bậc trên!',
        '⚡ Tận dụng nguyên liệu thừa để nâng cấp cần câu.', '───────────────────────────────'];
    for (const f of FAMILIES) {
        lines.push('', `${icon(f.key, 1)} **${f.title}**`);
        for (const r of RECIPES.filter((x) => x.fam === f.key)) {
            const have = mats[f.key][r.fromTier - 1];
            const can = canMake(mats, r);
            lines.push(`${r.id}. ${icon(r.fam, r.fromTier)} \`${num(have)}/${MERGE_RATIO}\` ➔ ${label(r.fam, r.toTier)} ` +
                `(${can > 0 ? `Ghép được ${num(can)}` : 'Thiếu'})`);
        }
    }
    lines.push('───────────────────────────────', '⚡ **THAO TÁC NHANH**',
        `• Bấm [Ghép Nhanh Tất Cả] bên dưới để ghép toàn bộ (tổng ${num(previewMergeAll(mats))} lượt ghép).`,
        '• Hoặc gõ: `eghep <số: 1-16> [số lượng|max]` (VD: `eghep 1 2` ra 2 Dây tơ), hoặc `eghep dây tơ 2`.',
        '• Ghép tất cả: `eghep all`.');
    return new EmbedBuilder().setColor(0xe67e22).setTitle('🔄 LÒ GHÉP NGUYÊN LIỆU (TỈ LỆ 10:1)')
        .setDescription(lines.join('\n'));
}

// Chạy ghép tất cả, trả về nội dung embed kết quả
function runAll(id) {
    const mats = getMats(id);
    const { results, total } = mergeAll(mats);
    if (!total) {
        return new EmbedBuilder().setColor(0x7f8c8d).setTitle('🔄 Lò ghép')
            .setDescription('Chưa có gì đủ 10 món để ghép.\n' + noteFor(id, mats));
    }
    setMats(id, mats);
    const lines = results.map(({ recipe: r, made }) =>
        `${label(r.fam, r.fromTier)} ➔ ${label(r.fam, r.toTier)} ×**${num(made)}**`);
    return new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Đã ghép tất cả')
        .setDescription([...lines, '', `Tổng **${num(total)}** lượt ghép.`, noteFor(id, mats)].join('\n'));
}

module.exports = {
    name: 'ghep',
    aliases: ['lo', 'ghepnl'],
    description: 'Lò ghép nguyên liệu 10:1',
    async run(msg, args) {
        const id = msg.author.id;

        // eghep -> bảng + nút
        if (!args.length) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ghep:${id}:${Date.now()}`)
                    .setLabel('Ghép Nhanh Tất Cả').setEmoji('⚡').setStyle(ButtonStyle.Success));
            const sent = await msg.reply({ embeds: [tableEmbed(getMats(id))], components: [row] });
            const col = sent.createMessageComponentCollector({
                componentType: ComponentType.Button, time: 60_000, max: 1,
                filter: (i) => {
                    if (i.user.id !== id) {
                        i.reply({ content: 'Đây là lò của người khác nhé!', ephemeral: true }).catch(() => {});
                        return false;
                    }
                    return true;
                },
            });
            col.on('collect', (i) => i.update({ embeds: [runAll(id)], components: [] }).catch(() => {}));
            col.on('end', (_c, reason) => { if (reason === 'time') sent.edit({ components: [] }).catch(() => {}); });
            return;
        }

        // eghep all
        if (['all', 'tatca'].includes(args[0].toLowerCase()) && args.length === 1) {
            return msg.reply({ embeds: [runAll(id)] });
        }

        // eghep <số|tên> [số lượng|max]
        let name = args.join(' ');
        let qtyTok = '1';
        const last = args[args.length - 1].toLowerCase();
        if (args.length > 1 && (/^\d+$/.test(last) || last === 'max')) {
            qtyTok = last;
            name = args.slice(0, -1).join(' ');
        }
        const r = findRecipe(name);
        if (!r) return msg.reply('Không tìm thấy công thức. Gõ `eghep` để xem bảng 1-16, hoặc ghi tên món (VD: `eghep dây tơ 3`).');

        const mats = getMats(id);
        const can = canMake(mats, r);
        const from = label(r.fam, r.fromTier);
        const to = label(r.fam, r.toTier);

        let qty;
        if (qtyTok === 'max') qty = Math.min(can, MAX_MERGE_PER_CMD);
        else qty = Number(qtyTok);
        if (qty > MAX_MERGE_PER_CMD) return msg.reply(`Mỗi lần chỉ ghép tối đa **${num(MAX_MERGE_PER_CMD)}** món.`);
        if (qty < 1) return msg.reply('Số lượng phải từ 1 trở lên.');
        if (can < qty) {
            const have = mats[r.fam][r.fromTier - 1];
            return msg.reply(can === 0
                ? `Chưa đủ nguyên liệu: cần **${num(qty * MERGE_RATIO)}** ${from}, bạn có **${num(have)}**.`
                : `Bạn chỉ ghép được tối đa **${num(can)}** ${to} (có ${num(have)} ${from}).`);
        }

        mergeOne(mats, r, qty);
        setMats(id, mats);
        return msg.reply(
            `✅ Đã ghép **${num(qty)}** ${to}, dùng ${num(qty * MERGE_RATIO)} ${from}.\n` +
            `Hiện có: ${num(mats[r.fam][r.toTier - 1])} ${to}.\n${noteFor(id, mats)}`,
        );
    },
};