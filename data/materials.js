// Vật liệu nâng cấp cần câu: 4 nhóm x 5 bậc. Chỉ bậc 1 mua ở cửa hàng (emua),
// các bậc cao hơn chỉ có thể ghép từ bậc ngay dưới (eghep), tỉ lệ 10:1.
const MAX_TIER = 5;
const MERGE_RATIO = 10;          // 10 món bậc dưới -> 1 món bậc trên
const TIER1_PRICE = 2;           // giá 1 món bậc 1 ở cửa hàng (Eira)
const DAILY_BUY_LIMIT = 1000;    // mỗi ngày mua tối đa 1.000 món bậc 1 (chung cho 4 nhóm)
const MAX_MERGE_PER_CMD = 1000;  // mỗi lệnh eghep <số> tối đa 1.000 món ra

// names[0] = bậc 1 ... names[4] = bậc 5
const FAMILIES = [
    { key: 'day',     title: 'DÂY CÂU',  alias: ['day', 'daycau'],
      names: ['Sợi lanh', 'Dây tơ', 'Dây carbon', 'Dây vảy rồng', 'Dây tinh tú'] },
    { key: 'luoi',    title: 'LƯỠI CÂU', alias: ['luoi', 'luoicau'],
      names: ['Lưỡi sắt', 'Lưỡi thép', 'Lưỡi xương', 'Lưỡi bạch kim', 'Lưỡi ngọc'] },
    { key: 'than',    title: 'THÂN CẦN', alias: ['than', 'thancan'],
      names: ['Thân tre', 'Gỗ dẻo', 'Sợi thủy tinh', 'Thân carbon', 'Thân tinh thạch'] },
    { key: 'phukien', title: 'PHỤ KIỆN', alias: ['phukien', 'pk'],
      names: ['Phao nổi', 'Chuông báo cá', 'Ống quay', 'Mắt thần', 'Lõi sao'] },
];

// 16 công thức đánh số 1..16: nhóm 0 -> 1-4, nhóm 1 -> 5-8, ...
// fromTier 1..4 -> toTier = fromTier + 1
const RECIPES = [];
FAMILIES.forEach((f, fi) => {
    for (let t = 1; t < MAX_TIER; t++) {
        RECIPES.push({ id: fi * (MAX_TIER - 1) + t, fam: f.key, fromTier: t, toTier: t + 1 });
    }
});

const famOf = (key) => FAMILIES.find((f) => f.key === key);
const matName = (fam, tier) => famOf(fam).names[tier - 1];

// Bỏ dấu + bỏ khoảng trắng để so khớp tên người chơi gõ
function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/\s+/g, '');
}

function findFamily(text) {
    const t = norm(text);
    if (/^[1-4]$/.test(t)) return FAMILIES[Number(t) - 1];
    return FAMILIES.find((f) => f.alias.includes(t)) || null;
}

// Tìm công thức theo số (1-16) hoặc theo tên món bậc trên (vd "dây tơ", "luoi thep")
function findRecipe(text) {
    const t = norm(text);
    if (/^\d+$/.test(t)) return RECIPES.find((r) => r.id === Number(t)) || null;
    return RECIPES.find((r) => norm(matName(r.fam, r.toTier)) === t) || null;
}

module.exports = {
    MAX_TIER, MERGE_RATIO, TIER1_PRICE, DAILY_BUY_LIMIT, MAX_MERGE_PER_CMD,
    FAMILIES, RECIPES, famOf, matName, norm, findFamily, findRecipe,
};