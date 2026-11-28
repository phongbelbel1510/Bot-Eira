// commands/ecard.js: hồ sơ dạng ảnh. `ecard` (hoặc `e5`, `eprofile`) xem của mình, `ecard @người` xem của người khác.
// File này chỉ lo phần lệnh (đọc dữ liệu, cooldown, gửi ảnh). Việc vẽ nằm ở utils/cardRenderer.js, xếp hàng qua utils/cardPool.js.
const { AttachmentBuilder } = require('discord.js');
const { getProfile, hasUser } = require('../utils/profile');
const pool = require('../utils/cardPool');

const CARD_COOLDOWN_MS = 8_000;
const MAX_PENDING = pool.POOL_SIZE * 4;   // quá số thẻ đang chờ này thì từ chối cho bot khỏi bị dồn việc
const cardCooldown = new Map();

// dọn bảng cooldown định kỳ cho khỏi phình ra
setInterval(() => {
    const limit = Date.now() - CARD_COOLDOWN_MS;
    for (const [id, t] of cardCooldown) if (t < limit) cardCooldown.delete(id);
}, 60_000).unref();

// Giữ nguyên tên gốc (chữ phông đẹp, ký hiệu...), chỉ bỏ ký tự điều khiển / ký tự vô hình
const cleanName = (raw) => String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060\uFE00-\uFE0F]/g, '')
    .replace(/\s+/g, ' ').trim();

module.exports = {
    name: 'card',
    aliases: ['5', 'profile'],
    description: 'Xem hồ sơ dạng ảnh: tiền, tài sản, cần câu, nhịp độ hàng ngày',
    async run(msg) {
        const target = msg.mentions?.users?.first() ?? msg.author;
        if (target.bot) return msg.reply('Bot không có hồ sơ.');
        if (target.id !== msg.author.id && !hasUser(target.id)) return msg.reply('Người này chưa có hồ sơ (chưa dùng bot lần nào).');

        const now = Date.now();
        if (now - (cardCooldown.get(msg.author.id) ?? 0) < CARD_COOLDOWN_MS) {
            return msg.reply('Từ từ thôi, đợi vài giây rồi gõ lại nhé.');
        }
        if (pool.pendingCount() >= MAX_PENDING) {
            return msg.reply('Đang có nhiều người xem thẻ, bạn thử lại sau ít giây nhé.');
        }
        cardCooldown.set(msg.author.id, now);

        const member = msg.guild?.members.cache.get(target.id);
        const name = cleanName(member?.displayName) || cleanName(target.globalName) || cleanName(target.username) || 'Người chơi';
        const avatarUrl = target.displayAvatarURL?.({ extension: 'png', size: 512 });

        let buffer, ext;
        try {
            const t0 = Date.now();
            ({ buffer, ext } = await pool.render({ name, avatarUrl, profile: getProfile(target.id) }));
            console.log(`[ecard] ${ext} ${Math.round(buffer.length / 1024)}KB, ${Date.now() - t0}ms`);
        } catch (err) {
            console.error('[ecard]', err);
            return msg.reply('Không vẽ được thẻ lúc này, bạn thử lại sau nhé.');
        }

        return msg.reply({
            files: [new AttachmentBuilder(buffer, { name: `ecard.${ext}` })],
            allowedMentions: { repliedUser: false },
        });
    },
};