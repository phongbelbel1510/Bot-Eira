// commands/ebackup.js: chủ bot sao lưu ngay lập tức (ebackup)
let fileCfg = {};
try { fileCfg = require('../config.json'); } catch {}
const OWNER_ID = process.env.OWNER_ID || fileCfg.ownerId;

const { backupNow } = require('../backup');

module.exports = {
    name: 'backup',
    aliases: ['saoluu'],
    description: 'Sao lưu database lên Drive ngay (chỉ chủ bot)',
    async run(msg) {
        if (!OWNER_ID || msg.author.id !== OWNER_ID) return;   // người khác gõ thì im lặng

        const wait = await msg.reply('⏳ Đang sao lưu...');
        const r = await backupNow();
        return wait.edit(r.ok ? `✅ Đã sao lưu lên Drive: \`${r.name}\`` : `❌ Sao lưu lỗi: ${r.error}`);
    },
};