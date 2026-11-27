// Cần câu: cấp 0..100. Cần xịn hơn: chờ cá cắn ngắn hơn, thời gian giật dài hơn,
// cá nặng hơn và LUK cao hơn (cá hiếm dễ ra hơn).
const MAX_LEVEL = 100;

// minLevel: cấp cần tối thiểu để vào vùng (mỗi 20 cấp là một bậc cần)
const ZONES = [
    { key: 'ao',   name: 'Ao làng',     emoji: '🏞️', minLevel: 0,  alias: ['ao'] },
    { key: 'song', name: 'Sông',        emoji: '🌊', minLevel: 20, alias: ['song'] },
    { key: 'ho',   name: 'Hồ núi',      emoji: '🏔️', minLevel: 40, alias: ['ho'] },
    { key: 'bien', name: 'Biển',        emoji: '🌅', minLevel: 60, alias: ['bien'] },
    { key: 'dai',  name: 'Đại dương',   emoji: '🐋', minLevel: 80, alias: ['dai', 'daiduong'] },
];

const CAST_COOLDOWN_MS = 8000;   // nghỉ giữa hai lần câu
const BIG_RATIO = 1.5;           // cá nặng hơn mức tối đa của loài x1,5 thì gọi là "cá khủng"

const clampLv = (l) => Math.max(0, Math.min(MAX_LEVEL, Math.floor(l) || 0));

const luk = (l) => clampLv(l);                         // LUK = cấp
const weightMult = (l) => 1 + 0.012 * clampLv(l);      // cấp 100 -> x2,2
const rareMult = (l) => 1 + 0.03 * clampLv(l);         // cấp 100 -> x4 (từ Hiếm trở lên)

// Chờ cá cắn: 6-12 giây ở cấp 0, còn 3-6 giây ở cấp 100
function waitRange(l) {
    const f = 1 - 0.5 * clampLv(l) / MAX_LEVEL;
    return [Math.round(6000 * f), Math.round(12000 * f)];
}

// Thời gian được bấm giật: 3,5 giây ở cấp 0, 7 giây ở cấp 100
const reactMs = (l) => Math.round(3500 + 35 * clampLv(l));

// Rương báu: siêu hiếm. 0,005% (1/20.000 lần) ở cấp 0, 0,01% ở cấp 100. Ra ở mọi vùng.
const chestChance = (l) => 0.00005 * (1 + 0.01 * clampLv(l));
// Rương chỉ để bán, giá ngẫu nhiên trong khoảng này (làm tròn đến nghìn)
const CHEST_MIN = 400000;
const CHEST_MAX = 700000;
const trashChance = (l) => 0.06 - 0.04 * clampLv(l) / MAX_LEVEL; // 6% -> 2%

const TRASH = [
    { name: 'Chiếc giày rách', value: 1 },
    { name: 'Đám rong rêu', value: 1 },
    { name: 'Lon nước rỉ sét', value: 2 },
    { name: 'Cành củi mục', value: 1 },
    { name: 'Chai nhựa rỗng', value: 2 },
];

const tierOf = (l) => ZONES.filter((z) => clampLv(l) >= z.minLevel).length; // bậc cần 1..5
const ROD_NAMES = ['Cần tre', 'Cần sắt', 'Cần carbon', 'Cần bạch kim', 'Cần ngọc']; // mỗi 20 cấp một mốc tên
const rodName = (l) => ROD_NAMES[tierOf(l) - 1];
const unlockedZones = (l) => ZONES.filter((z) => clampLv(l) >= z.minLevel);

function findZone(text) {
    const t = String(text || '').toLowerCase();
    return ZONES.find((z) => z.alias.includes(t)) || null;
}

module.exports = {
    MAX_LEVEL, ZONES, CAST_COOLDOWN_MS, BIG_RATIO, TRASH, CHEST_MIN, CHEST_MAX,
    clampLv, luk, weightMult, rareMult, waitRange, reactMs,
    chestChance, trashChance, tierOf, rodName, unlockedZones, findZone,
};