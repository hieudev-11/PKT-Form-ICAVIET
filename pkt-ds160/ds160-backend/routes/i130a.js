import express from 'express';
import { poolForm, poolChecker, queryWithRetry } from '../db.js';
import {
  normalizeFormType,
  parseSubmissionData,
  normalizeBaoLanhData,
  normalizeNDBLData,
  buildI130ACaseData,
  detectI130ARelationCategory,
  getI130ARelationLabel,
  getExpectedBeneficiaryInfo,
  getBeneficiaryIdentityInfo,
  compareExpectedBeneficiary,
  getFormSubmissionById
} from '../lib/submission-normalizers.js';
import { findQueueRowByStatus } from './reviews.js';

const router = express.Router();


// ====== API hồ sơ I-130A riêng biệt ======
// Các route này chỉ phục vụ I-130A, không đi qua /api/ds160.
// ====== API hồ sơ I-130A riêng biệt ======
// Các route này chỉ phục vụ I-130A, không đi qua /api/ds160.
router.get('/api/i130a', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 50));
    const search = req.query.search || '';
    const offset = (page - 1) * perPage;

    // Phân biệt loại form:
    // i130a-nbl   => lấy Người Bảo Lãnh từ form_slug = bao-lanh
    // i130a-ndbl  => lấy Người Được Bảo Lãnh từ form_slug = ndbl
    // i130a-final => lấy danh sách Người Bảo Lãnh để ghép với NDBL
    const requestedFormType = req.query.form_type || req.query.formType || 'i130a-nbl';

    let slug = 'bao-lanh';
    let types = ['i130a', 'i130a-nbl', 'i130a-final'];

    if (requestedFormType === 'i130a-ndbl') {
      slug = 'ndbl';
      types = ['i130a-ndbl'];
    }

    let where = 'WHERE form_slug = ?';
    const params = [slug];

    // ĐÃ BỎ LỌC CỨNG THEO VỢ/CHỒNG.
    // Trước đây có đoạn:
    // where += " AND (data LIKE ? OR data LIKE ? OR data LIKE ?)";
    // params.push('%vo-chong%', '%vo chong%', '%spouse%');
    //
    // Sau khi bỏ, hệ thống sẽ show toàn bộ:
    // - form_slug = bao-lanh đối với Người Bảo Lãnh
    // - form_slug = ndbl đối với Người Được Bảo Lãnh

    if (search) {
      where += ' AND data LIKE ?';
      params.push(`%${search}%`);
    }

    const [countResult] = await queryWithRetry(
      poolForm,
      `SELECT COUNT(*) AS total
       FROM Y52CNGD_ICAVIET_submissions
       ${where}`,
      params
    );

    const total = countResult[0]?.total || 0;

    const [rows] = await queryWithRetry(
      poolForm,
      `SELECT id, form_slug, data, submitted_at, ip_address, status, pdf_path
       FROM Y52CNGD_ICAVIET_submissions
       ${where}
       ORDER BY submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    const submissionIds = rows.map(r => r.id.toString());

    let reviewStatusMap = {};
    if (submissionIds.length > 0) {
      const [queueRows] = await queryWithRetry(
        poolChecker,
        `SELECT submission_id, status
         FROM icaviet_review_queue
         WHERE form_type IN (?) AND submission_id IN (?)`,
        [types, submissionIds]
      );

      queueRows.forEach(qr => {
        reviewStatusMap[qr.submission_id] = qr.status;
      });
    }

    const items = rows.map(row => {
      const parsedData = parseSubmissionData(row.data);

      if (slug === 'ndbl') {
        const ndblData = normalizeNDBLData(parsedData);

        return {
          id: row.id,
          fullName: ndblData.fullName || ndblData.customerName || '',
          petitionerName: '',
          beneficiaryName: ndblData.fullName || '',
          formType: 'i130a-ndbl',
          form_type: 'i130a-ndbl',
          relationCategory: ndblData.relationCategory || detectI130ARelationCategory(ndblData),
          relationLabel: ndblData.relationLabel || getI130ARelationLabel(ndblData.relationCategory || detectI130ARelationCategory(ndblData)),
          gender: ndblData.beneficiaryGender || ndblData.gender || '',
          birthDate: ndblData.beneficiaryBirthDate || ndblData.birthDate || '',
          placeBirth: ndblData.beneficiaryBirthPlace || ndblData.placeBirth || '',
          idNumber: ndblData.idNumber || '',
          contactPrimary: ndblData.beneficiaryDaytimePhone || ndblData.contactPrimary || '',
          email: ndblData.beneficiaryEmail || ndblData.email || ndblData.emailAddress || '',
          maritalStatus: ndblData.beneficiaryMaritalStatus || '',
          occupationTitle01: ndblData.currentEmployerName || '',
          companyName01: '',
          passportNumberVN: ndblData.passportNumber || '',
          submittedAt: row.submitted_at,
          status: row.status,
          reviewStatus: reviewStatusMap[row.id.toString()] || null
        };
      }

      const data = buildI130ACaseData(parsedData, null, {
        petitionerSubmissionId: row.id
      });

      return {
        id: row.id,
        fullName:
          requestedFormType === 'i130a-final'
            ? data.i130aDisplayName || data.customerName || ''
            : data.petitionerFullName || data.fullName || '',
        petitionerName: data.petitionerFullName || data.fullName || '',
        beneficiaryName: data.beneficiaryFullName || '',
        formType: requestedFormType === 'i130a-final' ? 'i130a-final' : 'i130a-nbl',
        form_type: requestedFormType === 'i130a-final' ? 'i130a-final' : 'i130a-nbl',
        relationCategory: data.relationCategory || detectI130ARelationCategory(data),
        relationLabel: data.relationLabel || getI130ARelationLabel(data.relationCategory || detectI130ARelationCategory(data)),
        gender: data.petitionerGender || data.gender || '',
        birthDate: data.petitionerBirthDate || data.birthDate || '',
        placeBirth: data.petitionerBirthCity || data.placeBirth || '',
        idNumber: data.idNumber || '',
        contactPrimary: data.petitionerDaytimePhone || data.contactPrimary || '',
        email: data.petitionerEmail || data.email || data.emailAddress || '',
        maritalStatus: data.maritalStatus || '',
        occupationTitle01: data.occupationTitle01 || '',
        companyName01: data.companyName01 || '',
        passportNumberVN: data.passportNumberVN || '',
        submittedAt: row.submitted_at,
        status: row.status,
        reviewStatus: reviewStatusMap[row.id.toString()] || null
      };
    });

    res.json({
      ok: true,
      data: items,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách hồ sơ I-130A:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/i130a/nbl-list - Lấy danh sách Người Bảo Lãnh rút gọn cho dropdown
router.get('/api/i130a/nbl-list', async (req, res) => {
  try {
    const formInfo = normalizeFormType('i130a');
    let query = `SELECT id, data, submitted_at FROM Y52CNGD_ICAVIET_submissions WHERE form_slug = ? ORDER BY submitted_at DESC LIMIT 500`;
    const [rows] = await queryWithRetry(poolForm, query, [formInfo.slug]);
    const submissionIds = rows.map(r => r.id.toString());
    let reviewStatusMap = {};
    if (submissionIds.length > 0) {
      const [queueRows] = await queryWithRetry(poolChecker, `
        SELECT id, nbl_submission_id, ndbl_submission_id, status, reviewer_name, submitted_at
        FROM icaviet_review_queue
        WHERE form_type = 'i130a-final'
          AND nbl_submission_id IN (?)
        ORDER BY CASE WHEN status IN ('pending', 'in_review') THEN 0 ELSE 1 END, submitted_at DESC
      `, [submissionIds]);

      queueRows.forEach(qr => {
        const key = String(qr.nbl_submission_id);
        if (!reviewStatusMap[key]) reviewStatusMap[key] = qr;
      });
    }
    const list = rows.map(r => {
      const parsed = parseSubmissionData(r.data);
      const normalized = normalizeBaoLanhData(parsed);
      const expectedBeneficiary = getExpectedBeneficiaryInfo(normalized);
      const reviewStatus = reviewStatusMap[String(r.id)] || null;
      const expectedText = expectedBeneficiary.name
        ? ` | NDBL dự kiến: ${expectedBeneficiary.name} - NS: ${expectedBeneficiary.dob || 'N/A'} - SĐT: ${expectedBeneficiary.phone || 'N/A'}`
        : '';
      const label = `[ID ${r.id}] ${normalized.fullName || 'Không tên'} (NS: ${normalized.birthDate || 'N/A'}) - SĐT: ${normalized.contactPrimary || 'N/A'}${expectedText}`;
      const relationCategory = normalized.relationCategory || detectI130ARelationCategory(normalized);
      return {
        id: r.id,
        label,
        fullName: normalized.fullName,
        birthDate: normalized.birthDate,
        contactPrimary: normalized.contactPrimary,
        expectedBeneficiary,
        beneficiaryExpectedName: expectedBeneficiary.name,
        beneficiaryExpectedDob: expectedBeneficiary.dob,
        beneficiaryExpectedPhone: expectedBeneficiary.phone,
        relationCategory,
        relationLabel: getI130ARelationLabel(relationCategory),
        reviewStatus: reviewStatus?.status || null,
        reviewId: reviewStatus?.id || null,
        reviewReviewerName: reviewStatus?.reviewer_name || '',
        reviewSubmittedAt: reviewStatus?.submitted_at || null,
        pairedNblSubmissionId: reviewStatus?.nbl_submission_id || null,
        pairedNdblSubmissionId: reviewStatus?.ndbl_submission_id || null
      };
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Lỗi lấy danh sách NBL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/i130a/ndbl-list - Lấy danh sách Người Được Bảo Lãnh rút gọn cho dropdown
router.get('/api/i130a/ndbl-list', async (req, res) => {
  try {
    let query = `SELECT id, data, submitted_at FROM Y52CNGD_ICAVIET_submissions WHERE form_slug = 'ndbl' ORDER BY submitted_at DESC LIMIT 500`;
    const [rows] = await queryWithRetry(poolForm, query, []);
    const submissionIds = rows.map(r => r.id.toString());
    let reviewStatusMap = {};
    if (submissionIds.length > 0) {
      const [queueRows] = await queryWithRetry(poolChecker, `
        SELECT id, nbl_submission_id, ndbl_submission_id, status, reviewer_name, submitted_at
        FROM icaviet_review_queue
        WHERE form_type = 'i130a-final'
          AND ndbl_submission_id IN (?)
        ORDER BY CASE WHEN status IN ('pending', 'in_review') THEN 0 ELSE 1 END, submitted_at DESC
      `, [submissionIds]);

      queueRows.forEach(qr => {
        const key = String(qr.ndbl_submission_id);
        if (!reviewStatusMap[key]) reviewStatusMap[key] = qr;
      });
    }
    const list = rows.map(r => {
      const parsed = parseSubmissionData(r.data);
      const normalized = normalizeNDBLData(parsed);
      const identity = getBeneficiaryIdentityInfo(normalized);
      const reviewStatus = reviewStatusMap[String(r.id)] || null;
      const label = `[ID ${r.id}] ${identity.name || 'Không tên'} (NS: ${identity.dob || 'N/A'}) - SĐT: ${identity.phone || 'N/A'}`;
      const relationCategory = normalized.relationCategory || detectI130ARelationCategory(normalized);
      return {
        id: r.id,
        label,
        fullName: identity.name,
        birthDate: identity.dob,
        contactPrimary: identity.phone,
        identity,
        relationCategory,
        relationLabel: getI130ARelationLabel(relationCategory),
        reviewStatus: reviewStatus?.status || null,
        reviewId: reviewStatus?.id || null,
        reviewReviewerName: reviewStatus?.reviewer_name || '',
        reviewSubmittedAt: reviewStatus?.submitted_at || null,
        pairedNblSubmissionId: reviewStatus?.nbl_submission_id || null,
        pairedNdblSubmissionId: reviewStatus?.ndbl_submission_id || null
      };
    });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Lỗi lấy danh sách NDBL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/i130a/combine - Kết hợp hồ sơ NBL và NDBL theo chỉ định thủ công
router.get('/api/i130a/combine', async (req, res) => {
  try {
    const nblId = parseInt(req.query.nbl_id);
    const ndblId = parseInt(req.query.ndbl_id);
    const allowAssigned = req.query.allow_assigned === '1' || req.query.allowAssigned === '1';
    
    if (!nblId) {
      return res.status(400).json({ ok: false, error: 'Thiếu nbl_id' });
    }
    
    if (!allowAssigned && ndblId) {
      const [lockedRows] = await queryWithRetry(poolChecker, `
        SELECT id, nbl_submission_id, ndbl_submission_id, status, reviewer_name
        FROM icaviet_review_queue
        WHERE form_type = 'i130a-final'
          AND status IN ('pending', 'in_review')
          AND (nbl_submission_id = ? OR ndbl_submission_id = ?)
        LIMIT 1
      `, [nblId, ndblId]);

      if (lockedRows.length > 0) {
        const locked = lockedRows[0];
        const reviewerText = locked.reviewer_name ? ` cho ${locked.reviewer_name}` : '';
        return res.status(409).json({
          ok: false,
          error: `Ho so nay da duoc giao kiem tra${reviewerText}. Vui long mo trong danh sach kiem tra hoac xu ly phieu dang cho truoc.`
        });
      }
    }

    const [nblRows] = await queryWithRetry(poolForm,
      `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = 'bao-lanh'`,
      [nblId]
    );
    if (nblRows.length === 0) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy hồ sơ NBL với ID: ${nblId}` });
    }
    const nblRow = nblRows[0];
    const petitionerRaw = parseSubmissionData(nblRow.data);
    const petitionerData = normalizeBaoLanhData(petitionerRaw);
    
    let beneficiaryRaw = null;
    let beneficiaryId = '';
    if (ndblId) {
      const [ndblRows] = await queryWithRetry(poolForm,
        `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = 'ndbl'`,
        [ndblId]
      );
      if (ndblRows.length > 0) {
        beneficiaryRaw = parseSubmissionData(ndblRows[0].data);
        beneficiaryId = ndblRows[0].id;
      }
    }
    
    const beneficiaryData = beneficiaryRaw ? normalizeNDBLData(beneficiaryRaw) : {};
    const pairingValidation = beneficiaryRaw
      ? compareExpectedBeneficiary(petitionerData, beneficiaryData)
      : { enabled: !!getExpectedBeneficiaryInfo(petitionerData).name, passed: false, score: 0, expected: getExpectedBeneficiaryInfo(petitionerData), actual: {}, message: 'Chưa chọn hồ sơ Người được bảo lãnh để đối chiếu.' };

    const data = buildI130ACaseData(petitionerData, beneficiaryRaw, {
      petitionerSubmissionId: nblRow.id,
      beneficiarySubmissionId: beneficiaryId
    });
    data.pairingValidation = pairingValidation;
    
    res.json({
      ok: true,
      data: {
        id: nblRow.id,
        form_slug: 'i130a-final',
        fields: data,
        submittedAt: nblRow.submitted_at,
        ipAddress: nblRow.ip_address,
        status: nblRow.status
      }
    });
  } catch (error) {
    console.error('Lỗi ghép hồ sơ I-130A:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/api/i130a/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const requestedFormType = req.query.form_type || req.query.formType || 'i130a-nbl';
    
    let slug = 'bao-lanh';
    if (requestedFormType === 'i130a-ndbl') {
      slug = 'ndbl';
    }

    const [rows] = await queryWithRetry(poolForm,
      `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = ?`,
      [id, slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy hồ sơ với ID: ${id}` });
    }

    const row = rows[0];
    const raw = parseSubmissionData(row.data);
    
    if (requestedFormType === 'i130a-ndbl') {
      const fullCaseData = buildI130ACaseData({}, raw, { beneficiarySubmissionId: row.id });
      res.json({
        ok: true,
        data: { id: row.id, form_slug: row.form_slug, fields: fullCaseData, submittedAt: row.submitted_at, ipAddress: row.ip_address, status: row.status }
      });
    } else {
      const fullCaseData = buildI130ACaseData(raw, null, { petitionerSubmissionId: row.id });
      res.json({
        ok: true,
        data: { id: row.id, form_slug: row.form_slug, fields: fullCaseData, submittedAt: row.submitted_at, ipAddress: row.ip_address, status: row.status }
      });
    }
  } catch (error) {
    console.error('Lỗi lấy chi tiết hồ sơ I-130A:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/i130a/reviews/submit', async (req, res) => {
  const { submission_id, customer_name, filler_id, filler_name, reviewer_id, reviewer_name, filler_changes, form_type, nbl_submission_id, ndbl_submission_id } = req.body;
  try {
    const fType = form_type || 'i130a-final';
    const fLabel = fType === 'i130a-nbl' ? 'I-130A — NBL' : (fType === 'i130a-ndbl' ? 'I-130A — NDBL' : 'I-130 — Final');

    if (fType === 'i130a-final') {
      const nblId = parseInt(nbl_submission_id || submission_id, 10);
      const ndblId = parseInt(ndbl_submission_id, 10);

      if (!nblId || !ndblId) {
        return res.status(400).json({
          success: false,
          message: 'Phiếu I-130 Final cần chọn đủ Người bảo lãnh và Người được bảo lãnh trước khi giao kiểm tra.'
        });
      }

      const [duplicateRows] = await queryWithRetry(poolChecker, `
        SELECT id, nbl_submission_id, ndbl_submission_id, customer_name, status
        FROM icaviet_review_queue
        WHERE form_type = 'i130a-final'
          AND status IN ('pending', 'in_review')
          AND (nbl_submission_id = ? OR ndbl_submission_id = ?)
        LIMIT 1
      `, [nblId, ndblId]);

      if (duplicateRows.length > 0) {
        const duplicate = duplicateRows[0];
        const duplicatedSide = String(duplicate.ndbl_submission_id) === String(ndblId)
          ? `Người được bảo lãnh ID ${ndblId}`
          : `Người bảo lãnh ID ${nblId}`;
        return res.status(409).json({
          success: false,
          message: `${duplicatedSide} đã được ghép trong phiếu đang chờ kiểm tra. Vui lòng hủy/sửa phiếu cũ trước khi ghép lại.`
        });
      }

      const nblRow = await getFormSubmissionById(nblId, 'bao-lanh');
      const ndblRow = await getFormSubmissionById(ndblId, 'ndbl');
      if (!nblRow || !ndblRow) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ NBL hoặc NDBL để đối chiếu.' });
      }

      const petitionerData = normalizeBaoLanhData(parseSubmissionData(nblRow.data));
      const beneficiaryData = normalizeNDBLData(parseSubmissionData(ndblRow.data));
      const pairingValidation = compareExpectedBeneficiary(petitionerData, beneficiaryData);

      if (pairingValidation.enabled && !pairingValidation.passed) {
        return res.status(409).json({
          success: false,
          message: `${pairingValidation.message} NBL khai: ${pairingValidation.expected.name || 'N/A'} - ${pairingValidation.expected.dob || 'N/A'} - ${pairingValidation.expected.phone || 'N/A'}. NDBL chọn: ${pairingValidation.actual.name || 'N/A'} - ${pairingValidation.actual.dob || 'N/A'} - ${pairingValidation.actual.phone || 'N/A'}.`,
          pairingValidation
        });
      }
    }

    // Phiếu đang nằm trong hàng đợi của tư vấn thì không ai được submit đè lên;
    // muốn sửa phải nhờ ittest mở lại trước.
    const inQueueRow = await findQueueRowByStatus({
      submissionId: submission_id,
      formType: fType,
      nblSubmissionId: nbl_submission_id,
      ndblSubmissionId: ndbl_submission_id,
      statuses: ['pending', 'in_review']
    });

    if (inQueueRow) {
      return res.status(409).json({
        success: false,
        message: `Phiếu này đã giao cho ${inQueueRow.reviewer_name || 'tư vấn'} kiểm tra nên không submit đè được. Vui lòng báo ittest mở lại phiếu nếu cần sửa.`
      });
    }

    // Phiếu đã được ittest mở lại để sửa thì giao lại chính phiếu đó,
    // không tạo thêm dòng mới trong hàng đợi kiểm tra.
    const reopenedRow = await findQueueRowByStatus({
      submissionId: submission_id,
      formType: fType,
      nblSubmissionId: nbl_submission_id,
      ndblSubmissionId: ndbl_submission_id
    });

    if (reopenedRow) {
      await queryWithRetry(poolChecker, `
        UPDATE icaviet_review_queue
        SET status = 'pending',
            customer_name = ?,
            filler_id = ?,
            filler_name = ?,
            reviewer_id = ?,
            reviewer_name = ?,
            filler_changes = ?,
            submitted_at = CURRENT_TIMESTAMP,
            resubmit_count = resubmit_count + 1
        WHERE id = ?
      `, [customer_name, filler_id, filler_name, reviewer_id, reviewer_name, JSON.stringify(filler_changes || {}), reopenedRow.id]);

      return res.json({
        success: true,
        id: reopenedRow.id,
        updated: true,
        message: `✅ Đã giao lại phiếu I-130A "${customer_name}" cho ${reviewer_name} kiểm tra!`
      });
    }

    const [result] = await queryWithRetry(poolChecker, `
      INSERT INTO icaviet_review_queue
      (submission_id, customer_name, form_type, form_label, filler_id, filler_name, reviewer_id, reviewer_name, filler_changes, nbl_submission_id, ndbl_submission_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [submission_id, customer_name, fType, fLabel, filler_id, filler_name, reviewer_id, reviewer_name, JSON.stringify(filler_changes || {}), nbl_submission_id || null, ndbl_submission_id || null]);

    res.json({ success: true, id: result.insertId, message: `✅ Đã giao phiếu I-130A "${customer_name}" cho ${reviewer_name} kiểm tra!` });
  } catch (error) {
    console.error('Lỗi khi submit I-130A vào hàng đợi:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi khi đưa phiếu I-130A vào hàng đợi' });
  }
});
router.post('/api/i130a/reviews/complete', async (req, res) => {
  const { review_id, changes } = req.body;
  try {
    await queryWithRetry(poolChecker, `
      UPDATE icaviet_review_queue
      SET status = 'completed', review_changes = ?
      WHERE id = ? AND form_type IN ('i130a', 'i-130a', 'i-130-a', 'i130a-nbl', 'i130a-ndbl', 'i130a-final')
    `, [JSON.stringify(changes), review_id]);

    res.json({ success: true, message: '✅ Đã hoàn tất và lưu phiếu kiểm tra I-130A thành công!' });
  } catch (error) {
    console.error('Lỗi khi hoàn tất kiểm tra I-130A:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu kết quả kiểm tra I-130A' });
  }
});

export default router;
