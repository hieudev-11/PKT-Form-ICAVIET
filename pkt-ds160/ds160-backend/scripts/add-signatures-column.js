// Thêm cột `signatures` (LONGTEXT, JSON) vào bảng icaviet_review_queue để lưu
// chữ ký điện tử ở cuối phiếu kiểm tra.
//
// Dùng: node scripts/add-signatures-column.js [--dry-run]

import { poolChecker, queryWithRetry } from '../db.js';

const TABLE = 'icaviet_review_queue';
const COLUMN = 'signatures';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const [rows] = await queryWithRetry(poolChecker, `
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
  `, [TABLE, COLUMN]);

  if (rows.length) {
    console.log(`✅ Cột \`${COLUMN}\` đã có sẵn trong \`${TABLE}\`, không cần làm gì.`);
    return;
  }

  const sql = `ALTER TABLE \`${TABLE}\` ADD COLUMN \`${COLUMN}\` LONGTEXT NULL DEFAULT NULL`;
  if (dryRun) {
    console.log('[dry-run] Sẽ chạy:', sql);
    return;
  }

  await queryWithRetry(poolChecker, sql);
  console.log(`✅ Đã thêm cột \`${COLUMN}\` vào \`${TABLE}\`.`);
}

main()
  .catch(err => {
    console.error('❌ Lỗi khi thêm cột signatures:', err.message);
    process.exitCode = 1;
  })
  .finally(() => poolChecker.end());
