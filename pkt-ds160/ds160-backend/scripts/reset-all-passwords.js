// Đặt lại mật khẩu mặc định cho TẤT CẢ user trong icaviet_users.
// Dùng: node scripts/reset-all-passwords.js [mat_khau_moi]
// Nếu không truyền tham số, mặc định dùng "ica123456".

import { poolChecker } from '../db.js';
import { hashPasswordForWp } from '../lib/auth-helpers.js';

async function run() {
  const newPassword = process.argv[2] || 'ica123456';
  const hash = hashPasswordForWp(newPassword);

  const [users] = await poolChecker.query('SELECT username FROM icaviet_users ORDER BY username ASC');
  if (users.length === 0) {
    console.error('Không tìm thấy user nào trong icaviet_users');
    process.exit(1);
  }

  const [result] = await poolChecker.query('UPDATE icaviet_users SET password = ?', [hash]);

  console.log(`Đã đặt lại mật khẩu "${newPassword}" cho ${result.affectedRows} user:`);
  users.forEach(u => console.log(` - ${u.username}`));
  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi reset password hàng loạt:', err);
  process.exit(1);
});
