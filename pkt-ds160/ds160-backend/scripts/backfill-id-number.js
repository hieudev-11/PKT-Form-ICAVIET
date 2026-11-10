// Backfill cột id_number (icaviet_review_queue) cho các phiếu DS-160/DS-260 cũ
// bằng cách đọc lại ô header_A_id đang nằm trong JSON filler_changes/review_changes
// (cùng cơ chế với cột mshs / header_A_mshs — xem backfill-mshs.js).
// Ưu tiên review_changes (bản mới nhất do reviewer sửa) nếu có, không thì lấy filler_changes.
// Chỉ áp dụng DS-160/DS-260 theo yêu cầu — các form khác không tách cột này.
//
// Dùng: node scripts/backfill-id-number.js [--dry-run]

import { poolChecker } from '../db.js';

const DS_FORM_TYPES = ['ds160', 'ds-160', 'ds260', 'ds-260'];

function stripHtml(value = '') {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractIdNumber(changeMap = {}) {
  if (!changeMap || typeof changeMap !== 'object') return '';
  if (changeMap.header_A_id !== undefined && changeMap.header_A_id !== '__CLEARED__') {
    return stripHtml(changeMap.header_A_id);
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
    WHERE (id_number IS NULL OR id_number = '')
      AND form_type IN (?)
  `, [DS_FORM_TYPES]);

  let updated = 0;
  for (const row of rows) {
    const fillerChanges = safeParse(row.filler_changes);
    const reviewChanges = safeParse(row.review_changes);
    const idNumber = extractIdNumber(reviewChanges) || extractIdNumber(fillerChanges);

    if (!idNumber) continue;

    console.log(`#${row.id}: id_number = "${idNumber}"`);
    if (!dryRun) {
      await poolChecker.query('UPDATE icaviet_review_queue SET id_number = ? WHERE id = ?', [idNumber, row.id]);
    }
    updated++;
  }

  console.log(`\n${dryRun ? '[DRY RUN] Sẽ cập nhật' : 'Đã cập nhật'} ${updated}/${rows.length} phiếu.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi backfill id_number:', err);
  process.exit(1);
});
