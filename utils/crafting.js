// Logic ghép + kiểm tra vật liệu. Thuần tính toán trên đối tượng mats, không đụng database.
const { FAMILIES, RECIPES, MERGE_RATIO, MAX_TIER, matName } = require('../data/materials');
const { MAT } = require('../emojis');

const cloneMats = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v]]));
const icon = (fam, tier) => MAT[fam][tier - 1];
const label = (fam, tier) => `${icon(fam, tier)} ${matName(fam, tier)}`;

// Ghép tối đa `want` món bậc trên theo công thức r. Sửa trực tiếp mats.
// Trả về số món thực sự ra.
function mergeOne(mats, r, want = Infinity) {
    const have = mats[r.fam][r.fromTier - 1];
    const made = Math.min(want, Math.floor(have / MERGE_RATIO));
    if (made > 0) {
        mats[r.fam][r.fromTier - 1] -= made * MERGE_RATIO;
        mats[r.fam][r.toTier - 1] += made;
    }
    return made;
}

// Số món bậc trên tối đa ghép được ngay (không tính dây chuyền)
const canMake = (mats, r) => Math.floor(mats[r.fam][r.fromTier - 1] / MERGE_RATIO);

// Ghép sạch mọi công thức từ thấp lên cao. Bậc 2 vừa ghép ra được dùng luôn để ghép lên bậc 3...
// Trả về { results: [{ recipe, made }], total }
function mergeAll(mats) {
    const results = [];
    let total = 0;
    for (const r of RECIPES) {            // RECIPES đã xếp theo nhóm rồi bậc tăng dần
        const made = mergeOne(mats, r);
        if (made > 0) { results.push({ recipe: r, made }); total += made; }
    }
    return { results, total };
}

const previewMergeAll = (mats) => mergeAll(cloneMats(mats)).total;

// So kho với yêu cầu của một cấp. Trả về [{ fam, tier, need, have, ok }]
function checkReq(mats, req) {
    return req.items.map((it) => {
        const have = mats[it.fam][it.tier - 1];
        return { fam: it.fam, tier: it.tier, need: it.qty, have, ok: have >= it.qty };
    });
}

// Vd: "6× 🧵 Sợi lanh (có 37 ✅)"
const fmtCheck = (c) => `${c.need}× ${label(c.fam, c.tier)} (có ${c.have} ${c.ok ? '✅' : '❌'})`;

// Dòng nhắc sau khi ghép: còn thiếu gì cho cấp kế tiếp
function missingNote(mats, req) {
    if (!req) return '';
    const miss = checkReq(mats, req).filter((c) => !c.ok);
    if (!miss.length) return `✅ Đã đủ vật liệu nâng cấp lên cấp ${req.level} (\`enang\`).`;
    return `⚠️ Cấp ${req.level} còn thiếu: ` +
        miss.map((c) => `${c.need - c.have}× ${label(c.fam, c.tier)}`).join(', ') + '.';
}

module.exports = {
    cloneMats, icon, label, mergeOne, canMake, mergeAll, previewMergeAll,
    checkReq, fmtCheck, missingNote, FAMILIES, MAX_TIER,
};