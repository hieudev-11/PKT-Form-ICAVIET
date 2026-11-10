import express from 'express';
import crypto from 'crypto';
import { poolForm, poolChecker, queryWithRetry } from '../db.js';
import { parseSubmissionData, formTypeFromSlug } from '../lib/submission-normalizers.js';
import { mapReviewRow, buildSearchClause } from '../lib/review-helpers.js';

const router = express.Router();

const EXTERNAL_SEARCH_API_KEY = process.env.EXTERNAL_SEARCH_API_KEY || '';

function isValidApiKey(provided) {
  const bufProvided = Buffer.from(String(provided || ''));
  const bufExpected = Buffer.from(EXTERNAL_SEARCH_API_KEY);
  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

function requireApiKey(req, res, next) {
  if (!EXTERNAL_SEARCH_API_KEY) {
    return res.status(500).json({ success: false, message: 'Chưa cấu hình EXTERNAL_SEARCH_API_KEY trên server.' });
  }

  const providedKey = req.get('X-API-Key') || req.query.api_key || '';

  if (!providedKey || !isValidApiKey(providedKey)) {
    return res.status(403).json({ success: false, message: 'API key không hợp lệ.' });
  }

  next();
}

// Tìm kiếm tổng hợp dành cho website ngoài (cần API key).
// GET /api/external/search?q=<keyword>      -> tìm theo MS/Số ID/Email/Tên/nội dung
// GET /api/external/search?id=<id phiếu>    -> tìm chính xác theo ID phiếu kiểm tra
//   (đúng bằng id truyền đi khi click vào 1 phiếu trong ds160-checker — xem
//   App.vue: activeReviewId.value = review.id -> icaviet_review_queue.id)
// Header bắt buộc: X-API-Key: <key>   (hoặc query ?api_key=<key>)
router.get('/api/external/search', requireApiKey, async (req, res) => {
  const q = String(req.query.q || req.query.search || '').trim();
  const idParam = String(req.query.id || '').trim();
  const id = /^\d+$/.test(idParam) ? parseInt(idParam, 10) : null;

  if (!q && !id) return res.json({ success: true, data: { reviews: [], submissions: [] } });

  try {
    let reviewRows;
    let submissionRows;

    if (id) {
      // Tìm chính xác theo ID phiếu kiểm tra (icaviet_review_queue.id)
      [reviewRows] = await queryWithRetry(poolChecker, `
        SELECT * FROM icaviet_review_queue
        WHERE id = ?
        LIMIT 1
      `, [id]);

      const submissionId = reviewRows.length ? reviewRows[0].submission_id : null;
      if (submissionId) {
        [submissionRows] = await queryWithRetry(poolForm, `
          SELECT id, form_slug, data, submitted_at
          FROM Y52CNGD_ICAVIET_submissions
          WHERE id = ?
        `, [submissionId]);
      } else {
        submissionRows = [];
      }
    } else {
      const { clause, params } = buildSearchClause(q);
      [reviewRows] = await queryWithRetry(poolChecker, `
        SELECT * FROM icaviet_review_queue
        WHERE 1=1 ${clause}
        ORDER BY submitted_at DESC
        LIMIT 100
      `, params);

      const like = `%${q}%`;
      [submissionRows] = await queryWithRetry(poolForm, `
        SELECT id, form_slug, data, submitted_at
        FROM Y52CNGD_ICAVIET_submissions
        WHERE data LIKE ?
        ORDER BY submitted_at DESC
        LIMIT 100
      `, [like]);
    }

    const reviews = reviewRows.map(r => mapReviewRow(r, { includeReviewerName: true, includeReviewChanges: true }));

    const submissions = submissionRows.map(row => {
      const data = parseSubmissionData(row.data);
      return {
        id: row.id,
        formSlug: row.form_slug,
        formType: formTypeFromSlug(row.form_slug),
        fullName: data.fullName || data.beneficiaryFullName || data.customerName || data.petitionerFullName || '',
        idNumber: data.idNumber || '',
        email: data.email || data.emailAddress || '',
        submittedAt: row.submitted_at
      };
    });

    res.json({ success: true, data: { reviews, submissions } });
  } catch (error) {
    console.error('Lỗi khi tìm kiếm tổng hợp (external):', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tìm kiếm tổng hợp' });
  }
});

export default router;
