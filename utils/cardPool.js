// utils/cardPool.js: vẽ thẻ ngay trong tiến trình chính, xếp hàng từng thẻ một để tiết kiệm RAM (không dùng worker).
const { renderCard } = require('./cardRenderer');

const POOL_SIZE = 1;
let chain = Promise.resolve();
let pending = 0;

function render(args) {
    pending += 1;
    const job = chain.then(() => renderCard(args));   // { buffer, ext }
    chain = job.catch(() => {});   // một thẻ lỗi không chặn hàng đợi
    return job.finally(() => { pending -= 1; });
}

const pendingCount = () => pending;

module.exports = { render, pendingCount, POOL_SIZE };