const { FISH, RARITIES, RARITY_WEIGHT, SKEW } = require('../data/fish');
const rods = require('../data/rods');

// Cache danh sách cá theo vùng + độ hiếm
const POOL = {};
for (const f of FISH) (POOL[`${f.zone}|${f.rarity}`] ||= []).push(f);

function pick(list, rnd) {
    return list[Math.floor(rnd() * list.length)];
}

function pickRarity(level, zoneKey, rnd) {
    const rm = rods.rareMult(level);
    let total = 0;
    const items = [];
    for (const r of RARITIES) {
        if (!(POOL[`${zoneKey}|${r}`] || []).length) continue;     // vùng không có độ hiếm này
        const w = RARITY_WEIGHT[r] * (RARITIES.indexOf(r) >= 2 ? rm : 1);
        items.push([r, w]);
        total += w;
    }
    let x = rnd() * total;
    for (const [r, w] of items) {
        if ((x -= w) < 0) return r;
    }
    return items[items.length - 1][0];
}

// Trả về { type: 'chest', value } | { type: 'trash', name, value } | { type: 'fish', fish, kg, big, value }
function rollCatch(level, zoneKey, rnd = Math.random) {
    const x = rnd();
    const chest = rods.chestChance(level);
    if (x < chest) {
        const v = rods.CHEST_MIN + rnd() * (rods.CHEST_MAX - rods.CHEST_MIN);
        return { type: 'chest', value: Math.round(v / 1000) * 1000 };
    }
    if (x < chest + rods.trashChance(level)) {
        const t = pick(rods.TRASH, rnd);
        return { type: 'trash', name: t.name, value: t.value };
    }
    const rarity = pickRarity(level, zoneKey, rnd);
    const fish = pick(POOL[`${zoneKey}|${rarity}`], rnd);
    const base = fish.min + (fish.max - fish.min) * Math.pow(rnd(), SKEW[fish.rarity]);
    const kg = Math.max(0.01, Math.round(base * rods.weightMult(level) * 100) / 100);
    return {
        type: 'fish',
        fish,
        kg,
        big: kg > fish.max * rods.BIG_RATIO,
        value: Math.max(1, Math.round(kg * fish.price)),
    };
}

module.exports = { rollCatch };