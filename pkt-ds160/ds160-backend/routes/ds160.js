import express from 'express';
import { poolForm, poolChecker, queryWithRetry } from '../db.js';
import { normalizeFormType, normalizeSubmissionData } from '../lib/submission-normalizers.js';

const router = express.Router();


// ====== API hồ sơ từ Form DB icaholding ======

// Lấy danh sách submissions DS-160 (tóm tắt)
router.get('/api/ds160', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 50));
    const search = req.query.search || '';
    const offset = (page - 1) * perPage;

    const formInfo = normalizeFormType(req.query.form_type || req.query.formType || req.query.form_slug || 'ds160');
    let where = "WHERE form_slug = ?";
    const params = [formInfo.slug];

    if (search) {
      where += " AND data LIKE ?";
      params.push(`%${search}%`);
    }

    const [countResult] = await queryWithRetry(poolForm,
      `SELECT COUNT(*) AS total FROM Y52CNGD_ICAVIET_submissions ${where}`,
      params
    );
    const total = countResult[0].total;

    const [rows] = await queryWithRetry(poolForm,
      `SELECT id, form_slug, data, submitted_at, ip_address, status, pdf_path
       FROM Y52CNGD_ICAVIET_submissions ${where}
       ORDER BY submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    const submissionIds = rows.map(r => r.id.toString());
    let reviewStatusMap = {};
    if (submissionIds.length > 0) {
      const [queueRows] = await queryWithRetry(poolChecker,
        `SELECT submission_id, status FROM icaviet_review_queue WHERE form_type IN (?) AND submission_id IN (?)`,
        [formInfo.types, submissionIds]
      );
      queueRows.forEach(qr => {
        reviewStatusMap[qr.submission_id] = qr.status;
      });
    }

    const items = rows.map(row => {
      let data = {};
      data = normalizeSubmissionData(row.data, formInfo)
      return {
        id: row.id,
        fullName: data.fullName || data.beneficiaryFullName || data.customerName || data.petitionerFullName || '',
        formType: formInfo.types[0],
        form_type: formInfo.types[0],
        gender: data.gender || '',
        birthDate: data.birthDate || '',
        placeBirth: data.placeBirth || '',
        idNumber: data.idNumber || '',
        contactPrimary: data.contactPrimary || '',
        email: data.email || data.emailAddress || data.petitionerEmail || '',
        maritalStatus: data.maritalStatus || '',
        occupationTitle01: data.occupationTitle01 || '',
        companyName01: data.companyName01 || '',
        passportNumberVN: data.passportNumberVN || '',
        submittedAt: row.submitted_at,
        status: row.status,
        reviewStatus: reviewStatusMap[row.id.toString()] || null
      };
    });

    res.json({ ok: true, data: items, total, page, per_page: perPage, total_pages: Math.ceil(total / perPage) });
  } catch (error) {
    console.error('Lỗi lấy danh sách hồ sơ:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Lấy chi tiết 1 submission DS-160
router.get('/api/ds160/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const formInfo = normalizeFormType(req.query.form_type || req.query.formType || req.query.form_slug || 'ds160');
    const [rows] = await queryWithRetry(poolForm,
      `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = ?`,
      [id, formInfo.slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy hồ sơ ${formInfo.label} với ID: ${id}` });
    }
    const row = rows[0];
    let data = {};
    data = normalizeSubmissionData(row.data, formInfo)

    res.json({
      ok: true,
      data: { id: row.id, form_slug: row.form_slug, fields: data, submittedAt: row.submitted_at, ipAddress: row.ip_address, status: row.status }
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết hồ sơ:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
