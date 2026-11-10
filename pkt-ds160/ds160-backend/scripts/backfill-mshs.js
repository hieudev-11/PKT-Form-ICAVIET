// Backfill cột mshs (icaviet_review_queue) từ dữ liệu MS đang nằm trong JSON
// filler_changes / review_changes của các phiếu cũ (trước khi có cột riêng).
// Ưu tiên review_changes (bản mới nhất do reviewer sửa) nếu có, không thì lấy filler_changes.
//
// Dùng: node scripts/backfill-mshs.js [--dry-run]

import { poolChecker } from '../db.js';

function stripHtml(value = '') {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cùng logic với getChangeByCellId('header_A_mshs') trong WordPaper.vue:
// dữ liệu cũ trước khi có cột MSHS thường được lưu tạm vào ô Điền đơn (header_A_2).
function extractMshs(changeMap = {}) {
  if (!changeMap || typeof changeMap !== 'object') return '';
  if (changeMap.header_A_mshs !== undefined && changeMap.header_A_mshs !== '__CLEARED__') {
    return stripHtml(changeMap.header_A_mshs);
  }
  if (changeMap.header_A_2 !== undefined) {
    const raw = stripHtml(changeMap.header_A_2);
    if (/^[0-9A-Z]+$/.test(raw)) return raw;
  }
  return '';
}

function safeParse(json) {
  if (!json) return {};
  if (typeof json === 'object') return json;
  try { return JSON.parse(json); } catch { return {}; }
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');

  const [rows] = await poolChecker.query(`
    SELECT id, filler_changes, review_changes
    FROM icaviet_review_queue
    WHERE mshs IS NULL OR mshs = ''
  `);

  let updated = 0;
  for (const row of rows) {
    const fillerChanges = safeParse(row.filler_changes);
    const reviewChanges = safeParse(row.review_changes);
    const mshs = extractMshs(reviewChanges) || extractMshs(fillerChanges);

    if (!mshs) continue;

    console.log(`#${row.id}: mshs = "${mshs}"`);
    if (!dryRun) {
      await poolChecker.query('UPDATE icaviet_review_queue SET mshs = ? WHERE id = ?', [mshs, row.id]);
    }
    updated++;
  }

  console.log(`\n${dryRun ? '[DRY RUN] Sẽ cập nhật' : 'Đã cập nhật'} ${updated}/${rows.length} phiếu.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi backfill mshs:', err);
  process.exit(1);
});
