import express from 'express';
import { poolForm, poolChecker, queryWithRetry } from '../db.js';
import { parseSubmissionData, formTypeFromSlug } from '../lib/submission-normalizers.js';
import { mapReviewRow, buildSearchClause } from '../lib/review-helpers.js';

const router = express.Router();

// Tìm kiếm tổng hợp: quét cả hàng đợi kiểm tra (mshs/id/email/tên) lẫn
// hồ sơ điền đơn gốc (mọi loại phiếu), không phân biệt đang ở màn hình nào.
router.get('/api/search/global', async (req, res) => {
  const q = String(req.query.q || req.query.search || '').trim();
  if (!q) return res.json({ success: true, data: { reviews: [], submissions: [] } });

  try {
    const { clause, params } = buildSearchClause(q);
    const [reviewRows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE 1=1 ${clause}
      ORDER BY submitted_at DESC
      LIMIT 100
    `, params);

    const reviews = reviewRows.map(r => mapReviewRow(r, { includeReviewerName: true, includeReviewChanges: true }));

    const like = `%${q}%`;
    const [submissionRows] = await queryWithRetry(poolForm, `
      SELECT id, form_slug, data, submitted_at
      FROM Y52CNGD_ICAVIET_submissions
      WHERE data LIKE ?
      ORDER BY submitted_at DESC
      LIMIT 100
    `, [like]);

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
    console.error('Lỗi khi tìm kiếm tổng hợp:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tìm kiếm tổng hợp' });
  }
});

export default router;
