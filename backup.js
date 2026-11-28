// backup.js (bot Eira)
// Sao lưu SQLite định kỳ lên Google Drive và tự khôi phục khi khởi động mà chưa có database.
// Dùng chung tài khoản Google và thư mục Drive với bot Mạo hiểm giả được: bản của Eira tên eira-*.db.gz, bản kia tên game-*.db.gz, hai bên không đụng nhau.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { DatabaseSync } = require('node:sqlite');
const { google } = require('googleapis');

// ----- Chỉnh ở đây -----
const DB_FILE = process.env.EIRA_DB || path.join(__dirname, 'database', 'eira.db');
const DIR = path.join(__dirname, 'backups');
const PREFIX = 'eira';                       // tên file backup: eira-2026-11-28-12-30.db.gz
const KEEP = 10;                             // giữ bao nhiêu bản mới nhất trên Drive
const INTERVAL = 30 * 60 * 1000;             // mỗi 30 phút sao lưu một lần
const FOLDER_ID = process.env.EIRA_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
const NAME_RE = new RegExp(`^${PREFIX}-.*\\.db\\.gz$`);

let backupRunning = false;

function getDrive() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !FOLDER_ID) {
        throw new Error('Thiếu biến môi trường Google Drive (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID).');
    }

    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth });
}

// Giờ Việt Nam: 2026-11-28-19-30
function getTimestamp() {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace(/[:T]/g, '-').slice(0, 16);
}

// Danh sách bản backup của Eira trên Drive, mới nhất trước
async function listDriveBackups(drive) {
    const files = [];
    let pageToken;

    do {
        const result = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed = false`,
            pageSize: 1000,
            orderBy: 'createdTime desc',
            pageToken,
            fields: 'nextPageToken,files(id,name,createdTime)',
        });
        files.push(...(result.data.files || []));
        pageToken = result.data.nextPageToken;
    } while (pageToken);

    return files
        .filter(f => NAME_RE.test(f.name))
        .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
}

// Chỉ giữ KEEP bản mới nhất
async function cleanupDrive(drive) {
    const files = await listDriveBackups(drive);

    for (const file of files.slice(KEEP)) {
        try {
            await drive.files.delete({ fileId: file.id });
            console.log(`[backup] Đã xóa bản cũ: ${file.name}`);
        } catch (err) {
            console.error(`[backup] Không xóa được ${file.name}:`, err.message);
        }
    }
}

// Kiểm tra file SQLite có nguyên vẹn không
function validateDatabase(filePath) {
    const db = new DatabaseSync(filePath);
    try {
        const result = db.prepare('PRAGMA quick_check').all();
        return result.length > 0 && result.every(row => row.quick_check === 'ok');
    } finally {
        db.close();
    }
}

// Khôi phục từ Drive. CHỈ chạy khi chưa có file database (host bị xóa, đổi server...). Phải gọi TRƯỚC khi nạp utils/db.js.
async function restoreDatabase() {
    if (fs.existsSync(DB_FILE)) {
        console.log('[restore] Đã có eira.db, bỏ qua khôi phục.');
        return false;
    }

    console.log('[restore] Không thấy eira.db. Đang tìm bản backup...');

    let drive;
    try {
        drive = getDrive();
    } catch (err) {
        // Chưa cài Drive: cho bot chạy với database mới thay vì chết (lần đầu chạy chưa có gì để khôi phục)
        console.warn('[restore] Không dùng được Drive, tạo database mới:', err.message);
        return false;
    }

    const files = await listDriveBackups(drive);

    if (!files.length) {
        console.log('[restore] Chưa có bản backup nào trên Drive, tạo database mới.');
        return false;
    }

    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

    // Thử từ bản mới nhất đến cũ hơn
    for (const file of files) {
        const tempGz = path.join(os.tmpdir(), `eira-restore-${Date.now()}-${file.id}.db.gz`);
        const tempDb = path.join(path.dirname(DB_FILE), `.restore-${Date.now()}-${file.id}.db`);

        try {
            console.log(`[restore] Đang tải: ${file.name}`);

            const response = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' });
            await pipeline(response.data, fs.createWriteStream(tempGz));
            await pipeline(fs.createReadStream(tempGz), zlib.createGunzip(), fs.createWriteStream(tempDb));

            if (!validateDatabase(tempDb)) throw new Error('Database không vượt qua quick_check.');

            if (fs.existsSync(DB_FILE)) {
                console.log('[restore] Database đã xuất hiện, không ghi đè.');
                return false;
            }

            fs.renameSync(tempDb, DB_FILE);
            console.log(`[restore] Khôi phục thành công: ${file.name}`);
            return true;
        } catch (err) {
            console.error(`[restore] Bản ${file.name} không dùng được:`, err.message);
        } finally {
            if (fs.existsSync(tempGz)) fs.unlinkSync(tempGz);
            if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
        }
    }

    // Có backup nhưng tất cả đều hỏng: dừng bot, đừng tạo database trống rồi ghi đè lên tiền của người chơi
    throw new Error('Có bản backup trên Drive nhưng tất cả đều không khôi phục được.');
}

// Sao lưu ngay. Trả về { ok, name } hoặc { ok: false, error }
async function backupNow() {
    if (backupRunning) {
        console.log('[backup] Đang có backup khác, bỏ qua.');
        return { ok: false, error: 'Đang có một lần sao lưu khác chạy.' };
    }

    backupRunning = true;

    let dbPath;
    let gzPath;
    let uploaded = false;

    try {
        if (!fs.existsSync(DB_FILE)) throw new Error(`Không tìm thấy database: ${DB_FILE}`);

        const drive = getDrive();
        fs.mkdirSync(DIR, { recursive: true });

        const stamp = getTimestamp();
        const fileName = `${PREFIX}-${stamp}.db.gz`;

        const existing = await listDriveBackups(drive);
        if (existing.some(f => f.name === fileName)) {
            console.log(`[backup] ${fileName} đã tồn tại.`);
            await cleanupDrive(drive);
            return { ok: true, name: fileName };
        }

        dbPath = path.join(os.tmpdir(), `${PREFIX}-${stamp}.db`);
        gzPath = path.join(DIR, fileName);
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

        // Bản SQLite độc lập, an toàn khi bot đang ghi (VACUUM INTO)
        const db = new DatabaseSync(DB_FILE);
        try {
            db.exec(`VACUUM INTO '${dbPath.replace(/'/g, "''")}'`);
        } finally {
            db.close();
        }

        await pipeline(fs.createReadStream(dbPath), zlib.createGzip({ level: 9 }), fs.createWriteStream(gzPath));

        const result = await drive.files.create({
            requestBody: { name: fileName, parents: [FOLDER_ID], description: 'Bot Eira - SQLite automatic backup' },
            media: { mimeType: 'application/gzip', body: fs.createReadStream(gzPath) },
            fields: 'id,name,size',
        });

        uploaded = true;
        console.log(`[backup] Upload thành công: ${result.data.name} (${result.data.size} bytes)`);

        await cleanupDrive(drive);
        return { ok: true, name: fileName };
    } catch (err) {
        console.error('[backup] Lỗi:', err.message);
        return { ok: false, error: err.message };
    } finally {
        if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        // Chỉ xóa file nén sau khi upload thành công (lỗi thì giữ lại trong backups/ để cứu)
        if (uploaded && gzPath && fs.existsSync(gzPath)) fs.unlinkSync(gzPath);
        backupRunning = false;
    }
}

function startBackups(everyMs = INTERVAL) {
    console.log('[backup] Đã khởi động hệ thống sao lưu.');
    backupNow();
    return setInterval(() => { backupNow(); }, everyMs);
}

module.exports = { backupNow, startBackups, restoreDatabase };