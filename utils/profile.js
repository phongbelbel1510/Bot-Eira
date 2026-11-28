// utils/profile.js: gom dữ liệu hiện lên thẻ hồ sơ (ecard). Chỉ đọc database, không vẽ gì.
// Kết quả là object thuần (JSON), đưa thẳng cho cardRenderer.js.
const { raw, getUser, buyLeft } = require('./db');
const { sortedBag } = require('./bag');
const rods = require('../data/rods');
const { DAILY_BUY_LIMIT } = require('../data/materials');

// Công tắc tính năng. Làm xong tính năng nào thì bật true và nối dữ liệu thật vào getProfile bên dưới.
//   bank: ngân hàng (tiền gửi không bị cướp). Chưa có thì thẻ hiện "Sắp ra mắt".
//   daily: nhiệm vụ / điểm danh hàng ngày. Chưa có thì ô thứ 3 hiện "Sắp ra mắt".
const FEATURES = { bank: false, daily: false };

const hasUser = (id) => !!raw.prepare('SELECT 1 FROM users WHERE id = ?').get(id);

// Còn bao lâu đến 0h giờ Việt Nam (lúc giới hạn mua nguyên liệu reset)
function msUntilReset() {
    const now = Date.now() + 7 * 3600 * 1000;
    return (Math.floor(now / 86400000) + 1) * 86400000 - now;
}
function fmtDur(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(m / 60);
    return h > 0 ? `${h} giờ ${m % 60} phút` : `${m} phút`;
}
const fmtN = (n) => Math.round(n).toLocaleString('vi-VN');

function getProfile(id) {
    const u = getUser(id);
    const wallet = u.eira;          // tiền trong ví: sau này có thể bị cướp
    const bank = 0;                 // tiền trong ngân hàng: không bị cướp (chưa có, nối vào đây khi làm)
    const level = u.rod_level;

    // hạng giàu: so theo tổng tài sản (hiện là ví + ngân hàng)
    const richer = raw.prepare('SELECT COUNT(*) AS c FROM users WHERE eira > ?').get(wallet).c;
    const total = raw.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const fishTotal = raw.prepare('SELECT COALESCE(SUM(n), 0) AS n FROM rarity_counts WHERE user_id = ?').get(id).n;

    const bag = getBagStats(id);
    const left = buyLeft(id);

    // 3 ô "nhịp độ hàng ngày" ở cuối thẻ. status: ready (xanh) | wait (vàng) | idle (xám) | soon (xám, chưa có tính năng)
    const activities = [
        {
            title: 'NGUYÊN LIỆU HÔM NAY', cmd: 'eshopcan',
            status: left > 0 ? 'ready' : 'wait',
            line: left > 0 ? `Sẵn sàng · còn ${fmtN(left)}/${fmtN(DAILY_BUY_LIMIT)} món` : `Hết lượt · reset sau ${fmtDur(msUntilReset())}`,
        },
        {
            title: 'TÚI CÁ', cmd: 'eca',
            status: bag.count > 0 ? 'ready' : 'idle',
            line: bag.count > 0 ? `${fmtN(bag.count)} món · ${fmtN(bag.value)} Eira` : 'Túi trống · gõ ecau để đi câu',
        },
        // Ô thứ 3: nhiệm vụ / điểm danh hàng ngày. Chưa làm nên báo "Sắp ra mắt".
        { title: 'NHIỆM VỤ HÀNG NGÀY', cmd: null, status: 'soon', line: 'Sắp ra mắt' },
    ];

    return {
        id,
        wallet, bank, bankOn: FEATURES.bank,
        netWorth: wallet + bank,
        rank: richer + 1, total,
        joined: u.created_at,
        rod: { level, max: rods.MAX_LEVEL, name: rods.rodName(level) },
        bestFish: u.best_fish, bestKg: u.best_kg,
        chests: u.chests, fishTotal,
        activities,
    };
}

function getBagStats(id) {
    const bag = sortedBag(id);
    return { count: bag.reduce((s, b) => s + b.qty, 0), value: bag.reduce((s, b) => s + b.value, 0) };
}

module.exports = { getProfile, hasUser, FEATURES };