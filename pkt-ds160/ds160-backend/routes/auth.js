import express from 'express';
import { poolAuth, poolChecker, queryWithRetry } from '../db.js';
import crypto from 'crypto';
import { verifyStoredPassword, hashPasswordForWp } from '../lib/auth-helpers.js';

const router = express.Router();

const SSO_SECRET = process.env.SSO_SECRET || '';

function base64UrlDecode(value = '') {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function verifySsoJwt(token) {
  if (!SSO_SECRET) {
    throw new Error('Chưa cấu hình SSO_SECRET trên backend PKT');
  }

  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('SSO token không đúng định dạng');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SSO_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new Error('Chữ ký SSO token không hợp lệ');
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader));
  if (header.alg !== 'HS256') {
    throw new Error('Thuật toán SSO token không được hỗ trợ');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && Number(payload.exp) < now) {
    throw new Error('SSO token đã hết hạn');
  }

  return payload;
}

function buildLoginResponse(user) {
  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      phong_ban: user.phong_ban,
      role: user.role,
      can_comment: Number(user.can_comment) === 1 ? 1 : 0
    },
    token: Buffer.from(`${user.id}|${Date.now()}`).toString('base64')
  };
}

// Lấy danh sách Users từ WordPress DB
router.get('/api/users', async (req, res) => {
  try {
    const [rows] = await queryWithRetry(poolAuth, 'SELECT ID as id, display_name as name FROM wp_users LIMIT 50');
    res.json(rows);
  } catch (error) {
    console.error('Lỗi query users:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách user' });
  }
});

// Lấy danh sách nhân viên ICAVIET
router.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT id, name, username, phong_ban, role
      FROM icaviet_users
      WHERE phong_ban = 'ICAVIET'
      ORDER BY name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách nhân viên:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách nhân viên' });
  }
});

// Đăng nhập bằng WP credentials
router.post('/api/auth/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  console.log(`[DEBUG] Attempting login for username: "${username}"`);
  if (!username || !password) return res.status(400).json({ message: 'Vui lòng nhập Username và Password' });

  try {
    const [users] = await queryWithRetry(poolChecker, 'SELECT * FROM icaviet_users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(401).json({ message: 'Tài khoản không tồn tại trong hệ thống nội bộ' });

    const user = users[0];
    const isValid = verifyStoredPassword(password, user.password);

    if (!isValid) return res.status(401).json({ message: 'Sai mật khẩu' });

    res.json(buildLoginResponse(user));

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Đăng nhập tự động qua iFrame (SSO) bằng token JWT HS256 từ ICAwiki.
// Không dùng user_id trên URL vì có thể bị giả mạo.
router.post('/api/auth/sso-token', async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (!token) {
    return res.status(400).json({ success: false, message: 'Thiếu SSO token' });
  }

  try {
    const payload = verifySsoJwt(token);
    const username = String(payload.username || payload.user_login || '').trim();

    if (!username) {
      return res.status(401).json({ success: false, message: 'SSO token không có username' });
    }

    const [users] = await queryWithRetry(
      poolChecker,
      'SELECT * FROM icaviet_users WHERE username = ? LIMIT 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User ${username} chưa tồn tại trong hệ thống phiếu kiểm tra`
      });
    }

    res.json(buildLoginResponse(users[0]));
  } catch (error) {
    console.error('Lỗi SSO token:', error);
    res.status(401).json({ success: false, message: error.message || 'SSO token hết hạn hoặc không hợp lệ' });
  }
});

// Endpoint SSO cũ bằng user_id đã bị khóa để tránh giả mạo ID trên URL.
router.get('/api/auth/sso/:userId', async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'SSO bằng user_id đã bị tắt. Vui lòng dùng /api/auth/sso-token.'
  });
});

// ───────────────────────── QUẢN LÝ TÀI KHOẢN (chỉ ittest) ─────────────────────────

// Tài khoản tạo trong PKT lấy id từ dải riêng, KHÔNG đụng dải id của wp_users
// (hiện là 43..101). sync_users.js dùng "INSERT ... ON DUPLICATE KEY UPDATE" theo id,
// nên nếu tài khoản nội bộ trùng id với một wp_user thì lần sync sau sẽ ghi đè mất.
const PKT_LOCAL_ID_START = 900000;
const ALLOWED_ROLES = ['filler', 'reviewer'];
const ALLOWED_DEPARTMENTS = ['ICAVIET', 'KSCL'];
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const MIN_PASSWORD_LENGTH = 6;

// Quyền quản lý tài khoản được kiểm tra Ở SERVER theo username thật trong DB,
// không tin vào bất kỳ thứ gì client gửi lên ngoài id người gọi.
async function resolveAccountAdmin(req, res) {
  const requesterId = parseInt(
    req.body?.requester_id ?? req.body?.requesterId ?? req.query?.requester_id ?? req.query?.requesterId,
    10
  );

  if (!requesterId) {
    res.status(400).json({ success: false, message: 'Thiếu requester_id' });
    return null;
  }

  const [rows] = await queryWithRetry(
    poolChecker,
    'SELECT id, username FROM icaviet_users WHERE id = ? LIMIT 1',
    [requesterId]
  );

  if (!rows.length || rows[0].username !== 'ittest') {
    res.status(403).json({ success: false, message: 'Chỉ tài khoản ittest được quản lý tài khoản' });
    return null;
  }

  return rows[0];
}

router.get('/api/auth/users', async (req, res) => {
  try {
    if (!(await resolveAccountAdmin(req, res))) return;

    const [rows] = await queryWithRetry(poolChecker, `
      SELECT id, username, name, phong_ban, role, can_comment
      FROM icaviet_users
      ORDER BY id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách tài khoản:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tài khoản' });
  }
});

router.post('/api/auth/users', async (req, res) => {
  try {
    if (!(await resolveAccountAdmin(req, res))) return;

    const username = String(req.body.username || '').trim();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const phongBan = String(req.body.phong_ban || req.body.phongBan || '').trim().toUpperCase();
    const role = String(req.body.role || '').trim().toLowerCase();
    const canComment = req.body.can_comment === true || req.body.can_comment === 1 || req.body.can_comment === '1' ? 1 : 0;

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username phải dài 3-50 ký tự, chỉ gồm chữ, số và . _ -'
      });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
      });
    }
    if (!ALLOWED_DEPARTMENTS.includes(phongBan)) {
      return res.status(400).json({
        success: false,
        message: `Phòng ban chỉ nhận: ${ALLOWED_DEPARTMENTS.join(', ')}`
      });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Quyền chỉ nhận: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    const [existing] = await queryWithRetry(
      poolChecker,
      'SELECT id FROM icaviet_users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: `Username "${username}" đã tồn tại` });
    }

    // Chặn trùng user_login bên WordPress: sync_users.js sẽ đụng UNIQUE KEY username
    // và ghi đè mật khẩu của tài khoản vừa tạo bằng hash bên WP.
    try {
      const [wpRows] = await queryWithRetry(
        poolAuth,
        'SELECT ID FROM wp_users WHERE user_login = ? LIMIT 1',
        [username]
      );
      if (wpRows.length) {
        return res.status(409).json({
          success: false,
          message: `Username "${username}" đã tồn tại bên WordPress. Hãy chạy sync_users.js để đồng bộ thay vì tạo mới, hoặc đặt username khác.`
        });
      }
    } catch (wpError) {
      console.warn('Không kiểm tra được trùng username bên WordPress:', wpError.message);
    }

    // Cột id không AUTO_INCREMENT (đang mượn nguyên wp_users.ID) nên phải tự cấp.
    const [maxRow] = await queryWithRetry(
      poolChecker,
      'SELECT MAX(id) AS max_id FROM icaviet_users WHERE id >= ?',
      [PKT_LOCAL_ID_START]
    );
    const nextId = Math.max(PKT_LOCAL_ID_START, Number(maxRow[0]?.max_id) || 0) + 1;

    await queryWithRetry(
      poolChecker,
      `INSERT INTO icaviet_users (id, username, name, password, phong_ban, role, can_comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nextId, username, name, hashPasswordForWp(password), phongBan, role, canComment]
    );

    res.json({
      success: true,
      message: `Đã tạo tài khoản "${username}"`,
      data: { id: nextId, username, name, phong_ban: phongBan, role, can_comment: canComment }
    });
  } catch (error) {
    console.error('Lỗi tạo tài khoản:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Username đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi tạo tài khoản' });
  }
});

// Bật/tắt quyền comment cho tài khoản ĐÃ CÓ (kể cả tài khoản đồng bộ từ WordPress).
// Không giới hạn cứng số người được bật — bật cho ai là quyết định của ittest.
router.patch('/api/auth/users/:userId/can-comment', async (req, res) => {
  try {
    if (!(await resolveAccountAdmin(req, res))) return;

    const targetId = parseInt(req.params.userId, 10);
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Thiếu user id' });
    }

    const canComment = req.body.can_comment === true || req.body.can_comment === 1 || req.body.can_comment === '1' ? 1 : 0;

    const [result] = await queryWithRetry(
      poolChecker,
      'UPDATE icaviet_users SET can_comment = ? WHERE id = ?',
      [canComment, targetId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    res.json({
      success: true,
      message: canComment ? 'Đã bật quyền comment' : 'Đã tắt quyền comment',
      data: { id: targetId, can_comment: canComment }
    });
  } catch (error) {
    console.error('Lỗi đổi quyền comment:', error);
    res.status(500).json({ success: false, message: 'Lỗi đổi quyền comment' });
  }
});

export default router;
