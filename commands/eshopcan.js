const { EmbedBuilder } = require('discord.js');
const { getUser, buyMaterial } = require('../utils/db');
const { FAMILIES, MAX_TIER, TIER1_PRICE, findFamily, matName } = require('../data/materials');
const { MAT } = require('../emojis');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'shopcan',
    description: 'Cửa hàng: mua nguyên liệu bậc 1 để ghép và nâng cấp cần câu',
    async run(msg, args) {
        const id = msg.author.id;

        // eshopcan  ->  xem cửa hàng
        if (!args.length) {
            const lines = FAMILIES.map((f, i) =>
                `**${i + 1}.** ${MAT[f.key][0]} ${matName(f.key, 1)} _(${f.title.toLowerCase()})_ — ${eira(TIER1_PRICE)}`);
            // giá quy đổi: bậc k = 10^(k-1) món bậc 1
            const worth = [];
            for (let t = 2; t <= MAX_TIER; t++) worth.push(`bậc ${t} ≈ ${num(TIER1_PRICE * Math.pow(10, t - 1))}`);
            const embed = new EmbedBuilder().setColor(0xe67e22)
                .setTitle('🏪 Cửa hàng nguyên liệu')
                .setDescription([
                    ...lines,
                    '',
                    'Mua không giới hạn số lượng, chỉ cần đủ Eira.',
                    'Mua: `eshopcan <1-4> <số lượng>` hoặc `eshopcan <1-4> max` (mua hết số Eira đang có). VD: `eshopcan 1 500`.',
                    'Chỉ bậc 1 có bán, các bậc cao hơn phải ghép bằng `eghep` (10 món bậc dưới = 1 món bậc trên).',
                    '',
                    `Giá trị quy đổi (Eira): ${worth.join(' · ')}`,
                ].join('\n'));
            return msg.reply({ embeds: [embed] });
        }

        const fam = findFamily(args[0]);
        if (!fam) return msg.reply('Không có loại này. Dùng số 1-4 hoặc tên: `day`, `luoi`, `than`, `phukien`.');

        const u = getUser(id);
        let qty;
        const q = (args[1] || '1').toLowerCase();
        if (q === 'max') qty = Math.floor(u.eira / TIER1_PRICE);
        else if (/^\d+$/.test(q)) qty = Number(q);
        else return msg.reply('Số lượng không hợp lệ. VD: `eshopcan 1 500` hoặc `eshopcan 1 max`.');

        if (qty <= 0) return msg.reply(`Bạn chưa đủ Eira để mua (mỗi món ${eira(TIER1_PRICE)}).`);

        const r = buyMaterial(id, fam.key, qty);
        if (!r.ok) {
            if (r.reason === 'money') return msg.reply(`Cần ${eira(r.cost)} để mua, bạn chưa đủ.`);
            return msg.reply('Không mua được, thử lại nhé.');
        }
        return msg.reply(
            `🛒 Đã mua **${num(qty)}** ${MAT[fam.key][0]} ${matName(fam.key, 1)}, trả ${eira(r.cost)}.\n` +
            'Dùng `eghep` để ghép lên bậc cao.',
        );
    },
};