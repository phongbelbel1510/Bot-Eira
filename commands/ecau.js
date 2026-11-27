const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder,
} = require('discord.js');
const { getUser, addEira, addFish, addChest } = require('../utils/db');
const { rollCatch } = require('../utils/fishing');
const { RARITY_NAME } = require('../data/fish');
const rods = require('../data/rods');
const { RARITY, CHEST } = require('../emojis');
const { eira, kg } = require('../utils/format');

const COLORS = {
    common: 0x95a5a6, uncommon: 0x2ecc71, rare: 0x3498db,
    epic: 0x9b59b6, legendary: 0xf1c40f, mythic: 0xe74c3c,
};

const fishing = new Set();      // người đang câu
const lastEnd = new Map();      // thời điểm kết thúc lần câu trước
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sec = (ms) => (ms / 1000).toFixed(1).replace('.', ',');

module.exports = {
    name: 'cau',
    aliases: ['cauca'],
    description: 'Câu cá: chờ cá cắn rồi bấm Giật dây',
    async run(msg, args) {
        const id = msg.author.id;
        if (fishing.has(id)) return msg.reply('Bạn đang câu rồi, đợi cá cắn đã nhé 🎣');

        const left = (lastEnd.get(id) || 0) + rods.CAST_COOLDOWN_MS - Date.now();
        if (left > 0) return msg.reply(`Cần câu đang nghỉ, thử lại sau ${sec(left)} giây.`);

        const u = getUser(id);
        const level = u.rod_level;

        // Chọn vùng: có ghi tên vùng thì dùng, không thì vùng cao nhất đã mở
        const open = rods.unlockedZones(level);
        let zone = open[open.length - 1];
        if (args[0]) {
            const z = rods.findZone(args[0]);
            if (!z) return msg.reply(`Không có vùng "${args[0]}". Vùng: ${rods.ZONES.map((x) => x.key).join(', ')}`);
            if (level < z.minLevel) return msg.reply(`${z.emoji} **${z.name}** cần cần câu cấp ${z.minLevel} trở lên (bạn đang cấp ${level}).`);
            zone = z;
        }

        fishing.add(id);
        try {
            const [wMin, wMax] = rods.waitRange(level);
            const wait = wMin + Math.random() * (wMax - wMin);
            const react = rods.reactMs(level);

            const sent = await msg.reply({
                embeds: [new EmbedBuilder().setColor(0x3498db)
                    .setTitle(`${zone.emoji} ${zone.name}`)
                    .setDescription('🎣 Bạn thả cần câu xuống nước... đợi cá cắn nhé.')],
            });
            await sleep(wait);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`cau:${id}:${Date.now()}`)
                    .setLabel('Giật dây!').setEmoji('🎣').setStyle(ButtonStyle.Success),
            );
            await sent.edit({
                embeds: [new EmbedBuilder().setColor(0xf1c40f)
                    .setTitle(`${zone.emoji} ${zone.name}`)
                    .setDescription(`❗ **Cá cắn câu rồi!** Bấm **Giật dây** trong ${sec(react)} giây!`)],
                components: [row],
            });

            let click = null;
            try {
                click = await sent.awaitMessageComponent({
                    componentType: ComponentType.Button,
                    time: react,
                    filter: (i) => {
                        if (i.user.id !== id) {
                            i.reply({ content: 'Đây là cần câu của người khác nhé!', ephemeral: true }).catch(() => {});
                            return false;
                        }
                        return true;
                    },
                });
            } catch { /* hết giờ */ }

            if (!click) {
                await sent.edit({
                    embeds: [new EmbedBuilder().setColor(0x7f8c8d)
                        .setTitle(`${zone.emoji} ${zone.name}`)
                        .setDescription('💨 Bạn giật chậm quá, cá đã thoát mất rồi...')],
                    components: [],
                }).catch(() => {});
                return;
            }

            // Kết quả bốc ngay lúc bấm
            const r = rollCatch(level, zone.key);
            let embed;
            if (r.type === 'chest') {
                addChest(id, r.value);
                embed = new EmbedBuilder().setColor(0xf1c40f)
                    .setTitle(`${CHEST} RƯƠNG BÁU!`)
                    .setDescription(`Bạn kéo lên một **rương báu** từ đáy nước! Trị giá **${eira(r.value)}**.\nĐã cất vào túi, dùng \`ebanca\` để bán.`);
            } else if (r.type === 'trash') {
                addEira(id, r.value);
                embed = new EmbedBuilder().setColor(0x7f8c8d)
                    .setTitle(`${zone.emoji} ${zone.name}`)
                    .setDescription(`🗑️ Bạn câu được **${r.name}**. Bán được ${eira(r.value)}.`);
            } else {
                const record = addFish(id, r.fish.name, r.fish.rarity, r.kg, r.value);
                embed = new EmbedBuilder().setColor(COLORS[r.fish.rarity])
                    .setTitle(`${RARITY[r.fish.rarity]} ${r.fish.name}`)
                    .setDescription(
                        `**${kg(r.kg)}** · ${RARITY_NAME[r.fish.rarity]} · giá **${eira(r.value)}**` +
                        (r.big ? '\n🔥 **Cá khủng!** Nặng hơn hẳn mức thường của loài.' : '') +
                        (record ? '\n🏆 **Kỷ lục mới** của bạn!' : '') +
                        `\n${zone.emoji} ${zone.name} · đã cất vào túi, dùng \`ebanca\` để bán.`,
                    );
            }
            await click.update({ embeds: [embed], components: [] });
        } finally {
            fishing.delete(id);
            lastEnd.set(id, Date.now());
        }
    },
};