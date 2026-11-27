// Yêu cầu nâng cấp cần câu: từ cấp (L-1) lên cấp L (L = 1..100).
// Nhóm vật liệu xoay vòng 4 nhóm theo cấp: cấp 1 Dây, 2 Lưỡi, 3 Thân cần, 4 Phụ kiện, 5 Dây...
const { FAMILIES } = require('./materials');
const { MAX_LEVEL } = require('./rods');

// Mốc bậc 5 (mỗi mốc cần 1 món bậc 5, đắt nhất game)
const TIER5_LEVELS = [90, 100];

// Trả về { level, fam, items: [{ fam, tier, qty }] } hoặc null nếu cấp không hợp lệ
function requirement(level) {
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return null;
    const fam = FAMILIES[(level - 1) % FAMILIES.length].key;
    const items = [];
    const add = (tier, qty) => items.push({ fam, tier, qty });

    if (level <= 20) {                         // cấp 1-20: bậc 1 x (6 + floor(o/3))
        add(1, 6 + Math.floor((level - 1) / 3));
    } else if (level <= 40) {                  // cấp 21-40: bậc 2 x (3 + floor(o/5))
        add(2, 3 + Math.floor((level - 21) / 5));
    } else if (level <= 60) {                  // cấp 41-60: bậc 3 x (1 + floor(o/10))
        add(3, 1 + Math.floor((level - 41) / 10));
    } else if (level <= 80) {                  // cấp 61-80: bậc 3 x 3, mốc 65/70/75/80 thêm 1 bậc 4
        add(3, 3);
        if (level % 5 === 0) add(4, 1);
    } else {                                   // cấp 81-100: bậc 4 x 1 (85, 95 là x2), mốc 90/100 thêm 1 bậc 5
        add(4, level === 85 || level === 95 ? 2 : 1);
        if (TIER5_LEVELS.includes(level)) add(5, 1);
    }
    return { level, fam, items };
}

// Chi phí Eira mỗi cấp: 30 + 1,5 x cấp^1,6
const eiraCost = (level) => Math.round(30 + 1.5 * Math.pow(level, 1.6));

// Cấp mốc bậc 5 gần nhất mà người chơi chưa đạt (để báo trước), hoặc null
const nextTier5Level = (current) => TIER5_LEVELS.find((l) => l > current) || null;

module.exports = { TIER5_LEVELS, requirement, eiraCost, nextTier5Level };