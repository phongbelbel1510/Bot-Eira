const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

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
`);

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

module.exports = { raw, getUser, addEira, spend };