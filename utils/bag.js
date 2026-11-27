// Túi cá: thứ tự hiển thị (eca) và bán theo số thứ tự (ebanca) dùng chung một cách sắp xếp.
const { raw, getBag } = require('./db');
const { RARITIES } = require('../data/fish');

// Rương trước, rồi cá từ hiếm đến thường; cùng độ hiếm thì giá trị cao trước, bằng nhau thì theo tên
function sortedBag(id) {
    const bag = getBag(id);
    const order = ['chest', ...[...RARITIES].reverse()];
    bag.sort((a, b) =>
        order.indexOf(a.rarity) - order.indexOf(b.rarity) ||
        b.value - a.value ||
        a.species.localeCompare(b.species));
    return bag;
}

// Bán nguyên một loài (cả chồng) trong túi cho mỗi tên trong `names`, cộng Eira, một giao dịch.
// Trả về { sold: [{ species, rarity, qty, value }], count, total }
function sellSpecies(id, names) {
    const get = raw.prepare('SELECT species, rarity, qty, value FROM fish_bag WHERE user_id = ? AND species = ?');
    const del = raw.prepare('DELETE FROM fish_bag WHERE user_id = ? AND species = ?');
    const sold = [];
    let count = 0, total = 0;
    raw.exec('BEGIN');
    try {
        for (const n of names) {
            const r = get.get(id, n);
            if (!r || r.qty <= 0) continue;
            del.run(id, n);
            sold.push(r);
            count += r.qty;
            total += r.value;
        }
        if (total > 0) raw.prepare('UPDATE users SET eira = eira + ? WHERE id = ?').run(total, id);
        raw.exec('COMMIT');
    } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
    }
    return { sold, count, total };
}

module.exports = { sortedBag, sellSpecies };