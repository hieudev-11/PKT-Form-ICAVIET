import express from 'express';
import { poolForm, poolChecker, queryWithRetry } from '../db.js';
import {
  parseJsonField,
  firstFilled,
  parseSubmissionData,
  normalizeBaoLanhData,
  normalizeNDBLData,
  buildI130ACaseData,
  normalizeSubmissionData
} from '../lib/submission-normalizers.js';
import { buildFinalReport } from '../lib/final-report.js';

const router = express.Router();

// ====== API AUDIT LOG / CHECK LOG ======
function normalizeAuditChangedFields(value) {
  const parsed = parseJsonField(value, value || {});
  const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
  const values = parsed.values && typeof parsed.values === 'object' ? parsed.values : {};
  // note: câu mô tả của các log vòng đời phiếu (mở lại / giao lại) - không có field nào đổi.
  return { fields, values, note: String(parsed.note || '') };
}

function formTypeLabel(value, fallbackSlug = '') {
  const raw = String(value || fallbackSlug || '').trim().toLowerCase();
  if (raw === 'ds160' || raw === 'ds-160') return 'Phiếu kiểm tra DS-160';
  if (raw === 'ds260' || raw === 'ds-260') return 'Phiếu kiểm tra DS-260';
  if (raw === 'n600' || raw === 'n-600') return 'Phiếu kiểm tra N-600';
  if (raw === 'n400' || raw === 'n-400') return 'Phiếu kiểm tra N-400';
  if (raw.includes('i130a') || raw.includes('i-130a') || raw === 'bao-lanh' || raw === 'ndbl') return 'Phiếu kiểm tra I-130A';
  if (raw.includes('i129f') || raw.includes('i-129f')) return 'Phiếu kiểm tra I-129F';
  if (!raw) return 'Chưa xác định phiếu';
  return `Phiếu kiểm tra ${String(value || fallbackSlug).toUpperCase()}`;
}

function recursiveFirstFilledKey(data, keys = [], depth = 0, seen = new Set()) {
  if (!data || typeof data !== 'object' || depth > 5 || seen.has(data)) return '';
  seen.add(data);
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object' && String(data[key]).trim() !== '') {
      return data[key];
    }
  }
  for (const value of Object.values(data)) {
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = recursiveFirstFilledKey(item, keys, depth + 1, seen);
        if (found) return found;
      }
    } else {
      const found = recursiveFirstFilledKey(value, keys, depth + 1, seen);
      if (found) return found;
    }
  }
  return '';
}

function recursiveNameFallback(data = {}) {
  const full = recursiveFirstFilledKey(data, [
    'fullName', 'customerName', 'beneficiaryFullName', 'beneficiaryName', 'petitionerFullName',
    'tenTrenGiayTo', 'hoTen', 'name', 'full_name', 'applicantName', 'applicant_name',
    'q29_tenTren', 'q29_tenTrenGiayTo'
  ]);
  if (full) return full;

  const surname = recursiveFirstFilledKey(data, ['surnames', 'surname', 'lastName', 'last_name', 'ho', 'data_1_surnames']);
  const given = recursiveFirstFilledKey(data, ['givenNames', 'given_names', 'firstName', 'first_name', 'ten', 'data_1_given_names']);
  return `${surname || ''} ${given || ''}`.trim();
}

function extractSubmissionName(data = {}) {
  if (!data || typeof data !== 'object') return '';
  const surname = firstFilled(data.surnames, data.surname, data.ho, data.lastName, data.last_name, data.data_1_surnames);
  const given = firstFilled(data.givenNames, data.given_names, data.ten, data.firstName, data.first_name, data.data_1_given_names);
  return firstFilled(
    data.fullName,
    data.customerName,
    data.beneficiaryFullName,
    data.beneficiaryName,
    data.petitionerFullName,
    data.tenTrenGiayTo,
    data.hoTen,
    data.name,
    data.applicantName,
    data.applicant_name,
    data.q29_tenTren,
    `${surname} ${given}`.trim(),
    recursiveNameFallback(data)
  );
}

function normalizeAuditLogRow(row = {}, meta = {}) {
  const changedFields = normalizeAuditChangedFields(row.changed_fields);
  const submissionId = row.submission_id;
  const reviewId = row.review_id;
  const reviewMeta = reviewId ? meta.reviewById?.[String(reviewId)] : null;
  const submissionMeta = submissionId ? meta.submissionById?.[String(submissionId)] : null;
  const customerName = firstFilled(row.customer_name, reviewMeta?.customerName, submissionMeta?.customerName);
  const formLabel = firstFilled(row.form_label, reviewMeta?.formLabel, submissionMeta?.formLabel, formTypeLabel(row.form_type, submissionMeta?.formSlug));
  const formSlug = firstFilled(row.form_slug, submissionMeta?.formSlug);
  let stageLabel = 'Xử lý / điền phiếu';
  if (row.action === 'review_draft_save' || row.action === 'review_complete') stageLabel = 'Tư vấn / kiểm tra';
  else if (row.action === 'draft_delete') stageLabel = 'Xóa bản nháp';
  else if (row.action === 'review_reopen') stageLabel = 'Mở lại phiếu đã giao';

  const customerData = {
    ...(submissionMeta?.customerData || {}),
    ...(reviewMeta?.customerData || {}),
    customerName,
    fullName: customerName,
    fillerName: reviewMeta?.fillerName || row.actor_name || '',
    reviewerName: reviewMeta?.reviewerName || ''
  };

  return {
    id: row.id,
    action: row.action,
    formType: row.form_type,
    form_type: row.form_type,
    formLabel,
    form_label: formLabel,
    formSlug,
    form_slug: formSlug,
    customerName,
    customer_name: customerName,
    applicantName: customerName,
    applicant_name: customerName,
    stageLabel,
    stage_label: stageLabel,
    submissionId,
    submission_id: submissionId,
    reviewId,
    review_id: reviewId,
    actorId: row.actor_id,
    actor_id: row.actor_id,
    actorName: row.actor_name,
    actor_name: row.actor_name,
    actorUsername: row.actor_username,
    actor_username: row.actor_username,
    fillerName: reviewMeta?.fillerName || '',
    filler_name: reviewMeta?.fillerName || '',
    reviewerName: reviewMeta?.reviewerName || '',
    reviewer_name: reviewMeta?.reviewerName || '',
    reviewStatus: reviewMeta?.status || '',
    review_status: reviewMeta?.status || '',
    submittedAt: reviewMeta?.submittedAt || submissionMeta?.submittedAt || '',
    submitted_at: reviewMeta?.submittedAtRaw || submissionMeta?.submittedAtRaw || null,
    changedCount: row.changed_count || changedFields.fields.length,
    changed_count: row.changed_count || changedFields.fields.length,
    changedFields,
    changed_fields: changedFields,
    note: changedFields.note || '',
    customerData,
    customer_data: customerData,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '',
    created_at: row.created_at
  };
}

function normalizeReviewForCheckLog(row = {}) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    customerName: row.customer_name,
    formType: row.form_type,
    formLabel: row.form_label,
    status: row.status,
    fillerId: row.filler_id,
    fillerName: row.filler_name,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name,
    fillerChanges: parseJsonField(row.filler_changes, {}),
    reviewChanges: parseJsonField(row.review_changes, {}),
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleString('vi-VN') : '',
    // Dấu vết mở lại / giao lại, để màn Check log thấy ngay phiếu nào đã bị sửa sau khi giao.
    reopenCount: row.reopen_count || 0,
    resubmitCount: row.resubmit_count || 0,
    reopenedAt: row.reopened_at ? new Date(row.reopened_at).toLocaleString('vi-VN') : '',
    reopenedByName: row.reopened_by_name || ''
  };
}

router.post('/api/audit-logs', async (req, res) => {
  const action = String(req.body.action || '').trim();
  const changedFields = normalizeAuditChangedFields(req.body.changed_fields || req.body.changedFields || {});
  const changedCount = parseInt(req.body.changed_count || req.body.changedCount || changedFields.fields.length || 0, 10);

  if (!action) {
    return res.status(400).json({ success: false, message: 'Thiếu action log' });
  }

  // Thao tác vòng đời phiếu (mở lại / giao lại) không sửa ô nào nhưng vẫn phải vào log,
  // vì đây mới là dấu vết "ai mở lại phiếu đã giao".
  const LIFECYCLE_ACTIONS = ['review_reopen', 'review_resubmit'];
  const isLifecycleAction = LIFECYCLE_ACTIONS.includes(action);

  // Không ghi log rỗng để tránh ghi data gốc/mở phiếu/auto save không thay đổi.
  if (!isLifecycleAction && (!changedFields.fields.length || changedCount <= 0)) {
    return res.json({ success: true, skipped: true, message: 'Không có field thay đổi để ghi log' });
  }

  try {
    await queryWithRetry(poolChecker, `
      INSERT INTO icaviet_audit_logs
        (action, form_type, form_label, submission_id, customer_name, review_id, actor_id, actor_name, actor_username, changed_count, changed_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      action,
      req.body.form_type || req.body.formType || null,
      req.body.form_label || req.body.formLabel || null,
      req.body.submission_id || req.body.submissionId || null,
      req.body.customer_name || req.body.customerName || null,
      req.body.review_id || req.body.reviewId || null,
      req.body.actor_id || req.body.actorId || null,
      req.body.actor_name || req.body.actorName || '',
      req.body.actor_username || req.body.actorUsername || '',
      changedFields.fields.length,
      JSON.stringify(changedFields)
    ]);

    res.json({ success: true, message: 'Đã ghi audit log' });
  } catch (error) {
    console.error('Lỗi ghi audit log:', error);
    res.status(500).json({ success: false, message: 'Lỗi ghi audit log' });
  }
});

// Bản tổng hợp cuối của 1 phiếu: gộp tất cả các lần sửa thành 1 bảng theo từng ô,
// đối chiếu DATA GỐC -> người xử lý điền -> tư vấn sửa -> giá trị cuối.
router.get('/api/check-logs/final', async (req, res) => {
  const username = String(req.query.username || '').trim();
  if (username !== 'ittest') {
    return res.status(403).json({ success: false, message: 'Chỉ tài khoản ittest được xem bản tổng hợp' });
  }

  const reviewId = parseInt(req.query.review_id || req.query.reviewId, 10);
  const submissionId = parseInt(req.query.submission_id || req.query.submissionId, 10);
  if (!Number.isInteger(reviewId) && !Number.isInteger(submissionId)) {
    return res.status(400).json({ success: false, message: 'Cần review_id hoặc submission_id' });
  }

  try {
    const [reviewRows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE ${Number.isInteger(reviewId) ? 'id = ?' : 'submission_id = ?'}
      ORDER BY id DESC
      LIMIT 1
    `, [Number.isInteger(reviewId) ? reviewId : submissionId]);

    const reviewRow = reviewRows[0] || null;
    const targetReviewId = reviewRow?.id || (Number.isInteger(reviewId) ? reviewId : null);
    const targetSubmissionId = reviewRow?.submission_id || (Number.isInteger(submissionId) ? submissionId : null);

    // Log giai đoạn điền phiếu được ghi khi chưa có phiếu trong hàng đợi nên review_id còn trống,
    // phải lấy thêm theo submission_id thì bản tổng hợp mới đủ lịch sử.
    const clauses = [];
    const params = [];
    if (targetReviewId) {
      clauses.push('review_id = ?');
      params.push(targetReviewId);
    }
    if (targetSubmissionId) {
      clauses.push('submission_id = ?');
      params.push(targetSubmissionId);
    }

    let logRows = [];
    if (clauses.length) {
      const [rows] = await queryWithRetry(poolChecker, `
        SELECT * FROM icaviet_audit_logs
        WHERE ${clauses.map(c => `(${c})`).join(' OR ')}
        ORDER BY created_at ASC, id ASC
        LIMIT 2000
      `, params);
      logRows = rows;
    }

    const logs = logRows.map(row => ({
      action: row.action,
      actorName: row.actor_name,
      actorUsername: row.actor_username,
      createdAt: row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '',
      createdAtRaw: row.created_at,
      changedFields: normalizeAuditChangedFields(row.changed_fields)
    }));

    const review = reviewRow ? {
      id: reviewRow.id,
      submissionId: reviewRow.submission_id,
      customerName: reviewRow.customer_name,
      formType: reviewRow.form_type,
      formLabel: firstFilled(reviewRow.form_label, formTypeLabel(reviewRow.form_type)),
      status: reviewRow.status,
      fillerName: reviewRow.filler_name,
      reviewerName: reviewRow.reviewer_name,
      mshs: reviewRow.mshs || '',
      idNumber: reviewRow.id_number || '',
      submittedAt: reviewRow.submitted_at ? new Date(reviewRow.submitted_at).toLocaleString('vi-VN') : '',
      reopenCount: reviewRow.reopen_count || 0,
      resubmitCount: reviewRow.resubmit_count || 0,
      reopenedAt: reviewRow.reopened_at ? new Date(reviewRow.reopened_at).toLocaleString('vi-VN') : '',
      reopenedByName: reviewRow.reopened_by_name || '',
      fillerChanges: parseJsonField(reviewRow.filler_changes, {}),
      reviewChanges: parseJsonField(reviewRow.review_changes, {})
    } : { id: targetReviewId, submissionId: targetSubmissionId, fillerChanges: {}, reviewChanges: {} };

    const { rows, summary } = buildFinalReport({ review, logs });

    res.json({
      success: true,
      data: {
        review: { ...review, fillerChanges: undefined, reviewChanges: undefined },
        rows,
        summary
      }
    });
  } catch (error) {
    console.error('Lỗi lấy bản tổng hợp cuối:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy bản tổng hợp cuối' });
  }
});

router.get('/api/check-logs', async (req, res) => {
  const username = String(req.query.username || '').trim();
  const userId = parseInt(req.query.user_id || req.query.userId || 0, 10);

  if (username !== 'ittest') {
    return res.status(403).json({ success: false, message: 'Chỉ tài khoản ittest được xem Check log' });
  }

  try {
    const clauses = [];
    const params = [];

    if (req.query.submission_id || req.query.submissionId) {
      clauses.push('submission_id = ?');
      params.push(parseInt(req.query.submission_id || req.query.submissionId, 10));
    }
    if (req.query.review_id || req.query.reviewId) {
      clauses.push('review_id = ?');
      params.push(parseInt(req.query.review_id || req.query.reviewId, 10));
    }
    if (req.query.action) {
      clauses.push('action = ?');
      params.push(String(req.query.action));
    }
    if (req.query.form_type || req.query.formType) {
      clauses.push('form_type = ?');
      params.push(String(req.query.form_type || req.query.formType));
    }
    if (req.query.actor) {
      clauses.push('(actor_name LIKE ? OR actor_username LIKE ?)');
      const actor = `%${String(req.query.actor).trim()}%`;
      params.push(actor, actor);
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || 200, 10) || 200, 1), 500);
    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [logRows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_audit_logs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit}
    `, params);

    const [actorRows] = await queryWithRetry(poolChecker, `
      SELECT actor_id, actor_name, actor_username, COUNT(*) AS total
      FROM icaviet_audit_logs
      WHERE (actor_name IS NOT NULL AND actor_name <> '') OR (actor_username IS NOT NULL AND actor_username <> '')
      GROUP BY actor_id, actor_name, actor_username
      ORDER BY actor_name ASC, actor_username ASC
      LIMIT 200
    `);

    const logSubmissionIds = [...new Set(logRows.map(r => r.submission_id).filter(Boolean).map(v => parseInt(v, 10)))];
    const logReviewIds = [...new Set(logRows.map(r => r.review_id).filter(Boolean).map(v => parseInt(v, 10)))];

    const reviewOrClauses = [];
    const reviewParams = [];
    if (req.query.submission_id || req.query.submissionId) {
      reviewOrClauses.push('submission_id = ?');
      reviewParams.push(parseInt(req.query.submission_id || req.query.submissionId, 10));
    }
    if (req.query.review_id || req.query.reviewId) {
      reviewOrClauses.push('id = ?');
      reviewParams.push(parseInt(req.query.review_id || req.query.reviewId, 10));
    }
    if (logReviewIds.length) {
      reviewOrClauses.push('id IN (?)');
      reviewParams.push(logReviewIds);
    }
    if (logSubmissionIds.length) {
      reviewOrClauses.push('submission_id IN (?)');
      reviewParams.push(logSubmissionIds);
    }

    let reviewRows = [];
    if (reviewOrClauses.length) {
      const [rows] = await queryWithRetry(poolChecker, `
        SELECT * FROM icaviet_review_queue
        WHERE ${reviewOrClauses.map(c => `(${c})`).join(' OR ')}
        ORDER BY submitted_at DESC
        LIMIT 200
      `, reviewParams);
      reviewRows = rows;
    }

    const submissionIds = [...new Set([
      ...logSubmissionIds,
      ...reviewRows.map(r => r.submission_id).filter(Boolean).map(v => parseInt(v, 10)),
      ...reviewRows.map(r => r.nbl_submission_id).filter(Boolean).map(v => parseInt(v, 10)),
      ...reviewRows.map(r => r.ndbl_submission_id).filter(Boolean).map(v => parseInt(v, 10))
    ])];

    let submissionRows = [];
    if (submissionIds.length) {
      const [rows] = await queryWithRetry(poolForm, `
        SELECT id, form_slug, data, submitted_at
        FROM Y52CNGD_ICAVIET_submissions
        WHERE id IN (?)
      `, [submissionIds]);
      submissionRows = rows;
    }

    const submissionById = {};
    submissionRows.forEach(row => {
      const raw = parseSubmissionData(row.data);
      let normalized = raw;
      if (row.form_slug === 'bao-lanh') normalized = normalizeBaoLanhData(raw);
      else if (row.form_slug === 'ndbl') normalized = normalizeNDBLData(raw);
      else normalized = normalizeSubmissionData(row.data, { slug: row.form_slug });
      submissionById[String(row.id)] = {
        id: row.id,
        formSlug: row.form_slug,
        formLabel: formTypeLabel('', row.form_slug),
        customerName: extractSubmissionName(normalized),
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleString('vi-VN') : '',
        submittedAtRaw: row.submitted_at,
        rawData: raw,
        normalizedData: normalized,
        customerData: {
          id: row.id,
          submittedAt: row.submitted_at,
          status: normalized.status || '',
          ...normalized
        }
      };
    });

    const reviewById = {};
    reviewRows.forEach(row => {
      const primarySubmission = submissionById[String(row.submission_id)] || {};
      const ndblSubmission = submissionById[String(row.ndbl_submission_id)] || {};
      const nblSubmission = submissionById[String(row.nbl_submission_id)] || {};
      const isI130Final = String(row.form_type || '').toLowerCase() === 'i130a-final';

      let combinedI130Data = null;
      if (isI130Final && (nblSubmission.rawData || ndblSubmission.rawData)) {
        const petitionerData = nblSubmission.normalizedData || normalizeBaoLanhData(nblSubmission.rawData || {});
        combinedI130Data = buildI130ACaseData(petitionerData, ndblSubmission.rawData || null, {
          petitionerSubmissionId: nblSubmission.id || row.nbl_submission_id || '',
          beneficiarySubmissionId: ndblSubmission.id || row.ndbl_submission_id || ''
        });
      }

      const customerName = firstFilled(
        row.customer_name,
        combinedI130Data?.beneficiaryFullName,
        combinedI130Data?.customerName,
        ndblSubmission.customerName,
        primarySubmission.customerName,
        nblSubmission.customerName
      );
      const formLabel = firstFilled(row.form_label, formTypeLabel(row.form_type, primarySubmission.formSlug));
      const baseCustomerData = combinedI130Data
        || primarySubmission.customerData
        || ndblSubmission.customerData
        || nblSubmission.customerData
        || {};

      reviewById[String(row.id)] = {
        id: row.id,
        submissionId: row.submission_id,
        customerName,
        formType: row.form_type,
        formLabel,
        status: row.status,
        fillerName: row.filler_name,
        reviewerName: row.reviewer_name,
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleString('vi-VN') : '',
        submittedAtRaw: row.submitted_at,
        customerData: {
          ...baseCustomerData,
          id: row.submission_id || primarySubmission.id || ndblSubmission.id || nblSubmission.id,
          nblSubmissionId: row.nbl_submission_id || baseCustomerData.nblSubmissionId || baseCustomerData.petitionerSubmissionId || '',
          ndblSubmissionId: row.ndbl_submission_id || baseCustomerData.ndblSubmissionId || baseCustomerData.beneficiarySubmissionId || '',
          customerName,
          fullName: customerName,
          fillerName: row.filler_name || '',
          reviewerName: row.reviewer_name || ''
        }
      };
    });

    const meta = { submissionById, reviewById };

    res.json({
      success: true,
      data: {
        logs: logRows.map(row => normalizeAuditLogRow(row, meta)),
        reviews: reviewRows.map(normalizeReviewForCheckLog),
        actors: actorRows.map(row => ({
          actorId: row.actor_id,
          actorName: row.actor_name || '',
          actorUsername: row.actor_username || '',
          total: row.total || 0
        }))
      }
    });
  } catch (error) {
    console.error('Lỗi lấy check log:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy Check log' });
  }
});

export default router;
