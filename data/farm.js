// Dữ liệu vườn (evuon): 30 loại hạt giống, giá, thời gian lớn, XP, giá mở ô, vật phẩm.
// Cân bằng: hạt càng đắt thì lớn càng lâu, bán càng nhiều và LÃI MỖI GIỜ MỖI Ô càng cao
// (hạt 10 phút: ~1.200 Eira/giờ/ô, hạt 6 giờ: ~3.500 Eira/giờ/ô). Vì vậy trồng hạt rẻ rồi cứ 10 phút thu một lần
// không bao giờ lãi hơn việc trồng hạt lâu, chỉ là hạt lâu cần cấp vườn cao và vốn lớn hơn.
const MAX_LEVEL = 100;
const MAX_PLOTS = 8;
const START_PLOTS = 3;

// Mở ô thứ 4, 5, 6, 7, 8 (Eira)
const PLOT_PRICE = [30000, 120000, 400000, 1200000, 3000000];

// Hiệu ứng (cộng dồn): tưới nước -10% thời gian, phân bón -25% thời gian, thuốc tăng trưởng +15% giá bán
const WATER_CUT = 0.10;
const FERT_CUT = 0.25;
const POTION_BONUS = 0.15;

// Vật phẩm bán ở eshopvuon (mỗi lần dùng cho một ô, một lứa)
const ITEMS = [
    { key: 'fert',   name: 'Phân bón',          emoji: '🧪', price: 2500, alias: ['phanbon', 'phan', 'fert'],
      desc: 'Giảm 25% thời gian lớn của một ô (một lứa).' },
    { key: 'potion', name: 'Thuốc tăng trưởng', emoji: '✨', price: 4000, alias: ['thuoc', 'thuoctangtruong', 'potion'],
      desc: 'Tăng 15% giá bán khi thu hoạch một ô (một lứa).' },
];

// Cấp vườn: XP cần để lên cấp L+1. Nhận XP khi thu hoạch (xp của hạt).
const needXp = (L) => Math.round(70 + 15 * L + 0.5 * L * L);

// 30 loại, xếp theo thời gian lớn. min: phút lớn (chưa tính tưới / phân bón), từ 10 phút đến 6 giờ.
// level: cấp vườn cần để MUA hạt. 14 hạt mở sẵn (level 1), 16 hạt cần từ cấp vườn 20 trở lên.
// Cân bằng: hạt lâu hơn thì giá mua cao hơn và lãi mỗi giờ cũng cao hơn (xem cột lãi/giờ trong evuon hat).
const SEEDS = [
    { key: 'rau_muong',      name: 'Rau muống',      emoji: '🥬', level: 1,  min: 10,  cost: 100,   sell: 300,   xp: 10 },
    { key: 'dua_leo',        name: 'Dưa leo',        emoji: '🥒', level: 1,  min: 15,  cost: 190,   sell: 540,   xp: 12 },
    { key: 'ca_chua',        name: 'Cà chua',        emoji: '🍅', level: 1,  min: 20,  cost: 300,   sell: 800,   xp: 14 },
    { key: 'hanh_tay',       name: 'Hành tây',       emoji: '🧅', level: 1,  min: 25,  cost: 410,   sell: 1050,  xp: 16 },
    { key: 'ngo',            name: 'Bắp ngô',        emoji: '🌽', level: 1,  min: 30,  cost: 550,   sell: 1350,  xp: 17 },
    { key: 'toi',            name: 'Tỏi',            emoji: '🧄', level: 1,  min: 35,  cost: 690,   sell: 1700,  xp: 19 },
    { key: 'ot_chuong',      name: 'Ớt chuông',      emoji: '🫑', level: 1,  min: 40,  cost: 850,   sell: 2050,  xp: 20 },
    { key: 'ca_rot',         name: 'Cà rốt',         emoji: '🥕', level: 1,  min: 45,  cost: 1000,  sell: 2450,  xp: 21 },
    { key: 'ca_tim',         name: 'Cà tím',         emoji: '🍆', level: 1,  min: 50,  cost: 1200,  sell: 2850,  xp: 22 },
    { key: 'khoai_tay',      name: 'Khoai tây',      emoji: '🥔', level: 1,  min: 60,  cost: 1600,  sell: 3650,  xp: 24 },
    { key: 'sup_lo',         name: 'Súp lơ xanh',    emoji: '🥦', level: 1,  min: 65,  cost: 1850,  sell: 4100,  xp: 25 },
    { key: 'khoai_lang',     name: 'Khoai lang',     emoji: '🍠', level: 1,  min: 75,  cost: 2350,  sell: 5100,  xp: 27 },
    { key: 'chanh',          name: 'Chanh',          emoji: '🍋', level: 1,  min: 80,  cost: 2650,  sell: 5600,  xp: 28 },
    { key: 'bi_ngo',         name: 'Bí ngô',         emoji: '🎃', level: 1,  min: 90,  cost: 3200,  sell: 6700,  xp: 30 },
    { key: 'anh_dao',        name: 'Anh đào',        emoji: '🍒', level: 20, min: 105, cost: 4200,  sell: 8500,  xp: 32 },
    { key: 'dau_tay',        name: 'Dâu tây',        emoji: '🍓', level: 20, min: 120, cost: 5300,  sell: 10400, xp: 35 },
    { key: 'dao',            name: 'Đào',            emoji: '🍑', level: 25, min: 135, cost: 6500,  sell: 12400, xp: 37 },
    { key: 'nho',            name: 'Nho',            emoji: '🍇', level: 30, min: 150, cost: 7800,  sell: 14600, xp: 39 },
    { key: 'dua_thom',       name: 'Dứa thơm',       emoji: '🍍', level: 35, min: 165, cost: 9300,  sell: 17000, xp: 41 },
    { key: 'dua_hau',        name: 'Dưa hấu',        emoji: '🍉', level: 40, min: 180, cost: 10800, sell: 19300, xp: 42 },
    { key: 'xoai',           name: 'Xoài',           emoji: '🥭', level: 45, min: 210, cost: 14400, sell: 25000, xp: 46 },
    { key: 'hoa_hong',       name: 'Hoa hồng',       emoji: '🌹', level: 50, min: 240, cost: 18600, sell: 31000, xp: 49 },
    { key: 'huong_duong',    name: 'Hướng dương',    emoji: '🌻', level: 55, min: 255, cost: 21000, sell: 34500, xp: 50 },
    { key: 'hoa_sen',        name: 'Hoa sen',        emoji: '🪷', level: 60, min: 270, cost: 23500, sell: 38000, xp: 52 },
    { key: 'cuc_hoa_mi',     name: 'Cúc họa mi',     emoji: '🌼', level: 65, min: 285, cost: 26000, sell: 41500, xp: 53 },
    { key: 'nam_linh_chi',   name: 'Nấm linh chi',   emoji: '🍄', level: 70, min: 300, cost: 29000, sell: 45500, xp: 55 },
    { key: 'dua_xiem',       name: 'Dừa xiêm',       emoji: '🥥', level: 75, min: 315, cost: 32000, sell: 50000, xp: 56 },
    { key: 'nhan_sam',       name: 'Nhân sâm',       emoji: '🌿', level: 80, min: 330, cost: 35000, sell: 54000, xp: 57 },
    { key: 'tra_xanh',       name: 'Trà xanh',       emoji: '🍵', level: 85, min: 345, cost: 38500, sell: 58500, xp: 59 },
    { key: 'tuyet_lien_hoa', name: 'Tuyết liên hoa', emoji: '❄️', level: 90, min: 360, cost: 42000, sell: 63000, xp: 60 },
];
for (const s of SEEDS) { s.growMs = s.min * 60000; s.profit = s.sell - s.cost; s.perHour = s.profit / (s.min / 60); }

// Bỏ dấu, khoảng trắng và gạch dưới để so khớp tên người chơi gõ ("tuyet_lien_hoa", "Tuyết liên hoa", "tuyetlienhoa")
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[\s_\-]+/g, '');

const seedByKey = (k) => SEEDS.find((s) => s.key === k) || null;
function findSeed(text) {
    const t = norm(text);
    if (!t) return null;
    return SEEDS.find((s) => norm(s.key) === t || norm(s.name) === t) || null;
}
function findItem(text) {
    const t = norm(text);
    if (/^[12]$/.test(t)) return ITEMS[Number(t) - 1];
    return ITEMS.find((i) => i.alias.includes(t) || norm(i.name) === t) || null;
}

module.exports = {
    MAX_LEVEL, MAX_PLOTS, START_PLOTS, PLOT_PRICE, WATER_CUT, FERT_CUT, POTION_BONUS,
    ITEMS, SEEDS, needXp, norm, seedByKey, findSeed, findItem,
};