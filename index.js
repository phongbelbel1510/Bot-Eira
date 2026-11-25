const { Client, Events, GatewayIntentBits } = require('discord.js');

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

client.once(Events.ClientReady, () => {
    console.log(`Đã đăng nhập dưới tên ${client.user.tag}`);
});

client.on(Events.MessageCreate, (msg) => {
    if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;

    const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    if (cmd === 'ping') {
        msg.reply('Pong! 🏓');
    }
});

client.login(TOKEN);