const { EmbedBuilder } = require('discord.js');
const { getMats } = require('../utils/db');
const { FAMILIES, MAX_TIER } = require('../data/materials');
const { icon, label } = require('../utils/crafting');
const { num } = require('../utils/format');

module.exports = {
    name: 'kho',
    aliases: ['nl', 'nguyenlieu'],
    description: 'Xem kho nguyên liệu nâng cấp cần câu',
    async run(msg) {
        const mats = getMats(msg.author.id);
        const embed = new EmbedBuilder().setColor(0x95a5a6)
            .setTitle(`📦 Kho nguyên liệu của ${msg.author.username}`);
        let any = false;
        for (const f of FAMILIES) {
            const lines = [];
            for (let t = 1; t <= MAX_TIER; t++) {
                const q = mats[f.key][t - 1];
                if (q > 0) { any = true; lines.push(`${label(f.key, t)} ×${num(q)}`); }
            }
            embed.addFields({ name: `${icon(f.key, 1)} ${f.title}`, value: lines.join('\n') || '_trống_', inline: true });
        }
        embed.setFooter({ text: any ? 'eghep để ghép · enangcan để nâng cấp cần' : 'Kho trống. Dùng eshopcan để mua nguyên liệu bậc 1.' });
        return msg.reply({ embeds: [embed] });
    },
};