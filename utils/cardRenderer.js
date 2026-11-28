// utils/cardRenderer.js: vẽ thẻ hồ sơ (ecard) bằng @napi-rs/canvas. Cần cài: npm install @napi-rs/canvas
// Ảnh nền là KHUNG dựng sẵn (ô trống, icon đồng xu / ngân hàng / kim cương...). Đặt tại assets/profile_bg.png (hoặc .jpg, .webp).
// Code chỉ vẽ phần thay đổi theo từng người (avatar, tên, số tiền, chữ trong ô) lên trên khung đó.
// Dữ liệu do utils/profile.js đọc từ database rồi truyền vào, file này không đụng vào database.
// Việc vẽ chạy qua cardPool.js (xếp hàng từng thẻ một) để bot không bị đứng khi nhiều người gõ cùng lúc.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const ASSET_DIR = path.join(__dirname, '..', 'assets');
const BG_FILE = ['profile_bg.png', 'profile_bg.jpg', 'profile_bg.jpeg', 'profile_bg.webp']
    .map((f) => path.join(ASSET_DIR, f)).find((f) => fs.existsSync(f)) ?? null;

const W = 1615;   // đúng kích thước ảnh khung assets/profile_bg.png (vẽ nguyên cỡ, không co giãn)
const H = 974;

const FONT = '"Segoe UI", Arial, "DejaVu Sans", sans-serif';
const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
const kgText = (n) => `${(n >= 100 ? Math.round(n) : Math.round(n * 100) / 100).toLocaleString('vi-VN')} kg`;
// Số tiền: dưới 1 tỷ hiện đủ, từ 1 tỷ trở lên rút gọn (1,23 tỷ / 4,5 nghìn tỷ) để không tràn ô
function fmtMoney(n) {
    n = Math.round(n);
    if (n < 1e9) return n.toLocaleString('vi-VN');
    const t = (x) => (Math.round(x * 100) / 100).toLocaleString('vi-VN');
    return n < 1e12 ? `${t(n / 1e9)} tỷ` : `${t(n / 1e12)} nghìn tỷ`;
}
// Chữ cái đầu của tên cho avatar dự phòng: đổi chữ kiểu toán học (𝓟) về chữ thường (P), bỏ ký hiệu
const firstLetter = (name) => (Array.from(String(name).normalize('NFKD')).find((c) => /[\p{L}\p{N}]/u.test(c)) ?? '?').toUpperCase();
const dateVN = (ms) => {   // dd/mm/yyyy theo giờ Việt Nam
    const d = new Date(ms + 7 * 3600 * 1000);
    const p = (x) => String(x).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

// Tự nạp mọi file phông (.ttf/.otf/.ttc) trong assets/fonts (dùng cho VPS/Linux không có sẵn phông chữ có dấu tiếng Việt)
// Gợi ý: bỏ DejaVuSans.ttf và DejaVuSans-Bold.ttf vào assets/fonts.
const FONT_DIR = path.join(ASSET_DIR, 'fonts');
if (fs.existsSync(FONT_DIR)) {
    for (const f of fs.readdirSync(FONT_DIR)) {
        if (/\.(ttf|otf|ttc)$/i.test(f)) {
            try { GlobalFonts.registerFromPath(path.join(FONT_DIR, f)); } catch (e) { console.error('Không nạp được phông', f, e.message); }
        }
    }
    console.log('[cardRenderer] phông đã nạp từ', FONT_DIR + ':', [...new Set(GlobalFonts.families.map((x) => x.family))].join(', '));
} else {
    console.warn('[cardRenderer] Không thấy thư mục phông', FONT_DIR, '. Chữ có dấu / tên ký tự lạ sẽ ra ô chữ nhật nếu máy chủ không có sẵn phông.');
}

// Chuỗi phông cho TÊN người chơi: Skia thử lần lượt từng phông cho từng ký tự, nên thêm nhiều phông để phủ chữ đẹp và ký hiệu lạ
const NAME_FONT = [
    '"Segoe UI"', 'Arial', '"DejaVu Sans"', '"Cambria Math"', '"DejaVu Math TeX Gyre"', '"Segoe UI Symbol"', '"Microsoft Yi Baiti"', '"Leelawadee UI"', '"Nirmala UI"',
    '"Microsoft YaHei"', '"Yu Gothic"', '"Malgun Gothic"', '"Segoe UI Emoji"',
    '"Noto Sans Math"', '"Noto Sans Symbols 2"', '"Noto Sans Symbols"', '"Unifont"', '"Unifont Upper"',
    'sans-serif',
].join(', ');

// Màu theo trạng thái ở 3 ô cuối thẻ
const STATUS = {
    ready: { dot: '#4ade80', text: '#7ee8a2' },
    wait:  { dot: '#fbbf24', text: '#fcd34d' },
    idle:  { dot: '#94a3b8', text: '#aab4c5' },
    soon:  { dot: '#64748b', text: '#8b97ab' },
};

// ---------- ảnh nền (nạp một lần, dùng lại) ----------
let bgCache = null;
async function loadBg() {
    if (!BG_FILE) throw new Error('Thiếu ảnh nền assets/profile_bg.png');
    if (!bgCache) bgCache = await loadImage(BG_FILE);
    return bgCache;
}

// ---------- hàm vẽ cơ bản ----------
function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Vẽ chữ, tự thu nhỏ (tới minSize) rồi cắt bằng "…" nếu vẫn dài hơn maxWidth. Trả về bề rộng đã vẽ.
function text(ctx, str, x, y, { size = 24, color = '#fff', weight = '', style = '', align = 'left', maxWidth = null, minSize = null, font = FONT } = {}) {
    let s = String(str);
    let sz = size;
    const set = () => { ctx.font = `${style} ${weight} ${sz}px ${font}`.replace(/\s+/g, ' ').trim(); };
    set();
    if (maxWidth) {
        const floor = minSize ?? sz;
        while (sz > floor && ctx.measureText(s).width > maxWidth) { sz -= 1; set(); }
        if (ctx.measureText(s).width > maxWidth) {
            const chars = Array.from(s);   // tách theo ký tự thật, không cắt đôi ký tự Unicode đặc biệt
            while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
            s = chars.join('') + '…';
        }
    }
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
    return ctx.measureText(s).width;
}

function spark(ctx, cx, cy, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const d = i % 2 === 0 ? r : r * 0.28;
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// avatar nằm trong vòng tròn có sẵn của khung nền (không vẽ viền lại)
async function drawAvatar(ctx, url, cx, cy, r, fallbackLetter) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    let drawn = false;
    if (url) {
        try {
            const img = await loadImage(url);
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
            drawn = true;
        } catch { /* không tải được ảnh đại diện thì vẽ chữ cái */ }
    }
    if (!drawn) {
        ctx.fillStyle = '#3b4a5a';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        text(ctx, fallbackLetter, cx, cy + r * 0.35, { size: r * 1.1, weight: 'bold', align: 'center' });
    }
    ctx.restore();
}

// Số tiền căn phải + đơn vị "Eira" nhỏ hơn bên cạnh. Số tự co lại nếu dài quá maxNumWidth.
function money(ctx, value, xRight, y, { size, unitSize, color, unitColor, maxNumWidth }) {
    ctx.font = `bold ${unitSize}px ${FONT}`;
    const uw = ctx.measureText('Eira').width;
    const nw = text(ctx, fmtMoney(value), xRight - uw - 10, y, { size, weight: 'bold', color, align: 'right', maxWidth: maxNumWidth, minSize: 20 });
    text(ctx, 'Eira', xRight - uw, y, { size: unitSize, weight: 'bold', color: unitColor });
    return nw + uw + 10;   // bề rộng cả cụm, để chữ bên trái biết chừa chỗ
}

// ---------- vẽ thẻ ----------
// data: { name, avatarUrl, profile } (profile lấy từ utils/profile.js getProfile)
async function renderBase({ name, avatarUrl, profile: p }) {
    const bg = await loadBg();
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bg, 0, 0, W, H);

    // ===== cột trái: avatar, tên, cần câu =====
    await drawAvatar(ctx, avatarUrl, 178, 270, 89, firstLetter(name));

    // ô tên (x 298-699, y 177-255): tên lớn + ID nhỏ bên dưới
    text(ctx, name, 322, 226, { size: 42, weight: 'bold', color: '#fff', maxWidth: 360, minSize: 24, font: NAME_FONT });
    text(ctx, `ID: ${p.id}`, 324, 247, { size: 16, weight: 'bold', color: '#d9b98a', maxWidth: 360, minSize: 11 });

    // ô sáng (x 298-698, y 274-328): cần câu hiện tại
    spark(ctx, 330, 301, 13, '#dfe8ff');
    text(ctx, `${p.rod.name.toUpperCase()}  •  CẤP ${p.rod.level}/${p.rod.max}`, 356, 311, { size: 25, weight: 'bold', color: '#e8eefc', maxWidth: 325, minSize: 16 });

    // hai ô nhỏ: hạng giàu, số cá đã câu
    text(ctx, `Top #${fmt(p.rank)}/${fmt(p.total)}`, 340, 376, { size: 21, weight: 'bold', color: '#f4ead2', maxWidth: 148, minSize: 13 });
    text(ctx, `Câu: ${fmt(p.fishTotal)} cá`, 568, 376, { size: 20, weight: 'bold', color: '#f4ead2', maxWidth: 122, minSize: 12 });

    // ô ngày gia nhập: nhãn + ngày
    const lw = text(ctx, 'Gia nhập', 166, 447, { size: 19, color: '#b9c3d6' });
    text(ctx, dateVN(p.joined), 166 + lw + 10, 447, { size: 21, weight: 'bold', color: '#fff', maxWidth: 205 - lw - 10, minSize: 13 });

    // ô kỷ lục cá nặng nhất
    const record = p.bestFish ? `Kỷ lục: ${p.bestFish} ${kgText(p.bestKg)}` : 'Chưa có kỷ lục cá';
    text(ctx, record, 446, 447, { size: 21, weight: 'bold', color: '#f4ead2', maxWidth: 240, minSize: 12 });

    // ===== cột phải: kho báu & tài chính =====
    text(ctx, 'KHO BÁU & TÀI CHÍNH', 818, 202, { size: 26, weight: 'bold', color: '#f6ecd5' });
    text(ctx, 'EIRA TREASURY', 1490, 200, { size: 16, weight: 'bold', color: '#d9b98a', align: 'right' });

    // ví (có thể bị cướp) và ngân hàng (an toàn): vẽ số trước, chữ bên trái co lại theo chỗ còn lại
    const ROW_LEFT = 870, ROW_RIGHT = 1490;
    const walletW = money(ctx, p.wallet, ROW_RIGHT, 279, { size: 42, unitSize: 24, color: '#fff', unitColor: '#ffe082', maxNumWidth: 260 });
    const walletMax = ROW_RIGHT - walletW - ROW_LEFT - 20;
    text(ctx, 'VÍ TIỀN MẶT HIỆN CÓ', ROW_LEFT, 258, { size: 24, weight: 'bold', color: '#f6e7c3', maxWidth: walletMax, minSize: 14 });
    text(ctx, 'Tiền giao dịch trực tiếp', ROW_LEFT, 288, { size: 18, color: '#b3bccd', maxWidth: walletMax, minSize: 12 });

    const bankW = money(ctx, p.bank, ROW_RIGHT, 374, { size: 42, unitSize: 24, color: p.bankOn ? '#fff' : '#8d96a8', unitColor: p.bankOn ? '#8fd3ff' : '#7d8799', maxNumWidth: 260 });
    const bankMax = ROW_RIGHT - bankW - ROW_LEFT - 20;
    text(ctx, 'NGÂN HÀNG BẢO MẬT', ROW_LEFT, 353, { size: 24, weight: 'bold', color: '#f6e7c3', maxWidth: bankMax, minSize: 14 });
    text(ctx, p.bankOn ? 'Tiền gửi an toàn, không bị cướp' : 'Sắp ra mắt', ROW_LEFT, 383, { size: 18, color: '#b3bccd', maxWidth: bankMax, minSize: 12 });

    // dòng chú thích trong thanh mảnh
    text(ctx, p.bankOn ? 'Tiền trong ví có thể bị cướp • Tiền trong ngân hàng thì được bảo vệ' : 'Ngân hàng sắp ra mắt • Tiền gửi ở đó sẽ không bị cướp',
        1127, 446, { size: 17, color: '#9aa4b8', align: 'center', maxWidth: 660, minSize: 12 });

    // tổng tài sản (ô vàng): chừa chỗ bên phải cho cây cỏ trang trí của khung
    const nwRight = 1395;
    const nwWidth = money(ctx, p.netWorth, nwRight, 556, { size: 54, unitSize: 28, color: '#ffd54f', unitColor: '#ffe9a8', maxNumWidth: 255 });
    const leftMax = nwRight - nwWidth - 890 - 24;
    text(ctx, 'TỔNG TÀI SẢN', 890, 531, { size: 24, weight: 'bold', color: '#ffe9a8', maxWidth: leftMax, minSize: 14 });
    text(ctx, `${p.rod.name} · cấp ${p.rod.level}`, 890, 564, { size: 20, weight: 'bold', color: '#f6e7c3', maxWidth: leftMax, minSize: 12 });

    // ===== hàng dưới: nhịp độ hàng ngày (3 ô) =====
    text(ctx, 'HOẠT ĐỘNG & NHỊP ĐỘ HÀNG NGÀY', 112, 703, { size: 25, weight: 'bold', color: '#f6ecd5' });
    text(ctx, 'ACTIVITY MONITOR', 1500, 700, { size: 16, weight: 'bold', color: '#d9b98a', align: 'right' });

    const boxes = [{ x1: 560, tx: 176 }, { x1: 1040, tx: 682 }, { x1: 1537, tx: 1154 }];
    p.activities.slice(0, 3).forEach((a, i) => {
        const { x1, tx } = boxes[i];
        const st = STATUS[a.status] ?? STATUS.idle;

        // chip tên lệnh bên phải tiêu đề (không có lệnh thì thôi)
        let chipW = 0;
        if (a.cmd) {
            ctx.font = `bold 16px ${FONT}`;
            chipW = ctx.measureText(a.cmd).width + 22;
            const cx0 = x1 - 20 - chipW;
            rr(ctx, cx0, 733, chipW, 26, 8);
            ctx.fillStyle = 'rgba(78,50,32,0.92)';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#a77b4a';
            ctx.stroke();
            text(ctx, a.cmd, cx0 + chipW / 2, 752, { size: 16, weight: 'bold', color: '#f0d9b0', align: 'center' });
        }
        text(ctx, a.title, tx, 753, { size: 22, weight: 'bold', color: '#f6ecd5', maxWidth: x1 - 20 - tx - (chipW ? chipW + 10 : 0), minSize: 13 });

        // chấm màu trạng thái + dòng trạng thái
        ctx.beginPath();
        ctx.arc(tx + 7, 784, 6, 0, Math.PI * 2);
        ctx.fillStyle = st.dot;
        ctx.fill();
        text(ctx, a.line, tx + 22, 790, { size: 19, weight: 'bold', color: st.text, maxWidth: x1 - 18 - (tx + 22), minSize: 12 });
    });

    return canvas;
}

// Trả về { buffer, ext }. Nền là tranh phong cảnh nên dùng JPEG 92: nhẹ hơn PNG nhiều, chữ vẫn nét.
async function renderCard(args) {
    const canvas = await renderBase(args);
    return { buffer: canvas.toBuffer('image/jpeg', 92), ext: 'jpg' };
}

module.exports = { renderCard };