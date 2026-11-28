// utils/profile.js: gom dữ liệu hiện lên thẻ hồ sơ (ecard). Chỉ đọc database, không vẽ gì.
// Kết quả là object thuần (JSON), đưa thẳng cho cardRenderer.js.
const { raw, getUser, getMats } = require('./db');
const { sortedBag } = require('./bag');
const { checkReq } = require('./crafting');
const { requirement, eiraCost } = require('../data/upgrades');
const rods = require('../data/rods');

// Công tắc tính năng. Làm xong tính năng nào thì bật true và nối dữ liệu thật vào getProfile bên dưới.
//   bank: ngân hàng (tiền gửi không bị cướp). Chưa có thì thẻ hiện "Sắp ra mắt".
//   daily: nhiệm vụ / điểm danh hàng ngày. Chưa có thì ô thứ 3 hiện "Sắp ra mắt".
const FEATURES = { bank: false, daily: false };

const hasUser = (id) => !!raw.prepare('SELECT 1 FROM users WHERE id = ?').get(id);

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

    // 3 ô "nhịp độ hàng ngày" ở cuối thẻ. status: ready (xanh) | wait (vàng) | idle (xám) | soon (xám, chưa có tính năng)
    const activities = [
        { title: 'NÂNG CẦN CÂU', cmd: 'enangcan', ...upgradeStatus(u, id) },
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

// Ô "nâng cần câu": đủ nguyên liệu và Eira để nâng lên cấp kế chưa
function upgradeStatus(u, id) {
    if (u.rod_level >= rods.MAX_LEVEL) return { status: 'idle', line: 'Cần câu đã đạt cấp tối đa' };
    const next = requirement(u.rod_level + 1);
    const lackMats = checkReq(getMats(id), next).some((c) => !c.ok);
    const lackEira = u.eira < eiraCost(next.level);
    if (!lackMats && !lackEira) return { status: 'ready', line: `Đủ điều kiện nâng lên cấp ${next.level}` };
    const what = lackMats && lackEira ? 'nguyên liệu và Eira' : lackMats ? 'nguyên liệu' : 'Eira';
    return { status: 'wait', line: `Cấp ${next.level}: thiếu ${what}` };
}

function getBagStats(id) {
    const bag = sortedBag(id);
    return { count: bag.reduce((s, b) => s + b.qty, 0), value: bag.reduce((s, b) => s + b.value, 0) };
}

module.exports = { getProfile, hasUser, FEATURES };