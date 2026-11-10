// Helpers dùng chung để đọc/tìm kiếm bảng icaviet_review_queue.
// Tách ra để cả routes/reviews.js và routes/search.js dùng chung 1 logic.

export function displayReviewFormLabel(label) {
  const text = String(label || '').trim();
  if (/^I-130A\s*[—-]\s*Final$/i.test(text)) return 'I-130 — Final';
  return label || '';
}

// Gộp 3 khối map row gần như giống hệt nhau (pending/completed-all/completed
// theo reviewer) thành 1 hàm dùng chung. Giữ nguyên đúng tập field mà mỗi
// route gốc trả về — pending không có reviewerName/reviewChanges,
// completed-all có cả hai, completed/:reviewerId chỉ có reviewChanges.
export function mapReviewRow(r, { includeReviewerName = false, includeReviewChanges = false } = {}) {
  const row = {
    id: r.id,
    customerId: r.submission_id,
    customerName: r.customer_name,
    formType: r.form_type,
    formLabel: displayReviewFormLabel(r.form_label),
    status: r.status,
    fillerId: r.filler_id,
    fillerName: r.filler_name,
    reviewerId: r.reviewer_id,
    fillerChanges: r.filler_changes ? JSON.parse(r.filler_changes) : {},
    nblSubmissionId: r.nbl_submission_id,
    ndblSubmissionId: r.ndbl_submission_id,
    mshs: r.mshs || '',
    idNumber: r.id_number || '',
    email: r.email || '',
    submittedAt: new Date(r.submitted_at).toLocaleString('vi-VN')
  };
  if (includeReviewerName) row.reviewerName = r.reviewer_name;
  if (includeReviewChanges) row.reviewChanges = r.review_changes ? JSON.parse(r.review_changes) : {};
  return row;
}

// Trạng thái phiếu đã được người xử lý mở lại để sửa: phiếu rời hàng đợi của tư vấn
// (chỉ query status = 'pending') và quay về tay người xử lý, giữ nguyên filler_changes.
export const REOPENED_STATUS = 'reopened';

// Ghi 1 dòng audit log cho các thao tác vòng đời phiếu (mở lại / giao lại).
// Các thao tác này không sửa ô nào nên changed_fields rỗng, nhưng vẫn phải vào log:
// đây chính là dấu vết trả lời "ai mở lại phiếu đã giao, lúc nào, lần thứ mấy".
export async function writeLifecycleAuditLog(pool, runQuery, payload = {}) {
  const changedFields = { fields: [], values: {}, note: payload.note || '' };
  try {
    await runQuery(pool, `
      INSERT INTO icaviet_audit_logs
        (action, form_type, form_label, submission_id, customer_name, review_id, actor_id, actor_name, actor_username, changed_count, changed_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      payload.action,
      payload.formType || null,
      payload.formLabel || null,
      payload.submissionId || null,
      payload.customerName || null,
      payload.reviewId || null,
      payload.actorId || null,
      payload.actorName || '',
      payload.actorUsername || '',
      JSON.stringify(changedFields)
    ]);
  } catch (error) {
    // Log hỏng không được làm hỏng thao tác nghiệp vụ của người dùng.
    console.error('Lỗi ghi lifecycle audit log:', error);
  }
}

// Điều kiện WHERE dùng chung để search theo MS / Số ID / Email / Tên khách hàng
export function buildSearchClause(search) {
  if (!search) return { clause: '', params: [] };
  const like = `%${search}%`;
  return {
    clause: ' AND (mshs LIKE ? OR id_number LIKE ? OR email LIKE ? OR customer_name LIKE ?)',
    params: [like, like, like, like]
  };
}
