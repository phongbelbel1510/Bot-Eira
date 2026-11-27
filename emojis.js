// Gom toàn bộ emoji ở đây. Khi có GIF thì đổi EIRA thành '<a:eira:ID>'
module.exports = {
    EIRA: '<a:eira_coin:1574962469946925106>',
    CHEST: '👑',           // rương báu dùng emoji của Huyền thoại
    // Emoji cần câu theo mốc tên: tre, sắt, carbon, bạch kim, ngọc
    ROD: ['<:can_tre:1575519136899932270>', '<:can_sat:1575519229514350683>', '<:can_carbon:1575519310837981326>', '<:can_plat:1575519253933592636>', '<:can_ngoc:1575519287643480114>'],
    // Emoji vật liệu: MAT[nhóm][bậc - 1]
    MAT: {
        day:     ['🧵', '🪢', '🧶', '🐉', '🌟'],
        luoi:    ['🪝', '🔩', '🦴', '🥈', '💠'],
        than:    ['🎋', '🪵', '🧪', '⚫', '💎'],
        phukien: ['🎈', '🔔', '🎞️', '👁️', '⭐'],
    },
    RARITY: {
        common: '🪨',
        uncommon: '🌿',
        rare: '💧',
        epic: '🔮',
        legendary: '👑',
        mythic: '✨',
    },
};