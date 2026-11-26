const { sellAll } = require('../utils/db');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'banca',
    description: 'Bán toàn bộ cá và rương trong túi',
    async run(msg) {
        const r = sellAll(msg.author.id);
        if (!r.count) return msg.reply('Túi cá trống, không có gì để bán.');
        return msg.reply(`💰 Đã bán **${num(r.count)}** món, nhận **${eira(r.total)}**.`);
    },
};