const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { FAMILIES, MAX_TIER, TIER1_PRICE } = require('../data/materials');

const DB_DIR = path.join(__dirname, '..', 'database');
fs.mkdirSync(DB_DIR, { recursive: true });

const raw = new DatabaseSync(path.join(DB_DIR, 'eira.db'));
raw.exec('PRAGMA journal_mode = WAL;');

raw.exec(`
CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    eira       INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fish_bag (
    user_id TEXT NOT NULL,
    species TEXT NOT NULL,
    rarity  TEXT NOT NULL,
    qty     INTEGER NOT NULL DEFAULT 0,
    value   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, species)
);
CREATE TABLE IF NOT EXISTS materials (
    user_id TEXT NOT NULL,
    fam     TEXT NOT NULL,
    tier    INTEGER NOT NULL,
    qty     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, fam, tier)
);
CREATE TABLE IF NOT EXISTS rarity_counts (
    user_id TEXT NOT NULL,
    rarity  TEXT NOT NULL,
    n       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, rarity)
);
`);

// Thêm cột mới vào bảng cũ nếu chưa có (không mất dữ liệu cũ)
function ensureColumn(table, col, def) {
    const cols = raw.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === col)) raw.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
ensureColumn('users', 'rod_level', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'best_kg', 'REAL NOT NULL DEFAULT 0');
ensureColumn('users', 'best_fish', 'TEXT');
ensureColumn('users', 'chests', 'INTEGER NOT NULL DEFAULT 0');

const START_EIRA = 100;

const qGet = raw.prepare('SELECT * FROM users WHERE id = ?');
const qNew = raw.prepare('INSERT INTO users (id, eira, created_at) VALUES (?, ?, ?)');
const qAdd = raw.prepare('UPDATE users SET eira = eira + ? WHERE id = ?');
const qSpend = raw.prepare('UPDATE users SET eira = eira - ? WHERE id = ? AND eira >= ?');

// Lấy người chơi, chưa có thì tạo mới
function getUser(id) {
    let u = qGet.get(id);
    if (!u) {
        qNew.run(id, START_EIRA, Date.now());
        u = qGet.get(id);
    }
    return u;
}

// Cộng Eira (n có thể âm nhưng nên dùng spend để trừ)
function addEira(id, n) {
    getUser(id);
    qAdd.run(Math.floor(n), id);
    return qGet.get(id).eira;
}

// Trừ Eira an toàn: không đủ thì không trừ và trả false
function spend(id, n) {
    getUser(id);
    n = Math.floor(n);
    if (n <= 0) return false;
    return qSpend.run(n, id, n).changes === 1;
}

function setRodLevel(id, lv) {
    getUser(id);
    raw.prepare('UPDATE users SET rod_level = ? WHERE id = ?').run(lv, id);
}

// ===== Túi cá =====
const qBagUp = raw.prepare(`
    INSERT INTO fish_bag (user_id, species, rarity, qty, value) VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(user_id, species) DO UPDATE SET qty = qty + 1, value = value + excluded.value`);
const qRarity = raw.prepare(`
    INSERT INTO rarity_counts (user_id, rarity, n) VALUES (?, ?, 1)
    ON CONFLICT(user_id, rarity) DO UPDATE SET n = n + 1`);

// Lưu một con cá vào túi. Trả về true nếu phá kỷ lục khối lượng của người chơi.
function addFish(id, species, rarity, kg, value) {
    const u = getUser(id);
    qBagUp.run(id, species, rarity, value);
    qRarity.run(id, rarity);
    if (kg > u.best_kg) {
        raw.prepare('UPDATE users SET best_kg = ?, best_fish = ? WHERE id = ?').run(kg, species, id);
        return true;
    }
    return false;
}

// Lưu rương báu vào túi (bán ở ebanca cùng cá)
function addChest(id, value) {
    getUser(id);
    qBagUp.run(id, 'Rương báu', 'chest', value);
    raw.prepare('UPDATE users SET chests = chests + 1 WHERE id = ?').run(id);
}

function getBag(id) {
    return raw.prepare('SELECT species, rarity, qty, value FROM fish_bag WHERE user_id = ? AND qty > 0').all(id);
}

// Bán sạch túi, cộng Eira. Trả về { count, total }
function sellAll(id) {
    getUser(id);
    raw.exec('BEGIN');
    try {
        const sum = raw.prepare('SELECT COALESCE(SUM(qty),0) AS c, COALESCE(SUM(value),0) AS t FROM fish_bag WHERE user_id = ?').get(id);
        raw.prepare('DELETE FROM fish_bag WHERE user_id = ?').run(id);
        if (sum.t > 0) qAdd.run(sum.t, id);
        raw.exec('COMMIT');
        return { count: sum.c, total: sum.t };
    } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
    }
}


// ===== Vật liệu nâng cấp cần =====
// mats = { day: [q1..q5], luoi: [...], than: [...], phukien: [...] } (q[i] là số món bậc i+1)
const emptyMats = () => Object.fromEntries(FAMILIES.map((f) => [f.key, new Array(MAX_TIER).fill(0)]));

function getMats(id) {
    getUser(id);
    const mats = emptyMats();
    const rows = raw.prepare('SELECT fam, tier, qty FROM materials WHERE user_id = ?').all(id);
    for (const r of rows) if (mats[r.fam]) mats[r.fam][r.tier - 1] = r.qty;
    return mats;
}

// Ghi lại toàn bộ kho vật liệu. Mặc định tự mở giao dịch (hoặc ghi hết hoặc không ghi gì);
// truyền { tx: false } khi đã đang ở trong một giao dịch khác.
function setMats(id, mats, { tx = true } = {}) {
    getUser(id);
    const up = raw.prepare(`
        INSERT INTO materials (user_id, fam, tier, qty) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, fam, tier) DO UPDATE SET qty = excluded.qty`);
    if (tx) raw.exec('BEGIN');
    try {
        for (const f of FAMILIES) {
            for (let t = 1; t <= MAX_TIER; t++) up.run(id, f.key, t, Math.max(0, Math.floor(mats[f.key][t - 1])));
        }
        if (tx) raw.exec('COMMIT');
    } catch (e) {
        if (tx) raw.exec('ROLLBACK');
        throw e;
    }
}

// Mua qty món bậc 1 của nhóm fam (không giới hạn số lượng, chỉ cần đủ Eira). Trả về { ok, reason?, cost? }
function buyMaterial(id, fam, qty) {
    const u = getUser(id);
    qty = Math.floor(qty);
    if (!(qty > 0)) return { ok: false, reason: 'qty' };
    const cost = qty * TIER1_PRICE;
    if (!Number.isSafeInteger(cost) || u.eira < cost) return { ok: false, reason: 'money', cost };

    raw.exec('BEGIN');
    try {
        raw.prepare('UPDATE users SET eira = eira - ? WHERE id = ?').run(cost, id);
        raw.prepare(`
            INSERT INTO materials (user_id, fam, tier, qty) VALUES (?, ?, 1, ?)
            ON CONFLICT(user_id, fam, tier) DO UPDATE SET qty = qty + excluded.qty`).run(id, fam, qty);
        raw.exec('COMMIT');
    } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
    }
    return { ok: true, cost };
}

module.exports = {
    raw, getUser, addEira, spend, setRodLevel, addFish, addChest, getBag, sellAll,
    emptyMats, getMats, setMats, buyMaterial,
};