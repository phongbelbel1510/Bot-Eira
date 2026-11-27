const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/db');
const { eira } = require('../utils/format');

module.exports = {
    name: 'vi',
    aliases: ['tui', 'bal', 'so', 'cash'],
    description: 'Xem số dư Eira',
    async run(msg) {
        const u = getUser(msg.author.id);
        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`Ví của ${msg.author.username}`)
            .setDescription(`Số dư: **${eira(u.eira)}**`);
        return msg.reply({ embeds: [embed] });
    },
};