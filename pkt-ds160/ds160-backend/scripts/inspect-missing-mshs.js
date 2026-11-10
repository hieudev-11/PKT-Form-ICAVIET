// Chỉ đọc (không sửa DB) — in ra nội dung header_A_mshs / header_A_2 thô của các
// phiếu đang có mshs trống, để biết vì sao backfill-mshs.js bỏ qua chúng.
//
// Dùng: node scripts/inspect-missing-mshs.js

import { poolChecker } from '../db.js';

function safeParse(json) {
  if (!json) return {};
  if (typeof json === 'object') return json;
  try { return JSON.parse(json); } catch { return {}; }
}

async function run() {
  const [rows] = await poolChecker.query(`
    SELECT id, customer_name, status, filler_changes, review_changes
    FROM icaviet_review_queue
    WHERE mshs IS NULL OR mshs = ''
    ORDER BY id
  `);

  console.log(`Có ${rows.length} phiếu đang thiếu mshs:\n`);

  for (const row of rows) {
    const fillerChanges = safeParse(row.filler_changes);
    const reviewChanges = safeParse(row.review_changes);

    console.log(`#${row.id} — ${row.customer_name} (${row.status})`);
    console.log(`  filler_changes.header_A_mshs = ${JSON.stringify(fillerChanges.header_A_mshs)}`);
    console.log(`  filler_changes.header_A_2    = ${JSON.stringify(fillerChanges.header_A_2)}`);
    console.log(`  review_changes.header_A_mshs = ${JSON.stringify(reviewChanges.header_A_mshs)}`);
    console.log(`  review_changes.header_A_2    = ${JSON.stringify(reviewChanges.header_A_2)}`);
    console.log('');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi inspect:', err);
  process.exit(1);
});
