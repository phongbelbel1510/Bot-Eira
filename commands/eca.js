const { EmbedBuilder } = require('discord.js');
const { getBag } = require('../utils/db');
const { RARITIES } = require('../data/fish');
const { RARITY, CHEST } = require('../emojis');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'ca',
    aliases: ['tuica', 'tuica2'],
    description: 'Xem túi cá',
    async run(msg) {
        const bag = getBag(msg.author.id);
        if (!bag.length) return msg.reply('Túi cá trống. Dùng `ecau` để đi câu nhé 🎣');

        // Rương trước, rồi cá từ hiếm đến thường
        const order = ['chest', ...[...RARITIES].reverse()];
        bag.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity) || b.value - a.value);

        const lines = bag.map((b) => {
            const icon = b.rarity === 'chest' ? CHEST : RARITY[b.rarity];
            return `${icon} **${b.species}** ×${num(b.qty)} — ${eira(b.value)}`;
        });
        const total = bag.reduce((s, b) => s + b.value, 0);
        const embed = new EmbedBuilder().setColor(0x2ecc71)
            .setTitle(`🎒 Túi cá của ${msg.author.username}`)
            .setDescription(lines.join('\n').slice(0, 3900))
            .setFooter({ text: `Tổng giá trị: ${num(total)} Eira · dùng eban để bán hết` });
        return msg.reply({ embeds: [embed] });
    },
};