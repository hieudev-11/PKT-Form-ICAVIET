import { poolAuth, poolChecker } from './db.js';

async function syncUsers() {
  try {
    console.log('Đang tạo bảng icaviet_users trong DB nội bộ...');
    await poolChecker.query(`
      CREATE TABLE IF NOT EXISTS icaviet_users (
        id INT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        password VARCHAR(255),
        phong_ban VARCHAR(50),
        role VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Đang lấy danh sách user từ WordPress...');
    const [users] = await poolAuth.query(`
      SELECT u.ID, u.user_login, u.user_pass, 
             u.display_name as name,
             m.meta_value as capabilities
      FROM wp_users u
      JOIN wp_usermeta m ON m.user_id = u.ID AND m.meta_key = 'wp_capabilities'
    `);

    let count = 0;
    for (const user of users) {
      const cap = (user.capabilities || '').toLowerCase();
      let phong_ban = '';
      let role = 'filler';

      if (cap.includes('kscl')) {
        phong_ban = 'KSCL';
        role = 'reviewer';
      } else if (cap.includes('hocviec_viet') || cap.includes('quanly_viet') || cap.includes('nhanvien_viet') || cap.includes('chuyenvien_viet')) {
        phong_ban = 'ICAVIET';
        role = 'filler';
      }

      // Chỉ copy nhân viên ICAVIET hoặc KSCL hoặc account test
      if (phong_ban || user.user_login === 'ittest') {
        if (user.user_login === 'ittest') {
           phong_ban = 'ICAVIET';
           role = 'filler';
        }
        
        await poolChecker.query(`
          INSERT INTO icaviet_users (id, username, name, password, phong_ban, role)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            name = VALUES(name), password = VALUES(password), 
            phong_ban = VALUES(phong_ban), role = VALUES(role)
        `, [user.ID, user.user_login, user.name, user.user_pass, phong_ban, role]);
        count++;
      }
    }

    console.log(`✅ Copy thành công ${count} nhân viên sang bảng icaviet_users!`);
    process.exit(0);
  } catch (error) {
    console.error('Lỗi:', error);
    process.exit(1);
  }
}

syncUsers();
