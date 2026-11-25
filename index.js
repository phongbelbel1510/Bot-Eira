const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

// Đọc cấu hình: biến môi trường (host) ưu tiên, config.json (máy bạn) dự phòng
let fileCfg = {};
try { fileCfg = require('./config.json'); } catch {}

const TOKEN = process.env.TOKEN || fileCfg.token;
const PREFIX = process.env.PREFIX || fileCfg.prefix || 'e';

if (!TOKEN) {
    console.error('Thiếu token: đặt biến môi trường TOKEN hoặc điền config.json');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Nạp lệnh từ thư mục commands/
client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter((f) => f.endsWith('.js'))) {
    const cmd = require(path.join(cmdDir, file));
    if (!cmd.name || typeof cmd.run !== 'function') {
        console.warn(`Bỏ qua ${file}: thiếu name hoặc run`);
        continue;
    }
    client.commands.set(cmd.name, cmd);
    for (const alias of cmd.aliases || []) client.commands.set(alias, cmd);
}
console.log(`Đã nạp ${new Set(client.commands.values()).size} lệnh`);

client.once(Events.ClientReady, () => {
    console.log(`Đã đăng nhập dưới tên ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    if (!msg.content.toLowerCase().startsWith(PREFIX)) return;

    const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    const name = (args.shift() || '').toLowerCase();
    const cmd = client.commands.get(name);
    if (!cmd) return; // không phải lệnh thì im lặng

    try {
        await cmd.run(msg, args, client);
    } catch (err) {
        console.error(`Lỗi lệnh ${name}:`, err);
        msg.reply('Có lỗi xảy ra, thử lại sau nhé.').catch(() => {});
    }
});

process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));

client.login(TOKEN);