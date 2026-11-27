// Nâng cấp cần câu: trừ vật liệu + Eira, tăng cấp. Chạy đồng bộ trong một giao dịch.
const { raw, getUser, getMats, setMats, setRodLevel, spend } = require('./db');
const { requirement, eiraCost } = require('../data/upgrades');
const { MAX_LEVEL } = require('../data/rods');
const { checkReq } = require('./crafting');

// Nâng tối đa `steps` cấp. Dừng ngay khi thiếu vật liệu / thiếu Eira / đạt cấp tối đa.
// Trả về { from, to, steps, spent, used, stop, req, check, cost }
//   stop: null (nâng đủ số cấp muốn) | 'max' | 'mats' | 'money'
function upgradeRod(id, steps) {
    raw.exec('BEGIN');
    try {
        const u = getUser(id);
        const mats = getMats(id);
        const from = u.rod_level;
        let level = from;
        let eira = u.eira;
        let spent = 0;
        const used = {};          // { 'day|1': 12, ... }
        let stop = null, req = null, check = null, cost = 0;

        for (let i = 0; i < steps; i++) {
            if (level >= MAX_LEVEL) { stop = 'max'; break; }
            req = requirement(level + 1);
            cost = eiraCost(level + 1);
            check = checkReq(mats, req);
            if (check.some((c) => !c.ok)) { stop = 'mats'; break; }
            if (eira < cost) { stop = 'money'; break; }
            for (const it of req.items) {
                mats[it.fam][it.tier - 1] -= it.qty;
                const k = `${it.fam}|${it.tier}`;
                used[k] = (used[k] || 0) + it.qty;
            }
            eira -= cost; spent += cost; level++;
            req = null; check = null;
        }

        if (level > from) {
            setMats(id, mats, { tx: false });        // đã ở trong giao dịch ngoài
            spend(id, spent);
            setRodLevel(id, level);
        }
        raw.exec('COMMIT');
        return { from, to: level, steps: level - from, spent, used, stop, req, check, cost };
    } catch (e) {
        try { raw.exec('ROLLBACK'); } catch {}
        throw e;
    }
}

module.exports = { upgradeRod };