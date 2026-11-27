const { EmbedBuilder } = require('discord.js');
const { getUser, buyLeft, buyMaterial } = require('../utils/db');
const { FAMILIES, TIER1_PRICE, DAILY_BUY_LIMIT, findFamily, matName } = require('../data/materials');
const { MAT } = require('../emojis');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'shopcan',
    description: 'Cửa hàng: mua nguyên liệu bậc 1 để ghép và nâng cấp cần câu',
    async run(msg, args) {
        const id = msg.author.id;

        // eshopcan  ->  xem cửa hàng
        if (!args.length) {
            const left = buyLeft(id);
            const lines = FAMILIES.map((f, i) =>
                `**${i + 1}.** ${MAT[f.key][0]} ${matName(f.key, 1)} _(${f.title.toLowerCase()})_ — ${eira(TIER1_PRICE)}`);
            const embed = new EmbedBuilder().setColor(0xe67e22)
                .setTitle('🏪 Cửa hàng nguyên liệu')
                .setDescription([
                    ...lines,
                    '',
                    `Hôm nay còn mua được **${num(left)}/${num(DAILY_BUY_LIMIT)}** món (chung cho cả 4 loại, reset 0h giờ VN).`,
                    'Mua: `eshopcan <1-4> <số lượng>` hoặc `eshopcan <1-4> max` (VD: `eshopcan 1 500`).',
                    'Chỉ bậc 1 có bán, các bậc cao hơn phải ghép bằng `eghep`.',
                ].join('\n'));
            return msg.reply({ embeds: [embed] });
        }

        const fam = findFamily(args[0]);
        if (!fam) return msg.reply('Không có loại này. Dùng số 1-4 hoặc tên: `day`, `luoi`, `than`, `phukien`.');

        const u = getUser(id);
        const left = buyLeft(id);
        let qty;
        const q = (args[1] || '1').toLowerCase();
        if (q === 'max') qty = Math.min(left, Math.floor(u.eira / TIER1_PRICE));
        else if (/^\d+$/.test(q)) qty = Number(q);
        else return msg.reply('Số lượng không hợp lệ. VD: `eshopcan 1 500` hoặc `eshopcan 1 max`.');

        if (qty <= 0) {
            if (left <= 0) return msg.reply('Hôm nay bạn đã mua hết giới hạn rồi, mai quay lại nhé.');
            return msg.reply(`Bạn chưa đủ Eira để mua (mỗi món ${eira(TIER1_PRICE)}).`);
        }

        const r = buyMaterial(id, fam.key, qty);
        if (!r.ok) {
            if (r.reason === 'limit') return msg.reply(`Hôm nay bạn chỉ còn mua được **${num(r.left)}** món nữa.`);
            if (r.reason === 'money') return msg.reply(`Cần ${eira(r.cost)} để mua, bạn chưa đủ.`);
            return msg.reply('Không mua được, thử lại nhé.');
        }
        return msg.reply(
            `🛒 Đã mua **${num(qty)}** ${MAT[fam.key][0]} ${matName(fam.key, 1)}, trả ${eira(r.cost)}.\n` +
            `Hôm nay còn mua được **${num(r.left)}** món. Dùng \`eghep\` để ghép lên bậc cao.`,
        );
    },
};