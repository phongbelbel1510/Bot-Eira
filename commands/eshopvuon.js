// commands/eshopvuon.js: cửa hàng vật phẩm cho vườn (phân bón, thuốc tăng trưởng).
// Hạt giống mua trong chính lệnh evuon (menu chọn hạt).
const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/db');
const farm = require('../utils/farm');
const F = require('../data/farm');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'shopvuon',
    description: 'Cửa hàng vườn: mua phân bón, thuốc tăng trưởng',
    async run(msg, args) {
        const id = msg.author.id;
        const f = farm.getFarm(id);

        // eshopvuon -> xem cửa hàng
        if (!args.length) {
            const lines = F.ITEMS.map((it, i) =>
                `**${i + 1}.** ${it.emoji} **${it.name}** — ${eira(it.price)}\n${it.desc} Bạn đang có: **${num(f[it.key])}**`);
            const embed = new EmbedBuilder().setColor(0x16a085).setTitle('🏪 Cửa hàng vườn')
                .setDescription([
                    ...lines, '',
                    'Mua: `eshopvuon <1|2> <số lượng>` hoặc `eshopvuon <1|2> max`. VD: `eshopvuon 1 5`.',
                    'Dùng: `evuon bon [ô|all]` (phân bón), `evuon thuoc [ô|all]` (thuốc), hoặc nút trong `evuon`.',
                    'Hiệu ứng cộng dồn với tưới nước (-10% thời gian). Đáng dùng nhất cho hạt lớn từ 4 giờ trở lên; với hạt rẻ thì tốn hơn lãi.',
                ].join('\n'));
            return msg.reply({ embeds: [embed] });
        }

        const item = F.findItem(args[0]);
        if (!item) return msg.reply('Không có vật phẩm này. Dùng số 1-2 hoặc tên: `phanbon`, `thuoc`.');

        const q = (args[1] || '1').toLowerCase();
        let qty;
        if (q === 'max') qty = Math.floor(getUser(id).eira / item.price);
        else if (/^\d+$/.test(q)) qty = Number(q);
        else return msg.reply('Số lượng không hợp lệ. VD: `eshopvuon 1 5` hoặc `eshopvuon 1 max`.');
        if (qty < 1) return msg.reply(`Bạn chưa đủ Eira để mua (mỗi cái ${eira(item.price)}).`);

        const r = farm.buyItem(id, item.key, qty);
        if (!r.ok) return msg.reply(r.reason === 'money' ? `Cần ${eira(r.cost)} để mua, bạn chưa đủ.` : 'Không mua được, thử lại nhé.');
        return msg.reply(`🛒 Đã mua **${num(qty)}** ${item.emoji} ${item.name}, trả ${eira(r.cost)}.`);
    },
};