const { EmbedBuilder } = require('discord.js');
const { sortedBag } = require('../utils/bag');
const { RARITY, CHEST } = require('../emojis');
const { eira, num } = require('../utils/format');

module.exports = {
    name: 'ca',
    aliases: ['tuica', 'tuica2'],
    description: 'Xem túi cá',
    async run(msg) {
        // Cùng thứ tự với ebanca: số ở đầu dòng chính là số dùng để bán
        const bag = sortedBag(msg.author.id);
        if (!bag.length) return msg.reply('Túi cá trống. Dùng `ecau` để đi câu nhé 🎣');

        const lines = bag.map((b, i) => {
            const icon = b.rarity === 'chest' ? CHEST : RARITY[b.rarity];
            return `**${i + 1}.** ${icon} **${b.species}** ×${num(b.qty)} — ${eira(b.value)}`;
        });
        const total = bag.reduce((s, b) => s + b.value, 0);
        const embed = new EmbedBuilder().setColor(0x2ecc71)
            .setTitle(`🎒 Túi cá của ${msg.author.username}`)
            .setDescription(lines.join('\n').slice(0, 3900))
            .setFooter({ text: `Tổng giá trị: ${num(total)} Eira · ebanca <số> bán món đó · ebanca all bán hết` });
        return msg.reply({ embeds: [embed] });
    },
};