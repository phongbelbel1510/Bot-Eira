const { sellAll } = require('../utils/db');
const { sortedBag, sellSpecies } = require('../utils/bag');
const { RARITY, CHEST } = require('../emojis');
const { eira, num } = require('../utils/format');

const USAGE =
    'Cách bán cá:\n' +
    '• `ebanca <số>`: bán nguyên món có số đó trong túi (xem số bằng `eca`). VD: `ebanca 2`\n' +
    '• `ebanca <số> <số> ...`: bán nhiều món cùng lúc. VD: `ebanca 1 3 5` hoặc `ebanca 1,3,5`\n' +
    '• `ebanca all`: bán hết cả túi.';

module.exports = {
    name: 'banca',
    description: 'Bán cá trong túi theo số thứ tự, hoặc bán hết',
    async run(msg, args) {
        const id = msg.author.id;
        if (!args.length) return msg.reply(USAGE);

        // ebanca all
        if (args.length === 1 && args[0].toLowerCase() === 'all') {
            const r = sellAll(id);
            if (!r.count) return msg.reply('Túi cá trống, không có gì để bán.');
            return msg.reply(`💰 Đã bán **${num(r.count)}** món, nhận **${eira(r.total)}**.`);
        }

        // ebanca <số> [<số> ...]
        const tokens = args.join(' ').split(/[\s,]+/).filter(Boolean);
        if (tokens.some((t) => !/^\d+$/.test(t))) return msg.reply(`Số không hợp lệ.\n${USAGE}`);
        const nums = [...new Set(tokens.map(Number))];

        const bag = sortedBag(id);
        if (!bag.length) return msg.reply('Túi cá trống, không có gì để bán.');
        const bad = nums.filter((n) => n < 1 || n > bag.length);
        if (bad.length) {
            return msg.reply(`Không có món số **${bad.join(', ')}** trong túi (túi có ${bag.length} món, xem bằng \`eca\`). Chưa bán gì cả.`);
        }

        const r = sellSpecies(id, nums.map((n) => bag[n - 1].species));
        if (!r.count) return msg.reply('Không bán được, túi vừa thay đổi. Xem lại bằng `eca` nhé.');

        const lines = r.sold.slice(0, 15).map((b) => {
            const icon = b.rarity === 'chest' ? CHEST : RARITY[b.rarity];
            return `${icon} ${b.species} ×${num(b.qty)} — ${eira(b.value)}`;
        });
        if (r.sold.length > 15) lines.push(`... và ${r.sold.length - 15} loại khác`);
        return msg.reply(`💰 Đã bán **${num(r.count)}** món, nhận **${eira(r.total)}**:\n${lines.join('\n')}`);
    },
};