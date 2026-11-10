import express from 'express';
import cors from 'cors';
import { poolAuth, poolForm, poolChecker, queryWithRetry } from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import draftsRouter from './routes/drafts.js';
import authRouter from './routes/auth.js';
import reviewsRouter from './routes/reviews.js';
import auditLogsRouter from './routes/audit-logs.js';
import ds160Router from './routes/ds160.js';
import i130aRouter from './routes/i130a.js';
import searchRouter from './routes/search.js';
import externalSearchRouter from './routes/external-search.js';
import commentsRouter from './routes/comments.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(draftsRouter);
app.use(authRouter);
app.use(reviewsRouter);
app.use(auditLogsRouter);
app.use(ds160Router);
app.use(i130aRouter);
app.use(searchRouter);
app.use(externalSearchRouter);
app.use(commentsRouter);



// Kiểm tra kết nối DB và tạo bảng nội bộ
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows1] = await queryWithRetry(poolAuth, 'SELECT 1 + 1 AS solution');
    const [rows2] = await queryWithRetry(poolForm, 'SELECT 1 + 1 AS solution');
    const [rows3] = await queryWithRetry(poolChecker, 'SELECT 1 + 1 AS solution');
    res.json({
      success: true,
      message: 'Kết nối cả 3 Database thành công!',
      auth_db: rows1,
      form_db: rows2,
      checker_db: rows3
    });
  } catch (error) {
    console.error('Lỗi kết nối DB:', error);
    res.status(500).json({ success: false, message: 'Lỗi kết nối Database', error: error.message });
  }
});

// Khởi tạo DB nội bộ (Chỉ chạy khi start server)
async function initCheckerDB() {
  try {
    await queryWithRetry(poolChecker, `
      CREATE TABLE IF NOT EXISTS icaviet_review_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        submission_id INT NOT NULL,
        customer_name VARCHAR(255),
        form_type VARCHAR(100) NOT NULL,
        form_label VARCHAR(100),
        filler_id INT NOT NULL,
        filler_name VARCHAR(255),
        reviewer_id INT NOT NULL,
        reviewer_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        filler_changes JSON,
        review_changes JSON,
        nbl_submission_id INT,
        ndbl_submission_id INT,
        mshs VARCHAR(100),
        id_number VARCHAR(100),
        email VARCHAR(255),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mshs (mshs),
        INDEX idx_id_number (id_number),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // Tự động thêm cột filler_changes nếu bảng đã tồn tại trước đó
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN IF NOT EXISTS filler_changes JSON;
    `).catch(() => { }); // Bỏ qua nếu cột đã có
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN nbl_submission_id INT;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN ndbl_submission_id INT;
    `).catch(() => { });
    // Tự động thêm cột mshs/id_number/email nếu bảng đã tồn tại trước đó (search theo MS/ID/email)
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN mshs VARCHAR(100);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN id_number VARCHAR(100);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN email VARCHAR(255);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD INDEX idx_mshs (mshs);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD INDEX idx_id_number (id_number);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD INDEX idx_email (email);
    `).catch(() => { });
    // Mở lại phiếu đã giao kiểm tra: phiếu chuyển về status 'reopened' (rời hàng đợi
    // của tư vấn, quay lại tay người xử lý) và giữ nguyên filler_changes để sửa tiếp,
    // thay vì phải điền lại phiếu từ đầu. Các cột dưới đây lưu dấu vết ai mở lại, mấy lần.
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN reopen_count INT NOT NULL DEFAULT 0;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN reopened_at DATETIME NULL;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN reopened_by_id INT NULL;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN reopened_by_name VARCHAR(255) NULL;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD COLUMN resubmit_count INT NOT NULL DEFAULT 0;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_review_queue ADD INDEX idx_submission_form (submission_id, form_type);
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      CREATE TABLE IF NOT EXISTS icaviet_form_drafts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        draft_key VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        draft_type VARCHAR(20) NOT NULL,
        form_type VARCHAR(100),
        customer_id INT NULL,
        review_id INT NULL,
        draft_data JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_draft_key_user (draft_key, user_id),
        INDEX idx_user_type (user_id, draft_type),
        INDEX idx_customer (customer_id),
        INDEX idx_review (review_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await queryWithRetry(poolChecker, `
      CREATE TABLE IF NOT EXISTS icaviet_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(80) NOT NULL,
        form_type VARCHAR(100),
        submission_id INT NULL,
        review_id INT NULL,
        actor_id INT NULL,
        actor_name VARCHAR(255),
        actor_username VARCHAR(255),
        form_label VARCHAR(255),
        customer_name VARCHAR(255),
        changed_count INT DEFAULT 0,
        changed_fields JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_action (action),
        INDEX idx_submission (submission_id),
        INDEX idx_review (review_id),
        INDEX idx_actor (actor_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_audit_logs ADD COLUMN form_label VARCHAR(255) NULL;
    `).catch(() => { });
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_audit_logs ADD COLUMN customer_name VARCHAR(255) NULL;
    `).catch(() => { });
    // Quyền comment trên phiếu "Đã kiểm tra" — bật/tắt trong màn Tạo tài khoản (chỉ ittest).
    await queryWithRetry(poolChecker, `
      ALTER TABLE icaviet_users ADD COLUMN can_comment TINYINT(1) NOT NULL DEFAULT 0;
    `).catch(() => { });

    // Comment theo TỪNG DÒNG của cột TƯ VẤN. cell_id là data-cell-id của ô note
    // (vd note_1_12) nên comment bám đúng dòng kể cả khi phiếu render lại.
    await queryWithRetry(poolChecker, `
      CREATE TABLE IF NOT EXISTS icaviet_review_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        cell_id VARCHAR(255) NOT NULL,
        row_label VARCHAR(500) NULL,
        user_id INT NOT NULL,
        user_name VARCHAR(255) NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_review (review_id),
        INDEX idx_review_cell (review_id, cell_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Đã kiểm tra/tạo bảng icaviet_review_queue thành công trong icawikic_pkt.');
  } catch (err) {
    console.error('❌ Lỗi tạo bảng icaviet_review_queue:', err);
  }
}
initCheckerDB();

// Serve Vue frontend (sau khi npm run build)
const distPath = join(__dirname, '../ds160-checker/dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(distPath, 'index.html'))
  }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
