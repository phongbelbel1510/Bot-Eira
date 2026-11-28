// commands/evuon.js: vườn trồng cây.
//   evuon                           xem vườn (có menu chọn hạt giống + các nút bấm)
//   evuon trong <ô|all> <hạt>       trồng (VD: evuon trong all tuyet_lien_hoa, evuon trong 2 ca_rot, evuon trong v3 nho)
//   evuon tuoi [ô|all]              tưới nước (giảm 10% thời gian lớn)
//   evuon thu [ô|all]               thu hoạch (bán luôn lấy Eira, nhận XP vườn)
//   evuon bon [ô|all]               dùng phân bón (giảm 25% thời gian lớn)
//   evuon thuoc [ô|all]             dùng thuốc tăng trưởng (tăng 15% giá bán)
//   evuon mua <hạt> [số lượng|max]  mua hạt giống
//   evuon mo                        mở thêm ô vườn (tối đa 8 ô)
//   evuon hat                       bảng hạt giống
// Phân bón và thuốc mua ở eshopvuon. Logic nằm ở utils/farm.js, số liệu ở data/farm.js.
const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder,
} = require('discord.js');
const { getUser } = require('../utils/db');
const farm = require('../utils/farm');
const F = require('../data/farm');
const { eira, num } = require('../utils/format');

// ---------- định dạng ----------
const fmtMin = (min) => (min < 60 ? `${min} phút` : min % 60 ? `${Math.floor(min / 60)} giờ ${min % 60} phút` : `${min / 60} giờ`);
function fmtLeft(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h} giờ ${m} phút`;
    if (m > 0) return `${m} phút ${String(sec).padStart(2, '0')} giây`;
    return `${sec} giây`;
}
const bar = (xp, need, n = 10) => { const k = Math.min(n, Math.floor((xp / need) * n)); return '▰'.repeat(k) + '▱'.repeat(n - k); };
const slotsText = (arr) => (arr.length === 1 ? `ô ${arr[0]}` : `ô ${arr.join(', ')}`);

// ---------- các hành động: trả về câu chữ (dùng chung cho lệnh gõ và nút bấm) ----------
function doPlant(id, spec, seed) {
    const r = farm.plant(id, spec, seed.key);
    if (!r.ok) {
        if (r.reason === 'level') return `🔒 ${seed.emoji} ${seed.name} cần cấp vườn **${r.need}** (bạn đang cấp ${r.level}).`;
        if (r.reason === 'slot') return `Ô không hợp lệ. Bạn có ${r.plotCount} ô: dùng \`1\`-\`${r.plotCount}\`, \`v2\`, \`1,3\` hoặc \`all\`.`;
        if (r.reason === 'occupied') return 'Không có ô trống trong số ô bạn chọn (ô đã có cây).';
        if (r.reason === 'noseed') return `Bạn chưa có hạt ${seed.emoji} ${seed.name}. Mua bằng \`evuon mua ${seed.key} ${r.need}\` hoặc chọn hạt trong menu của \`evuon\`.`;
        return 'Không trồng được, thử lại nhé.';
    }
    let t = `🌱 Đã trồng **${r.planted.length}** ${seed.emoji} ${seed.name} (${slotsText(r.planted)}). Chín sau ${fmtMin(seed.min)} (tưới nước giảm 10%).`;
    if (r.missing) t += `\n⚠️ Thiếu ${r.missing} hạt nên còn ${r.missing} ô trống. Mua thêm rồi trồng tiếp.`;
    return t;
}

function doWater(id, spec) {
    const r = farm.water(id, spec);
    if (!r.ok) return `Ô không hợp lệ (bạn có ${r.plotCount} ô).`;
    if (!r.count) return 'Không có ô nào cần tưới (ô trống, đã chín hoặc đã tưới rồi).';
    return `💧 Đã tưới **${r.count}** ô, mỗi ô giảm 10% thời gian lớn.`;
}

function doFert(id, spec) {
    const r = farm.fertilize(id, spec);
    if (!r.ok) return r.reason === 'noitem' ? 'Bạn hết phân bón. Mua ở `eshopvuon`.' : `Ô không hợp lệ (bạn có ${r.plotCount} ô).`;
    if (!r.count) return 'Không có ô nào cần bón (ô trống, đã chín hoặc đã bón rồi).';
    return `🧪 Đã bón phân **${r.count}** ô, mỗi ô giảm 25% thời gian lớn. Còn ${num(r.left)} phân bón.` +
        (r.skipped ? `\n⚠️ Thiếu phân bón nên còn ${r.skipped} ô chưa bón.` : '');
}

function doPotion(id, spec) {
    const r = farm.growthPotion(id, spec);
    if (!r.ok) return r.reason === 'noitem' ? 'Bạn hết thuốc tăng trưởng. Mua ở `eshopvuon`.' : `Ô không hợp lệ (bạn có ${r.plotCount} ô).`;
    if (!r.count) return 'Không có ô nào cần dùng thuốc (ô trống hoặc đã dùng rồi).';
    return `✨ Đã dùng thuốc cho **${r.count}** ô, giá bán +15% khi thu hoạch. Còn ${num(r.left)} thuốc.` +
        (r.skipped ? `\n⚠️ Thiếu thuốc nên còn ${r.skipped} ô chưa dùng.` : '');
}

function doHarvest(id, spec) {
    const r = farm.harvest(id, spec);
    if (!r.ok) {
        if (r.reason === 'slot') return `Ô không hợp lệ (bạn có ${r.plotCount} ô).`;
        return r.soonest != null ? `Chưa có ô nào chín. Ô chín sớm nhất còn ${fmtLeft(r.soonest)}.` : 'Chưa có cây nào để thu hoạch. Dùng `evuon trong` để gieo hạt.';
    }
    const groups = new Map();
    for (const it of r.items) {
        const g = groups.get(it.seed.key) ?? { seed: it.seed, n: 0, sum: 0, potion: false };
        g.n++; g.sum += it.price; g.potion ||= it.potion;
        groups.set(it.seed.key, g);
    }
    const lines = [...groups.values()].map((g) => `${g.seed.emoji} ${g.seed.name} ×${g.n} → ${num(g.sum)}${g.potion ? ' ✨' : ''}`);
    let t = `🌾 Thu hoạch **${r.items.length}** ô, nhận **${eira(r.total)}** (+${num(r.xpGain)} XP vườn)\n${lines.join('\n')}`;
    if (r.to > r.from) {
        t += `\n🎉 Vườn lên **cấp ${r.to}**!`;
        if (r.unlocked.length) t += `\n🔓 Mở khóa hạt giống: ${r.unlocked.map((s) => `${s.emoji} ${s.name}`).join(', ')}`;
    }
    return t;
}

function doUnlock(id) {
    const r = farm.unlockPlot(id);
    if (r.ok) return `🔓 Đã mở **ô ${r.plot}** (trả ${eira(r.cost)}).`;
    if (r.reason === 'max') return `Vườn đã mở tối đa ${F.MAX_PLOTS} ô.`;
    return `Cần ${eira(r.cost)} để mở ô ${r.next}, bạn chưa đủ.`;
}

function doBuySeed(id, seed, qty) {
    const r = farm.buySeed(id, seed.key, qty);
    if (r.ok) return `🛒 Đã mua **${num(r.qty)}** ${seed.emoji} ${seed.name}, trả ${eira(r.cost)}. Dùng \`evuon trong all ${seed.key}\` để gieo.`;
    if (r.reason === 'level') return `🔒 ${seed.emoji} ${seed.name} cần cấp vườn **${r.need}** (bạn đang cấp ${r.level}).`;
    if (r.reason === 'money') return `Cần ${eira(r.cost)} để mua, bạn chưa đủ.`;
    return 'Không mua được, thử lại nhé.';
}

// ---------- màn hình vườn ----------
function buildScreen(id, username, ui) {
    const f = farm.getFarm(id);
    const u = getUser(id);
    const lines = [];
    if (ui.note) lines.push(ui.note, '');

    lines.push(f.level >= F.MAX_LEVEL ? `**Cấp vườn ${f.level}**/${F.MAX_LEVEL} · MAX`
        : `**Cấp vườn ${f.level}**/${F.MAX_LEVEL}  ${bar(f.xp, f.need)} ${num(f.xp)}/${num(f.need)} XP`);
    lines.push(`💰 ${eira(u.eira)}`, '');

    f.plots.forEach((p, i) => {
        if (!p) { lines.push(`⬜ **Ô ${i + 1}** · trống`); return; }
        const tags = `${p.watered ? ' 💧' : ''}${p.fert ? ' 🧪' : ''}${p.potion ? ' ✨' : ''}`;
        if (p.ready) {
            const price = Math.round(p.seed.sell * (1 + F.POTION_BONUS * (p.potion ? 1 : 0)));
            lines.push(`${p.seed.emoji} **Ô ${i + 1}** ${p.seed.name} · ✅ chín, bán ${num(price)}${tags}`);
        } else {
            lines.push(`${p.seed.emoji} **Ô ${i + 1}** ${p.seed.name} · ⏳ ${fmtLeft(p.remaining)}${tags}`);
        }
    });
    if (f.plotCount < F.MAX_PLOTS) {
        const next = f.plotCount + 1;
        lines.push(`🔒 **Ô ${next}${next < F.MAX_PLOTS ? `–${F.MAX_PLOTS}` : ''}** chưa mở · mở ô ${next}: ${eira(F.PLOT_PRICE[f.plotCount - F.START_PLOTS])}`);
    }

    const owned = F.SEEDS.filter((s) => f.seeds[s.key]).map((s) => `${s.emoji} ${s.name} ×${num(f.seeds[s.key])}`);
    lines.push('', `🎒 Hạt giống: ${owned.length ? owned.join(' · ') : 'chưa có, chọn hạt trong menu bên dưới để mua'}`,
        `🧪 Phân bón ×${num(f.fert)} · ✨ Thuốc ×${num(f.potion)} (mua ở \`eshopvuon\`)`);

    const sel = ui.selected ? F.seedByKey(ui.selected) : null;
    if (sel) {
        lines.push('', `**Đã chọn:** ${sel.emoji} ${sel.name} · mua ${num(sel.cost)} · lớn ${fmtMin(sel.min)} · bán ${num(sel.sell)} (lãi ${num(sel.profit)}) · đang có ×${num(f.seeds[sel.key] || 0)}`);
    }
    const locked = F.SEEDS.filter((s) => s.level > f.level);
    if (locked.length) {
        const lv = Math.min(...locked.map((s) => s.level));
        lines.push(`🔓 Hạt kế tiếp (cấp vườn ${lv}): ${locked.filter((s) => s.level === lv).map((s) => `${s.emoji} ${s.name}`).join(', ')}`);
    }

    const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle(`🌱 Vườn của ${username}`)
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'evuon trong <ô|all> <hạt> · tuoi · thu · bon · thuoc · mua · mo · hat' });

    // --- nút bấm ---
    // Discord giới hạn 25 mục mỗi menu nên chia hai menu: hạt cơ bản (mở sẵn) và hạt nâng cao (đã mở khóa theo cấp vườn)
    const seedMenu = (cid, placeholder, list) => new StringSelectMenuBuilder().setCustomId(cid)
        .setPlaceholder(placeholder)
        .addOptions(list.map((s) => ({
            label: `${s.emoji} ${s.name}`,
            description: `${num(s.cost)} Eira · ${fmtMin(s.min)} · bán ${num(s.sell)}`,
            value: s.key,
            default: s.key === ui.selected,
        })));
    const basic = F.SEEDS.filter((s) => s.level === 1);
    const advanced = F.SEEDS.filter((s) => s.level > 1 && s.level <= f.level);
    const btn = (cid, label, emoji, style = ButtonStyle.Secondary, disabled = false) =>
        new ButtonBuilder().setCustomId(cid).setLabel(label).setEmoji(emoji).setStyle(style).setDisabled(disabled);
    const noSel = !sel;
    const maxed = f.plotCount >= F.MAX_PLOTS;

    const rows = [
        new ActionRowBuilder().addComponents(seedMenu('vuon:sel', '🌱 Hạt cơ bản (mở sẵn)...', basic)),
    ];
    if (advanced.length) rows.push(new ActionRowBuilder().addComponents(seedMenu('vuon:sel2', `🔓 Hạt nâng cao (đã mở ${advanced.length}/${F.SEEDS.length - basic.length})...`, advanced)));
    rows.push(
        new ActionRowBuilder().addComponents(
            btn('vuon:buy1', 'Mua ×1', '🛒', ButtonStyle.Primary, noSel),
            btn('vuon:buy5', 'Mua ×5', '🛒', ButtonStyle.Primary, noSel),
            btn('vuon:buy10', 'Mua ×10', '🛒', ButtonStyle.Primary, noSel),
            btn('vuon:buyfill', 'Mua đủ ô trống', '🛒', ButtonStyle.Primary, noSel)),
        new ActionRowBuilder().addComponents(
            btn('vuon:harvest', 'Thu hoạch', '🌾', ButtonStyle.Success),
            btn('vuon:water', 'Tưới tất cả', '💧', ButtonStyle.Primary),
            btn('vuon:plant', 'Trồng tất cả', '🌱', ButtonStyle.Success, noSel),
            btn('vuon:refresh', 'Làm mới', '🔄')),
        new ActionRowBuilder().addComponents(
            btn('vuon:fert', `Bón phân (${f.fert})`, '🧪'),
            btn('vuon:potion', `Thuốc (${f.potion})`, '✨'),
            btn('vuon:unlock', maxed ? 'Đủ 8 ô' : `Mở ô ${f.plotCount + 1} (${num(F.PLOT_PRICE[f.plotCount - F.START_PLOTS])})`, '➕', ButtonStyle.Secondary, maxed)),
    );
    return { embeds: [embed], components: rows };
}

// ---------- bảng hạt giống ----------
// Mỗi hạt một dòng. Discord giới hạn ~4096 ký tự mỗi embed (tổng 6000 cho cả tin nhắn) nên tự chia trang.
function seedTables(level) {
    const lines = F.SEEDS.map((s) => {
        const lock = s.level > level ? `🔒cấp ${s.level}` : '✅';
        return `${s.emoji} **${s.name}** \`${s.key}\` ${lock} · mua ${num(s.cost)} · ${fmtMin(s.min)} · bán ${num(s.sell)} · ${num(Math.round(s.perHour))}/giờ`;
    });
    const pages = [];
    let cur = [];
    let len = 0;
    for (const l of lines) {
        if (len + l.length > 3300 && cur.length) { pages.push(cur); cur = []; len = 0; }
        cur.push(l);
        len += l.length + 1;
    }
    if (cur.length) pages.push(cur);
    return pages.map((p, i) => {
        const e = new EmbedBuilder().setColor(0x27ae60)
            .setTitle(`📋 Bảng hạt giống${pages.length > 1 ? ` (${i + 1}/${pages.length})` : ''}`)
            .setDescription(p.join('\n'));
        if (i === pages.length - 1) e.setFooter({ text: 'Cột cuối là lãi mỗi giờ mỗi ô: hạt lâu thì cao hơn, nhưng cần cấp vườn và vốn lớn hơn. Phân bón / thuốc đáng dùng nhất với hạt từ 4 giờ.' });
        return e;
    });
}

const USAGE = 'Cách dùng: `evuon` (xem vườn) · `evuon trong <ô|all> <hạt>` · `evuon tuoi [ô|all]` · `evuon thu [ô|all]` · ' +
    '`evuon bon [ô|all]` · `evuon thuoc [ô|all]` · `evuon mua <hạt> [số lượng|max]` · `evuon mo` · `evuon hat`';

module.exports = {
    name: 'vuon',
    description: 'Vườn trồng cây: trồng, tưới, thu hoạch, mua hạt giống',
    async run(msg, args) {
        const id = msg.author.id;
        const sub = F.norm(args[0] || '');
        const spec = args[1];   // ô cho tuoi / thu / bon / thuoc (bỏ trống = all)

        if (sub === 'trong') {
            const rest = args.slice(1);
            if (!rest.length) return msg.reply('Dùng: `evuon trong <ô|all> <hạt>`. VD: `evuon trong all tuyet_lien_hoa`, `evuon trong 2 ca_rot`. Xem hạt bằng `evuon hat`.');
            let seed = F.findSeed(rest.join(' '));   // "evuon trong ca_rot" = trồng hết ô trống
            let slot = 'all';
            if (!seed) { slot = rest[0]; seed = F.findSeed(rest.slice(1).join(' ')); }
            if (!seed) return msg.reply('Không tìm thấy hạt giống này. Xem danh sách bằng `evuon hat`.');
            return msg.reply(doPlant(id, slot, seed));
        }
        if (['tuoi', 'nuoc'].includes(sub)) return msg.reply(doWater(id, spec));
        if (['thu', 'thuhoach', 'hai'].includes(sub)) return msg.reply(doHarvest(id, spec));
        if (['bon', 'phanbon'].includes(sub)) return msg.reply(doFert(id, spec));
        if (sub === 'thuoc') return msg.reply(doPotion(id, spec));
        if (['mo', 'moo'].includes(sub)) return msg.reply(doUnlock(id));
        if (['hat', 'hatgiong'].includes(sub)) return msg.reply({ embeds: seedTables(farm.getFarm(id).level) });

        if (sub === 'mua') {
            if (args.length < 2) return msg.reply('Dùng: `evuon mua <hạt> [số lượng|max]`. VD: `evuon mua ca_rot 5`.');
            const last = args[args.length - 1].toLowerCase();
            const hasQty = args.length > 2 && (/^\d+$/.test(last) || last === 'max');
            const seed = F.findSeed(args.slice(1, hasQty ? -1 : undefined).join(' '));
            if (!seed) return msg.reply('Không tìm thấy hạt giống này. Xem danh sách bằng `evuon hat`.');
            const qty = !hasQty ? 1 : last === 'max' ? Math.floor(getUser(id).eira / seed.cost) : Number(last);
            if (qty < 1) return msg.reply(`Bạn chưa đủ Eira để mua (mỗi hạt ${eira(seed.cost)}).`);
            return msg.reply(doBuySeed(id, seed, qty));
        }

        if (sub) return msg.reply(`Không hiểu lệnh con \`${args[0]}\`.\n${USAGE}`);

        // evuon -> màn hình vườn
        const ui = { selected: null, note: null };
        const username = msg.author.username;
        const sent = await msg.reply(buildScreen(id, username, ui));

        const col = sent.createMessageComponentCollector({
            idle: 180_000,
            filter: (i) => {
                if (i.user.id !== id) {
                    i.reply({ content: 'Đây là vườn của người khác nhé! Gõ `evuon` để xem vườn của bạn.', ephemeral: true }).catch(() => {});
                    return false;
                }
                return true;
            },
        });

        col.on('collect', async (i) => {
            try {
                const seed = ui.selected ? F.seedByKey(ui.selected) : null;
                const buy = (qty) => (seed ? doBuySeed(id, seed, qty) : 'Chọn hạt giống trong menu trước nhé.');
                let note = null;
                switch (i.customId) {
                    case 'vuon:sel':
                    case 'vuon:sel2': {
                        ui.selected = i.values[0];
                        const s = F.seedByKey(ui.selected);
                        note = `Đã chọn ${s.emoji} ${s.name}. Bấm "Mua" để mua hạt, "Trồng tất cả" để gieo vào mọi ô trống.`;
                        break;
                    }
                    case 'vuon:buy1': note = buy(1); break;
                    case 'vuon:buy5': note = buy(5); break;
                    case 'vuon:buy10': note = buy(10); break;
                    case 'vuon:buyfill': {
                        if (!seed) { note = 'Chọn hạt giống trong menu trước nhé.'; break; }
                        const f = farm.getFarm(id);
                        const need = f.plots.filter((p) => !p).length - (f.seeds[seed.key] || 0);
                        note = need > 0 ? buy(need) : 'Bạn đã đủ hạt cho các ô trống rồi.';
                        break;
                    }
                    case 'vuon:harvest': note = doHarvest(id, 'all'); break;
                    case 'vuon:water': note = doWater(id, 'all'); break;
                    case 'vuon:plant': note = seed ? doPlant(id, 'all', seed) : 'Chọn hạt giống trong menu trước nhé.'; break;
                    case 'vuon:fert': note = doFert(id, 'all'); break;
                    case 'vuon:potion': note = doPotion(id, 'all'); break;
                    case 'vuon:unlock': note = doUnlock(id); break;
                    default: note = null;   // làm mới
                }
                ui.note = note;
                await i.update(buildScreen(id, username, ui));
            } catch (err) {
                console.error('[evuon]', err);
                i.reply({ content: 'Có lỗi, thử lại nhé.', ephemeral: true }).catch(() => {});
            }
        });
        col.on('end', () => { sent.edit({ components: [] }).catch(() => {}); });
    },
};