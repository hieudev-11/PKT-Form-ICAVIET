import wpHash from 'wordpress-hash-node';
import bcrypt from 'bcryptjs';

// Hỗ trợ 3 định dạng hash đang tồn tại trong wp_users.user_pass / icaviet_users.password:
// - '$wp$'-prefixed: bcrypt hash được lưu kèm tiền tố để phân biệt với phpass
// - '$2y$'/'$2a$'/'$2b$': bcrypt hash chuẩn (PHP dùng $2y$, Node bcryptjs cần $2a$)
// - còn lại: phpass (định dạng gốc của WordPress)
export function verifyStoredPassword(password, dbHash) {
  const hash = String(dbHash || '');
  if (!hash) return false;

  try {
    if (hash.startsWith('$wp$')) {
      // Quy ước lưu trữ: '$wp$' + (bcrypt hash đã bỏ dấu '$' đầu tiên của
      // chính nó) — nên khi đọc lại phải thêm '$' vào trước mới ra đúng
      // định dạng bcrypt hợp lệ. Thiếu bước này khiến MỌI hash dạng này
      // không bao giờ khớp, kể cả khi người dùng nhập đúng mật khẩu.
      const nodeHash = ('$' + hash.slice(4)).replace(/^\$2y\$/, '$2a$');
      return bcrypt.compareSync(password, nodeHash);
    }
    if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      const nodeHash = hash.replace(/^\$2y\$/, '$2a$');
      return bcrypt.compareSync(password, nodeHash);
    }
    return wpHash.CheckPassword(password, hash);
  } catch (hashError) {
    console.error('Lỗi kiểm tra hash mật khẩu:', hashError);
    return false;
  }
}

// Tạo hash mới ở định dạng '$wp$' (bcrypt) — dùng cho reset-password.js.
// Bỏ dấu '$' đầu tiên của bcrypt hash trước khi gắn tiền tố, khớp đúng quy
// ước mà verifyStoredPassword() mong đợi khi đọc lại (xem giải thích ở trên).
export function hashPasswordForWp(password) {
  return '$wp$' + bcrypt.hashSync(password, 10).slice(1);
}
