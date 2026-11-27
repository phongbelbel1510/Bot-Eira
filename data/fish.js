// Bảng cá: [tên, độ hiếm, vùng, kg nhẹ nhất, kg nặng nhất]. Mỗi độ hiếm có 12 loài.
// Giá bán không ghi ở đây: xem BASE_PRICE (giá nền theo độ hiếm) và PRICE_MULT (chỉnh riêng từng loài) ở cuối file.
const RAW = [
    // common
    ['Cá rô phi', 'common', 'ao', 0.3, 1.5],
    ['Cá diếc', 'common', 'ao', 0.2, 1],
    ['Cá thòi lòi', 'common', 'ao', 0.1, 0.5],
    ['Cá trê', 'common', 'song', 0.5, 2.5],
    ['Cá bống', 'common', 'song', 0.1, 0.6],
    ['Cá sặc', 'common', 'song', 0.1, 0.5],
    ['Cá mè', 'common', 'ho', 0.8, 3],
    ['Cá trôi', 'common', 'ho', 0.5, 2.5],
    ['Cá trích', 'common', 'bien', 0.1, 0.5],
    ['Cá cơm', 'common', 'bien', 0.05, 0.3],
    ['Cá nục', 'common', 'dai', 0.2, 1],
    ['Cá bạc má', 'common', 'dai', 0.2, 0.9],
    // uncommon
    ['Cá chép', 'uncommon', 'ao', 1, 6],
    ['Cá trắm đen', 'uncommon', 'ao', 2, 9],
    ['Cá lóc đồng', 'uncommon', 'song', 0.8, 4],
    ['Cá tra', 'uncommon', 'song', 2, 12],
    ['Cá chình', 'uncommon', 'song', 1, 6],
    ['Cá hồi vân', 'uncommon', 'ho', 1, 5],
    ['Cá măng hồ', 'uncommon', 'ho', 1, 5],
    ['Cá chim trắng', 'uncommon', 'ho', 1, 6],
    ['Cá thu', 'uncommon', 'bien', 1, 6],
    ['Cá chim biển', 'uncommon', 'bien', 0.8, 4],
    ['Cá hố', 'uncommon', 'dai', 1, 5],
    ['Cá bơn', 'uncommon', 'dai', 1, 7],
    // rare
    ['Cá koi vàng', 'rare', 'ao', 2, 8],
    ['Cá lăng', 'rare', 'song', 3, 18],
    ['Cá bống tượng', 'rare', 'song', 2, 8],
    ['Cá chạch lấu', 'rare', 'song', 2, 10],
    ['Cá hồi Đại Tây Dương', 'rare', 'ho', 3, 14],
    ['Cá vược sọc', 'rare', 'ho', 3, 12],
    ['Cá hồi hồng', 'rare', 'ho', 3, 13],
    ['Cá mú', 'rare', 'bien', 3, 25],
    ['Cá hồng', 'rare', 'bien', 3, 15],
    ['Cá bớp', 'rare', 'bien', 4, 20],
    ['Cá ngừ vằn', 'rare', 'dai', 3, 15],
    ['Cá đuối gai', 'rare', 'dai', 4, 20],
    // epic
    ['Cá la hán', 'epic', 'ao', 3, 10],
    ['Cá hô', 'epic', 'song', 15, 60],
    ['Cá chiên', 'epic', 'song', 8, 40],
    ['Cá lăng vàng', 'epic', 'song', 10, 45],
    ['Cá tầm hồ', 'epic', 'ho', 20, 80],
    ['Cá hồi vua', 'epic', 'ho', 10, 45],
    ['Cá măng đao', 'epic', 'ho', 8, 35],
    ['Cá ngừ vây vàng', 'epic', 'bien', 15, 70],
    ['Cá cờ kiếm', 'epic', 'bien', 30, 120],
    ['Cá mập nhám', 'epic', 'bien', 20, 90],
    ['Cá ngừ vây xanh', 'epic', 'dai', 50, 200],
    ['Cá cờ xanh', 'epic', 'dai', 60, 250],
    // legendary
    ['Koi cầu vồng', 'legendary', 'ao', 4, 14],
    ['Cá chép hóa rồng', 'legendary', 'song', 10, 45],
    ['Cá lăng ma', 'legendary', 'song', 20, 80],
    ['Cá tầm sương mù', 'legendary', 'ho', 60, 220],
    ['Cá hồi tuyết', 'legendary', 'ho', 25, 90],
    ['Cá lưỡi liềm băng', 'legendary', 'ho', 40, 150],
    ['Cá mập trắng', 'legendary', 'bien', 150, 450],
    ['Cá đuối quỷ', 'legendary', 'bien', 100, 400],
    ['Cá thu hoàng kim', 'legendary', 'bien', 40, 150],
    ['Cá mập voi', 'legendary', 'dai', 300, 900],
    ['Cá đao', 'legendary', 'dai', 200, 600],
    ['Cá mặt trăng', 'legendary', 'dai', 250, 800],
    // mythic
    ['Cá thần ao tiên', 'mythic', 'ao', 8, 30],
    ['Cá tiên gương', 'mythic', 'ao', 6, 24],
    ['Giao long sông', 'mythic', 'song', 80, 300],
    ['Thủy thần Hà Bá', 'mythic', 'song', 100, 400],
    ['Thủy quái hồ băng', 'mythic', 'ho', 200, 700],
    ['Cá tuyết ngàn năm', 'mythic', 'ho', 150, 500],
    ['Rồng biển', 'mythic', 'bien', 400, 1500],
    ['Kình ngư', 'mythic', 'bien', 600, 2000],
    ['Cá tinh tú', 'mythic', 'bien', 300, 1000],
    ['Cá voi tinh tú', 'mythic', 'dai', 2000, 8000],
    ['Thủy quái cổ đại', 'mythic', 'dai', 1500, 6000],
    ['Leviathan', 'mythic', 'dai', 3000, 10000],
];

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

// GIÁ NỀN theo độ hiếm (Eira): giá của một con cá có khối lượng TRUNG BÌNH của loài (cần cấp 0).
// Con nặng hơn thì giá tăng tỉ lệ thuận với cân nặng.
const BASE_PRICE = { common: 100, uncommon: 500, rare: 2500, epic: 12000, legendary: 60000, mythic: 300000 };

// Muốn một loài đắt/rẻ hơn mức nền của độ hiếm thì ghi hệ số vào đây. VD: { 'Leviathan': 1.5 }
const PRICE_MULT = {};

// Khối lượng trung bình khi bốc ngẫu nhiên (cần cấp 0): min + (max-min)/(SKEW+1)
const meanKg = (min, max, rarity) => min + (max - min) / (SKEW[rarity] + 1);

// price = Eira mỗi kg, tự tính để cá nặng trung bình bán đúng giá nền.
const FISH = RAW.map(([name, rarity, zone, min, max]) => ({
    name, rarity, zone, min, max,
    price: (BASE_PRICE[rarity] * (PRICE_MULT[name] ?? 1)) / meanKg(min, max, rarity),
}));

module.exports = { FISH, RARITIES, RARITY_NAME, RARITY_WEIGHT, SKEW, BASE_PRICE };