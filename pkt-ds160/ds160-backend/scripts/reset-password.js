// Reset mật khẩu cho 1 user trong icaviet_users — bảng duy nhất mà
// /api/auth/login thực sự đọc. Không đụng đến wp_users.
//
// Dùng: node scripts/reset-password.js <username> <newPassword>

import { poolChecker } from '../db.js';
import { hashPasswordForWp } from '../lib/auth-helpers.js';

async function run() {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) {
    console.error('Dùng: node scripts/reset-password.js <username> <newPassword>');
    process.exit(1);
  }

  const hash = hashPasswordForWp(newPassword);

  const [result] = await poolChecker.query(
    'UPDATE icaviet_users SET password = ? WHERE username = ?',
    [hash, username]
  );

  if (result.affectedRows === 0) {
    console.error(`Không tìm thấy username = "${username}" trong icaviet_users`);
    process.exit(1);
  }

  console.log(`Đã đặt lại mật khẩu cho "${username}" trong icaviet_users — có thể đăng nhập ngay.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Lỗi reset password:', err);
  process.exit(1);
});
