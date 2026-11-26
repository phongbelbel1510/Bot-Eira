// Bảng cá: [tên, độ hiếm, vùng, kg nhẹ nhất, kg nặng nhất, giá mỗi kg (Eira)]
// Muốn chỉnh giá cả một loài thì sửa số cuối dòng. Mỗi độ hiếm có 12 loài.
const RAW = [
    // common
    ['Cá rô phi', 'common', 'ao', 0.3, 1.5, 2.37],
    ['Cá diếc', 'common', 'ao', 0.2, 1, 3.55],
    ['Cá thòi lòi', 'common', 'ao', 0.1, 0.5, 7.1],
    ['Cá trê', 'common', 'song', 0.5, 2.5, 1.7],
    ['Cá bống', 'common', 'song', 0.1, 0.6, 7.33],
    ['Cá sặc', 'common', 'song', 0.1, 0.5, 8.52],
    ['Cá mè', 'common', 'ho', 0.8, 3, 1.61],
    ['Cá trôi', 'common', 'ho', 0.5, 2.5, 2.06],
    ['Cá trích', 'common', 'bien', 0.1, 0.5, 12.42],
    ['Cá cơm', 'common', 'bien', 0.05, 0.3, 21.39],
    ['Cá nục', 'common', 'dai', 0.2, 1, 7.45],
    ['Cá bạc má', 'common', 'dai', 0.2, 0.9, 8.11],
    // uncommon
    ['Cá chép', 'uncommon', 'ao', 1, 6, 1.71],
    ['Cá trắm đen', 'uncommon', 'ao', 2, 9, 1.07],
    ['Cá lóc đồng', 'uncommon', 'song', 0.8, 4, 2.95],
    ['Cá tra', 'uncommon', 'song', 2, 12, 1.03],
    ['Cá chình', 'uncommon', 'song', 1, 6, 2.05],
    ['Cá hồi vân', 'uncommon', 'ho', 1, 5, 2.86],
    ['Cá măng hồ', 'uncommon', 'ho', 1, 5, 2.86],
    ['Cá chim trắng', 'uncommon', 'ho', 1, 6, 2.48],
    ['Cá thu', 'uncommon', 'bien', 1, 6, 2.99],
    ['Cá chim biển', 'uncommon', 'bien', 0.8, 4, 4.31],
    ['Cá hố', 'uncommon', 'dai', 1, 5, 4.14],
    ['Cá bơn', 'uncommon', 'dai', 1, 7, 3.17],
    // rare
    ['Cá koi vàng', 'rare', 'ao', 2, 8, 3],
    ['Cá lăng', 'rare', 'song', 3, 18, 1.8],
    ['Cá bống tượng', 'rare', 'song', 2, 8, 3.6],
    ['Cá chạch lấu', 'rare', 'song', 2, 10, 3.09],
    ['Cá hồi Đại Tây Dương', 'rare', 'ho', 3, 14, 2.61],
    ['Cá vược sọc', 'rare', 'ho', 3, 12, 2.9],
    ['Cá hồi hồng', 'rare', 'ho', 3, 13, 2.75],
    ['Cá mú', 'rare', 'bien', 3, 25, 2.03],
    ['Cá hồng', 'rare', 'bien', 3, 15, 3],
    ['Cá bớp', 'rare', 'bien', 4, 20, 2.25],
    ['Cá ngừ vằn', 'rare', 'dai', 3, 15, 3.6],
    ['Cá đuối gai', 'rare', 'dai', 4, 20, 2.7],
    // epic
    ['Cá la hán', 'epic', 'ao', 3, 10, 8.09],
    ['Cá hô', 'epic', 'song', 15, 60, 1.75],
    ['Cá chiên', 'epic', 'song', 8, 40, 2.84],
    ['Cá lăng vàng', 'epic', 'song', 10, 45, 2.43],
    ['Cá tầm hồ', 'epic', 'ho', 20, 80, 1.58],
    ['Cá hồi vua', 'epic', 'ho', 10, 45, 2.94],
    ['Cá măng đao', 'epic', 'ho', 8, 35, 3.74],
    ['Cá ngừ vây vàng', 'epic', 'bien', 15, 70, 2.31],
    ['Cá cờ kiếm', 'epic', 'bien', 30, 120, 1.27],
    ['Cá mập nhám', 'epic', 'bien', 20, 90, 1.77],
    ['Cá ngừ vây xanh', 'epic', 'dai', 50, 200, 0.92],
    ['Cá cờ xanh', 'epic', 'dai', 60, 250, 0.74],
    // legendary
    ['Koi cầu vồng', 'legendary', 'ao', 4, 14, 23.91],
    ['Cá chép hóa rồng', 'legendary', 'song', 10, 45, 10.03],
    ['Cá lăng ma', 'legendary', 'song', 20, 80, 5.35],
    ['Cá tầm sương mù', 'legendary', 'ho', 60, 220, 2.26],
    ['Cá hồi tuyết', 'legendary', 'ho', 25, 90, 5.47],
    ['Cá lưỡi liềm băng', 'legendary', 'ho', 40, 150, 3.35],
    ['Cá mập trắng', 'legendary', 'bien', 150, 450, 1.2],
    ['Cá đuối quỷ', 'legendary', 'bien', 100, 400, 1.56],
    ['Cá thu hoàng kim', 'legendary', 'bien', 40, 150, 4.04],
    ['Cá mập voi', 'legendary', 'dai', 300, 900, 0.72],
    ['Cá đao', 'legendary', 'dai', 200, 600, 1.08],
    ['Cá mặt trăng', 'legendary', 'dai', 250, 800, 0.84],
    // mythic
    ['Cá thần ao tiên', 'mythic', 'ao', 8, 30, 66.67],
    ['Cá tiên gương', 'mythic', 'ao', 6, 24, 86.27],
    ['Giao long sông', 'mythic', 'song', 80, 300, 8],
    ['Thủy thần Hà Bá', 'mythic', 'song', 100, 400, 6.21],
    ['Thủy quái hồ băng', 'mythic', 'ho', 200, 700, 3.99],
    ['Cá tuyết ngàn năm', 'mythic', 'ho', 150, 500, 5.43],
    ['Rồng biển', 'mythic', 'bien', 400, 1500, 2.33],
    ['Kình ngư', 'mythic', 'bien', 600, 2000, 1.64],
    ['Cá tinh tú', 'mythic', 'bien', 300, 1000, 3.28],
    ['Cá voi tinh tú', 'mythic', 'dai', 2000, 8000, 0.54],
    ['Thủy quái cổ đại', 'mythic', 'dai', 1500, 6000, 0.72],
    ['Leviathan', 'mythic', 'dai', 3000, 10000, 0.39],
];

const FISH = RAW.map(([name, rarity, zone, min, max, price]) => ({ name, rarity, zone, min, max, price }));

// Thứ tự độ hiếm từ thấp đến cao
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const RARITY_NAME = {
    common: 'Thường', uncommon: 'Khá', rare: 'Hiếm',
    epic: 'Sử thi', legendary: 'Huyền thoại', mythic: 'Thần thoại',
};

// Trọng số gốc (cần cấp 0). Từ "rare" trở lên sẽ nhân thêm hệ số LUK của cần.
const RARITY_WEIGHT = { common: 58, uncommon: 26, rare: 10, epic: 4.5, legendary: 1.3, mythic: 0.2 };

// Cá càng hiếm càng khó ra nặng: kg = min + (max-min) * random^SKEW (số càng lớn càng lệch về phía nhẹ)
const SKEW = {common: 1.2, uncommon: 1.6, rare: 2, epic: 2.6, legendary: 3.4, mythic: 4.5};

module.exports = { FISH, RARITIES, RARITY_NAME, RARITY_WEIGHT, SKEW };