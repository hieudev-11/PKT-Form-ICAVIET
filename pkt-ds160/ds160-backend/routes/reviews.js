import express from 'express';
import { poolChecker, queryWithRetry } from '../db.js';
import { mapReviewRow, buildSearchClause, REOPENED_STATUS, writeLifecycleAuditLog } from '../lib/review-helpers.js';

const router = express.Router();

// Phiếu đang được người xử lý mở lại để sửa (status 'reopened') thì lần submit sau
// phải GHI ĐÈ đúng phiếu đó, không tạo thêm dòng mới - nếu không, hàng đợi của tư vấn
// sẽ có 2 phiếu cùng một hồ sơ và không biết phiếu nào là bản mới.
export async function findQueueRowByStatus({ submissionId, formType, nblSubmissionId, ndblSubmissionId, statuses = [REOPENED_STATUS] }) {
  const clauses = [`status IN (${statuses.map(() => '?').join(', ')})`];
  const params = [...statuses];

  if (formType) {
    clauses.push('form_type = ?');
    params.push(formType);
  }

  // Phiếu I-130 Final khóa theo cặp NBL/NDBL; các phiếu khác khóa theo submission_id.
  if (nblSubmissionId && ndblSubmissionId) {
    clauses.push('nbl_submission_id = ? AND ndbl_submission_id = ?');
    params.push(parseInt(nblSubmissionId, 10), parseInt(ndblSubmissionId, 10));
  } else if (submissionId) {
    clauses.push('submission_id = ?');
    params.push(parseInt(submissionId, 10));
  } else {
    return null;
  }

  const [rows] = await queryWithRetry(poolChecker, `
    SELECT * FROM icaviet_review_queue
    WHERE ${clauses.join(' AND ')}
    ORDER BY id DESC
    LIMIT 1
  `, params);

  return rows[0] || null;
}

// 1. Submit phiếu vào hàng đợi
router.post('/api/reviews/submit', async (req, res) => {
  const { submission_id, customer_name, form_type, form_label, filler_id, filler_name, reviewer_id, reviewer_name, filler_changes, nbl_submission_id, ndbl_submission_id, mshs, id_number, email } = req.body;
  try {
    // Phiếu đang nằm trong hàng đợi của tư vấn thì không ai được submit đè lên.
    // Muốn sửa phải nhờ ittest mở lại (status 'reopened') - đó là chốt chặn duy nhất,
    // nếu không thì chỉ cần giữ lại link cũ là qua mặt được quyền mở lại.
    const inQueueRow = await findQueueRowByStatus({
      submissionId: submission_id,
      formType: form_type,
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

    const reopenedRow = await findQueueRowByStatus({
      submissionId: submission_id,
      formType: form_type,
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
            mshs = COALESCE(?, mshs),
            id_number = COALESCE(?, id_number),
            email = COALESCE(?, email),
            submitted_at = CURRENT_TIMESTAMP,
            resubmit_count = resubmit_count + 1
        WHERE id = ?
      `, [customer_name, filler_id, filler_name, reviewer_id, reviewer_name, JSON.stringify(filler_changes || {}), mshs || null, id_number || null, email || null, reopenedRow.id]);

      return res.json({
        success: true,
        id: reopenedRow.id,
        updated: true,
        message: `✅ Đã giao lại phiếu "${customer_name}" cho ${reviewer_name} kiểm tra!`
      });
    }

    const [result] = await queryWithRetry(poolChecker, `
      INSERT INTO icaviet_review_queue
      (submission_id, customer_name, form_type, form_label, filler_id, filler_name, reviewer_id, reviewer_name, filler_changes, nbl_submission_id, ndbl_submission_id, mshs, id_number, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [submission_id, customer_name, form_type, form_label, filler_id, filler_name, reviewer_id, reviewer_name, JSON.stringify(filler_changes || {}), nbl_submission_id || null, ndbl_submission_id || null, mshs || null, id_number || null, email || null]);

    res.json({ success: true, id: result.insertId, message: `✅ Đã giao phiếu "${customer_name}" cho ${reviewer_name} kiểm tra!` });
  } catch (error) {
    console.error('Lỗi khi submit vào hàng đợi:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi đưa phiếu vào hàng đợi' });
  }
});

// 1b. Lấy phiếu trong hàng đợi theo hồ sơ, để người xử lý mở lại được bản đã submit
// (giữ nguyên những gì đã điền) thay vì phải gõ lại từ đầu.
router.get('/api/reviews/by-submission/:submissionId', async (req, res) => {
  const submissionId = parseInt(req.params.submissionId, 10);
  if (!Number.isInteger(submissionId)) {
    return res.status(400).json({ success: false, message: 'submission_id không hợp lệ' });
  }

  const formType = String(req.query.form_type || req.query.formType || '').trim();
  const clauses = ['(submission_id = ? OR nbl_submission_id = ? OR ndbl_submission_id = ?)'];
  const params = [submissionId, submissionId, submissionId];
  if (formType) {
    clauses.push('form_type = ?');
    params.push(formType);
  }

  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE ${clauses.join(' AND ')}
      ORDER BY id DESC
      LIMIT 1
    `, params);

    if (!rows.length) {
      return res.json({ success: true, data: null });
    }

    const row = rows[0];
    res.json({
      success: true,
      data: {
        ...mapReviewRow(row, { includeReviewerName: true, includeReviewChanges: true }),
        reopenCount: row.reopen_count || 0,
        resubmitCount: row.resubmit_count || 0,
        reopenedAt: row.reopened_at ? new Date(row.reopened_at).toLocaleString('vi-VN') : '',
        reopenedByName: row.reopened_by_name || ''
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy phiếu theo hồ sơ:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy phiếu của hồ sơ này' });
  }
});

// 1c. Mở lại phiếu đã giao cho tư vấn, để người xử lý sửa tiếp rồi giao lại.
// Phiếu rời hàng đợi kiểm tra nhưng KHÔNG bị xóa: filler_changes giữ nguyên nên
// người xử lý mở ra là thấy đúng những gì mình đã điền.
router.post('/api/reviews/reopen', async (req, res) => {
  const reviewId = parseInt(req.body.review_id || req.body.reviewId, 10);
  const actorId = parseInt(req.body.actor_id || req.body.actorId, 10) || null;
  const actorName = String(req.body.actor_name || req.body.actorName || '').trim();
  const actorUsername = String(req.body.actor_username || req.body.actorUsername || '').trim();

  // CHỈ ittest được mở lại phiếu đã giao, để truy lỗi. Nhân viên không có quyền này:
  // phiếu đã giao là mốc đối chiếu trách nhiệm, tự mở lại sửa thì log mất ý nghĩa.
  if (actorUsername !== 'ittest') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ tài khoản ittest được mở lại phiếu đã giao. Vui lòng báo ittest nếu cần sửa.'
    });
  }

  if (!Number.isInteger(reviewId)) {
    return res.status(400).json({ success: false, message: 'review_id không hợp lệ' });
  }

  try {
    const [rows] = await queryWithRetry(poolChecker, 'SELECT * FROM icaviet_review_queue WHERE id = ?', [reviewId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu cần mở lại' });
    }

    const row = rows[0];
    if (row.status === REOPENED_STATUS) {
      return res.json({ success: true, alreadyOpen: true, id: row.id, message: 'Phiếu đang ở trạng thái mở lại, có thể sửa ngay.' });
    }

    await queryWithRetry(poolChecker, `
      UPDATE icaviet_review_queue
      SET status = ?,
          reopen_count = reopen_count + 1,
          reopened_at = CURRENT_TIMESTAMP,
          reopened_by_id = ?,
          reopened_by_name = ?
      WHERE id = ?
    `, [REOPENED_STATUS, actorId, actorName, reviewId]);

    await writeLifecycleAuditLog(poolChecker, queryWithRetry, {
      action: 'review_reopen',
      formType: row.form_type,
      formLabel: row.form_label,
      submissionId: row.submission_id,
      customerName: row.customer_name,
      reviewId: row.id,
      actorId,
      actorName,
      actorUsername,
      note: `Mở lại phiếu đã giao cho ${row.reviewer_name || 'tư vấn'} (lần thứ ${(row.reopen_count || 0) + 1}). Trạng thái trước khi mở lại: ${row.status}.`
    });

    res.json({
      success: true,
      id: row.id,
      message: '✅ Đã mở lại phiếu. Bạn sửa xong thì bấm Submit để giao lại cho tư vấn.'
    });
  } catch (error) {
    console.error('Lỗi khi mở lại phiếu:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi mở lại phiếu' });
  }
});

// 2. Lấy danh sách phiếu đang chờ kiểm tra (hỗ trợ ?search= theo MS/Số ID/Email/Tên)
router.get('/api/reviews/pending/:reviewerId', async (req, res) => {
  const reviewerId = parseInt(req.params.reviewerId);
  const { clause, params } = buildSearchClause(req.query.search);
  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE reviewer_id = ? AND status = 'pending' ${clause}
      ORDER BY submitted_at DESC
    `, [reviewerId, ...params]);

    const pendingReviews = rows.map(r => mapReviewRow(r));

    res.json({ success: true, data: pendingReviews });
  } catch (error) {
    console.error('Lỗi khi lấy hàng đợi review:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách hàng đợi' });
  }
});

// 2b. Lấy TẤT CẢ phiếu đã kiểm tra (completed) - không giới hạn reviewer (hỗ trợ ?search=)
router.get('/api/reviews/completed-all', async (req, res) => {
  const { clause, params } = buildSearchClause(req.query.search);
  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE status = 'completed' ${clause}
      ORDER BY submitted_at DESC
      LIMIT 200
    `, params);

    const completedReviews = rows.map(r => mapReviewRow(r, { includeReviewerName: true, includeReviewChanges: true }));

    res.json({ success: true, data: completedReviews });
  } catch (error) {
    console.error('Lỗi khi lấy tất cả phiếu đã kiểm tra:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đã kiểm tra' });
  }
});

// 2c. Lấy danh sách phiếu đã kiểm tra (completed) theo reviewer (hỗ trợ ?search=)
router.get('/api/reviews/completed/:reviewerId', async (req, res) => {
  const reviewerId = parseInt(req.params.reviewerId);
  const { clause, params } = buildSearchClause(req.query.search);
  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE reviewer_id = ? AND status = 'completed' ${clause}
      ORDER BY submitted_at DESC
      LIMIT 100
    `, [reviewerId, ...params]);

    const completedReviews = rows.map(r => mapReviewRow(r, { includeReviewChanges: true }));

    res.json({ success: true, data: completedReviews });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phiếu đã kiểm tra:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đã kiểm tra' });
  }
});

// 2d. Search toàn cục theo MS / Số ID / Email / Tên khách hàng - không giới hạn reviewer hay trạng thái
router.get('/api/reviews/search', async (req, res) => {
  const search = req.query.search || req.query.mshs || req.query.q || '';
  if (!search.trim()) {
    return res.json({ success: true, data: [] });
  }
  const { clause, params } = buildSearchClause(search);
  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT * FROM icaviet_review_queue
      WHERE 1=1 ${clause}
      ORDER BY submitted_at DESC
      LIMIT 200
    `, params);

    const results = rows.map(r => mapReviewRow(r, { includeReviewerName: true, includeReviewChanges: true }));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Lỗi khi search phiếu kiểm tra:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tìm kiếm phiếu kiểm tra' });
  }
});

// 3. Hoàn tất kiểm tra (lưu thay đổi JSON, reviewer có thể sửa MS/Số ID)
router.post('/api/reviews/complete', async (req, res) => {
  const { review_id, changes, mshs, id_number } = req.body;
  try {
    await queryWithRetry(poolChecker, `
      UPDATE icaviet_review_queue
      SET status = 'completed', review_changes = ?, mshs = COALESCE(?, mshs), id_number = COALESCE(?, id_number)
      WHERE id = ?
    `, [JSON.stringify(changes), mshs || null, id_number || null, review_id]);

    res.json({ success: true, message: '✅ Đã hoàn tất và lưu phiếu kiểm tra thành công!' });
  } catch (error) {
    console.error('Lỗi khi hoàn tất kiểm tra:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu kết quả kiểm tra' });
  }
});

// 4. Lấy chữ ký điện tử của 1 phiếu (tách riêng khỏi các API danh sách vì
// ảnh base64 khá nặng, không nên trả kèm khi liệt kê hàng trăm phiếu).
router.get('/api/reviews/:reviewId/signatures', async (req, res) => {
  const reviewId = parseInt(req.params.reviewId);
  if (!Number.isInteger(reviewId)) {
    return res.status(400).json({ success: false, message: 'review_id không hợp lệ' });
  }
  try {
    const [rows] = await queryWithRetry(poolChecker, 'SELECT signatures FROM icaviet_review_queue WHERE id = ?', [reviewId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu' });
    }
    let signatures = {};
    try {
      signatures = rows[0].signatures ? JSON.parse(rows[0].signatures) : {};
    } catch {
      signatures = {};
    }
    res.json({ success: true, data: signatures });
  } catch (error) {
    console.error('Lỗi khi lấy chữ ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy chữ ký' });
  }
});

// 5. Lưu chữ ký điện tử cho 1 phiếu
router.post('/api/reviews/signatures', async (req, res) => {
  const { review_id, signatures } = req.body;
  const reviewId = parseInt(review_id);
  if (!Number.isInteger(reviewId)) {
    return res.status(400).json({ success: false, message: 'review_id không hợp lệ' });
  }
  try {
    const [result] = await queryWithRetry(poolChecker,
      'UPDATE icaviet_review_queue SET signatures = ? WHERE id = ?',
      [JSON.stringify(signatures || {}), reviewId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu' });
    }
    res.json({ success: true, message: '✅ Đã lưu chữ ký!' });
  } catch (error) {
    console.error('Lỗi khi lưu chữ ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu chữ ký' });
  }
});

export default router;
