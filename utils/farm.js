// utils/farm.js: toàn bộ logic vườn (evuon): trồng, tưới, bón phân, thuốc, thu hoạch, mua hạt, mở ô.
// Mọi hàm chạy đồng bộ (SQLite) và nhận `now` để dễ kiểm thử. Hàm trả về object { ok, reason?, ... }, không tự viết chữ.
// Bảng tạo tự động khi nạp file, không đụng vào bảng cũ.
const { raw, getUser } = require('./db');
const F = require('../data/farm');

raw.exec(`
CREATE TABLE IF NOT EXISTS farm_profile (
    user_id TEXT PRIMARY KEY,
    level   INTEGER NOT NULL DEFAULT 1,
    xp      INTEGER NOT NULL DEFAULT 0,
    plots   INTEGER NOT NULL DEFAULT ${F.START_PLOTS},
    fert    INTEGER NOT NULL DEFAULT 0,
    potion  INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS farm_seeds (
    user_id TEXT NOT NULL,
    seed    TEXT NOT NULL,
    qty     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, seed)
);
CREATE TABLE IF NOT EXISTS farm_plots (
    user_id    TEXT NOT NULL,
    slot       INTEGER NOT NULL,
    seed       TEXT NOT NULL,
    planted_at INTEGER NOT NULL,
    grow_ms    INTEGER NOT NULL,
    watered    INTEGER NOT NULL DEFAULT 0,
    fert       INTEGER NOT NULL DEFAULT 0,
    potion     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, slot)
);
`);

// Thời gian lớn thực = grow_ms x (1 - 25% nếu bón phân - 10% nếu đã tưới)
const factor = (r) => 1 - F.FERT_CUT * r.fert - F.WATER_CUT * r.watered;
const readyAtOf = (r) => r.planted_at + Math.round(r.grow_ms * factor(r));

function ensure(id) {
    getUser(id);
    raw.prepare('INSERT OR IGNORE INTO farm_profile (user_id) VALUES (?)').run(id);
}

// Trạng thái vườn: { level, xp, need, plotCount, plots: [null | { slot, seed, watered, fert, potion, readyAt, ready, remaining }], seeds: {key: qty}, fert, potion }
function getFarm(id, now = Date.now()) {
    ensure(id);
    const pr = raw.prepare('SELECT * FROM farm_profile WHERE user_id = ?').get(id);
    const seeds = {};
    for (const r of raw.prepare('SELECT seed, qty FROM farm_seeds WHERE user_id = ? AND qty > 0').all(id)) seeds[r.seed] = r.qty;
    const plots = Array.from({ length: pr.plots }, () => null);
    for (const r of raw.prepare('SELECT * FROM farm_plots WHERE user_id = ?').all(id)) {
        const seed = F.seedByKey(r.seed);
        if (!seed || r.slot < 1 || r.slot > pr.plots) continue;
        const readyAt = readyAtOf(r);
        plots[r.slot - 1] = {
            slot: r.slot, seed, watered: !!r.watered, fert: !!r.fert, potion: !!r.potion,
            readyAt, ready: readyAt <= now, remaining: Math.max(0, readyAt - now),
        };
    }
    return { id, level: pr.level, xp: pr.xp, need: F.needXp(pr.level), plotCount: pr.plots, plots, seeds, fert: pr.fert, potion: pr.potion };
}

// "all" | "3" | "v3" | "o3" | "1,3,5" -> mảng số ô hợp lệ, hoặc null nếu sai
function parseSlots(spec, plotCount) {
    const t = F.norm(spec || 'all');
    if (t === 'all' || t === 'tatca') return Array.from({ length: plotCount }, (_, i) => i + 1);
    const out = [];
    for (const part of String(spec).split(',')) {
        const m = F.norm(part).match(/^[vo]?(\d+)$/);
        if (!m) return null;
        const n = Number(m[1]);
        if (n < 1 || n > plotCount) return null;
        if (!out.includes(n)) out.push(n);
    }
    return out.length ? out : null;
}

const withTx = (fn) => {
    raw.exec('BEGIN');
    try { const r = fn(); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; }
};

// ---------- mua hạt / vật phẩm / mở ô ----------
function buySeed(id, key, qty) {
    const seed = F.seedByKey(key);
    if (!seed) return { ok: false, reason: 'seed' };
    qty = Math.floor(qty);
    if (!(qty > 0)) return { ok: false, reason: 'qty' };
    const f = getFarm(id);
    if (f.level < seed.level) return { ok: false, reason: 'level', need: seed.level, level: f.level, seed };
    const cost = qty * seed.cost;
    if (!Number.isSafeInteger(cost) || getUser(id).eira < cost) return { ok: false, reason: 'money', cost, seed };
    withTx(() => {
        raw.prepare('UPDATE users SET eira = eira - ? WHERE id = ?').run(cost, id);
        raw.prepare(`INSERT INTO farm_seeds (user_id, seed, qty) VALUES (?, ?, ?)
            ON CONFLICT(user_id, seed) DO UPDATE SET qty = qty + excluded.qty`).run(id, key, qty);
    });
    return { ok: true, seed, qty, cost };
}

function buyItem(id, key, qty) {
    const item = F.ITEMS.find((i) => i.key === key);
    if (!item) return { ok: false, reason: 'item' };
    qty = Math.floor(qty);
    if (!(qty > 0)) return { ok: false, reason: 'qty' };
    getFarm(id);
    const cost = qty * item.price;
    if (!Number.isSafeInteger(cost) || getUser(id).eira < cost) return { ok: false, reason: 'money', cost, item };
    withTx(() => {
        raw.prepare('UPDATE users SET eira = eira - ? WHERE id = ?').run(cost, id);
        raw.prepare(`UPDATE farm_profile SET ${key} = ${key} + ? WHERE user_id = ?`).run(qty, id);
    });
    return { ok: true, item, qty, cost };
}

// Mở ô tiếp theo (tối đa 8 ô)
function unlockPlot(id) {
    const f = getFarm(id);
    if (f.plotCount >= F.MAX_PLOTS) return { ok: false, reason: 'max' };
    const cost = F.PLOT_PRICE[f.plotCount - F.START_PLOTS];
    if (getUser(id).eira < cost) return { ok: false, reason: 'money', cost, next: f.plotCount + 1 };
    withTx(() => {
        raw.prepare('UPDATE users SET eira = eira - ? WHERE id = ?').run(cost, id);
        raw.prepare('UPDATE farm_profile SET plots = plots + 1 WHERE user_id = ?').run(id);
    });
    return { ok: true, plot: f.plotCount + 1, cost };
}

// ---------- trồng ----------
function plant(id, spec, seedKey, now = Date.now()) {
    const seed = F.seedByKey(seedKey);
    if (!seed) return { ok: false, reason: 'seed' };
    const f = getFarm(id, now);
    if (f.level < seed.level) return { ok: false, reason: 'level', need: seed.level, level: f.level, seed };
    const slots = parseSlots(spec, f.plotCount);
    if (!slots) return { ok: false, reason: 'slot', plotCount: f.plotCount };
    const targets = slots.filter((s) => !f.plots[s - 1]);
    if (!targets.length) return { ok: false, reason: 'occupied' };
    const have = f.seeds[seed.key] || 0;
    if (!have) return { ok: false, reason: 'noseed', seed, need: targets.length };
    const use = targets.slice(0, have);
    withTx(() => {
        const ins = raw.prepare('INSERT INTO farm_plots (user_id, slot, seed, planted_at, grow_ms) VALUES (?, ?, ?, ?, ?)');
        for (const s of use) ins.run(id, s, seed.key, now, seed.growMs);
        raw.prepare('UPDATE farm_seeds SET qty = qty - ? WHERE user_id = ? AND seed = ?').run(use.length, id, seed.key);
    });
    return { ok: true, seed, planted: use, missing: targets.length - use.length };
}

// ---------- tưới / phân bón / thuốc ----------
function water(id, spec, now = Date.now()) {
    const f = getFarm(id, now);
    const slots = parseSlots(spec, f.plotCount);
    if (!slots) return { ok: false, reason: 'slot', plotCount: f.plotCount };
    const targets = slots.filter((s) => { const p = f.plots[s - 1]; return p && !p.ready && !p.watered; });
    if (!targets.length) return { ok: true, count: 0 };
    withTx(() => {
        const up = raw.prepare('UPDATE farm_plots SET watered = 1 WHERE user_id = ? AND slot = ?');
        for (const s of targets) up.run(id, s);
    });
    return { ok: true, count: targets.length };
}

function applyItem(id, spec, now, key, eligible) {
    const f = getFarm(id, now);
    const slots = parseSlots(spec, f.plotCount);
    if (!slots) return { ok: false, reason: 'slot', plotCount: f.plotCount };
    const targets = slots.filter((s) => { const p = f.plots[s - 1]; return p && eligible(p); });
    if (!targets.length) return { ok: true, count: 0, left: f[key] };
    if (f[key] <= 0) return { ok: false, reason: 'noitem' };
    const use = targets.slice(0, f[key]);
    withTx(() => {
        const up = raw.prepare(`UPDATE farm_plots SET ${key} = 1 WHERE user_id = ? AND slot = ?`);
        for (const s of use) up.run(id, s);
        raw.prepare(`UPDATE farm_profile SET ${key} = ${key} - ? WHERE user_id = ?`).run(use.length, id);
    });
    return { ok: true, count: use.length, left: f[key] - use.length, skipped: targets.length - use.length };
}
// Phân bón: ô đang lớn (chưa chín) và chưa bón. Thuốc: ô có cây (kể cả đã chín, chưa thu) và chưa dùng thuốc.
const fertilize = (id, spec, now = Date.now()) => applyItem(id, spec, now, 'fert', (p) => !p.ready && !p.fert);
const growthPotion = (id, spec, now = Date.now()) => applyItem(id, spec, now, 'potion', (p) => !p.potion);

// ---------- thu hoạch (bán ngay lấy Eira) ----------
function harvest(id, spec, now = Date.now()) {
    const f = getFarm(id, now);
    const slots = parseSlots(spec, f.plotCount);
    if (!slots) return { ok: false, reason: 'slot', plotCount: f.plotCount };
    const targets = slots.filter((s) => f.plots[s - 1]?.ready);
    if (!targets.length) {
        const growing = slots.map((s) => f.plots[s - 1]).filter((p) => p && !p.ready);
        return { ok: false, reason: 'none', soonest: growing.length ? Math.min(...growing.map((p) => p.remaining)) : null };
    }
    const items = targets.map((s) => {
        const p = f.plots[s - 1];
        return { slot: s, seed: p.seed, potion: p.potion, price: Math.round(p.seed.sell * (1 + F.POTION_BONUS * (p.potion ? 1 : 0))) };
    });
    const total = items.reduce((a, b) => a + b.price, 0);
    const xpGain = items.reduce((a, b) => a + b.seed.xp, 0);

    let level = f.level, xp = f.xp + xpGain;
    while (level < F.MAX_LEVEL && xp >= F.needXp(level)) { xp -= F.needXp(level); level++; }

    withTx(() => {
        const del = raw.prepare('DELETE FROM farm_plots WHERE user_id = ? AND slot = ?');
        for (const s of targets) del.run(id, s);
        raw.prepare('UPDATE users SET eira = eira + ? WHERE id = ?').run(total, id);
        raw.prepare('UPDATE farm_profile SET level = ?, xp = ? WHERE user_id = ?').run(level, xp, id);
    });
    const unlocked = F.SEEDS.filter((s) => s.level > f.level && s.level <= level);
    return { ok: true, items, total, xpGain, from: f.level, to: level, unlocked };
}

module.exports = {
    getFarm, parseSlots, buySeed, buyItem, unlockPlot, plant, water, fertilize, growthPotion, harvest,
};