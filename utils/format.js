const { EIRA } = require('../emojis');

// 1234567 -> "1.234.567"
function num(n) {
    return Math.floor(Number(n) || 0).toLocaleString('vi-VN');
}

// 1234567 -> "1.234.567 💠"
function eira(n) {
    return `${num(n)} ${EIRA}`;
}

// 2.4 -> "2,4 kg"
function kg(n) {
    return `${(Math.round(n * 100) / 100).toLocaleString('vi-VN')} kg`;
}

module.exports = { num, eira, kg };