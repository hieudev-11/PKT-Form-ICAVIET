import express from 'express';
import { poolChecker, queryWithRetry } from '../db.js';

const router = express.Router();

const MAX_COMMENT_LENGTH = 2000;

// Quyền comment luôn được kiểm tra Ở SERVER theo cột can_comment trong DB.
// Client chỉ gửi user_id — không tin bất kỳ cờ quyền nào client tự khai.
async function getRequester(userId) {
  const id = parseInt(userId, 10);
  if (!id) return null;

  const [rows] = await queryWithRetry(
    poolChecker,
    'SELECT id, username, name, can_comment FROM icaviet_users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

function canComment(user) {
  return !!user && (Number(user.can_comment) === 1 || user.username === 'ittest');
}

function normalizeComment(row, requester) {
  return {
    id: row.id,
    reviewId: row.review_id,
    cellId: row.cell_id,
    rowLabel: row.row_label || '',
    userId: row.user_id,
    userName: row.user_name || '',
    content: row.content,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    // ittest được dọn comment rác; ngoài ra chỉ chính chủ mới xóa/sửa được comment của mình.
    canDelete: !!requester && (Number(row.user_id) === Number(requester.id) || requester.username === 'ittest')
  };
}

// Danh sách comment của 1 phiếu. Ai mở được phiếu thì đọc được comment;
// trường canComment trong response cho biết người đang xem có được viết hay không.
router.get('/api/reviews/:reviewId/comments', async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  if (!reviewId) {
    return res.status(400).json({ success: false, message: 'Thiếu review_id' });
  }

  try {
    const requester = await getRequester(req.query.user_id || req.query.userId);

    const [rows] = await queryWithRetry(
      poolChecker,
      `SELECT id, review_id, cell_id, row_label, user_id, user_name, content, created_at, updated_at
       FROM icaviet_review_comments
       WHERE review_id = ?
       ORDER BY created_at ASC, id ASC`,
      [reviewId]
    );

    res.json({
      success: true,
      canComment: canComment(requester),
      data: rows.map(row => normalizeComment(row, requester))
    });
  } catch (error) {
    console.error('Lỗi lấy comment:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy comment' });
  }
});

router.post('/api/reviews/:reviewId/comments', async (req, res) => {
  const reviewId = parseInt(req.params.reviewId, 10);
  const cellId = String(req.body.cell_id || req.body.cellId || '').trim();
  const rowLabel = String(req.body.row_label || req.body.rowLabel || '').trim().slice(0, 500);
  const content = String(req.body.content || '').trim();

  if (!reviewId) {
    return res.status(400).json({ success: false, message: 'Thiếu review_id' });
  }
  if (!cellId) {
    return res.status(400).json({ success: false, message: 'Thiếu cell_id' });
  }
  if (!content) {
    return res.status(400).json({ success: false, message: 'Nội dung comment đang trống' });
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Comment tối đa ${MAX_COMMENT_LENGTH} ký tự`
    });
  }

  try {
    const requester = await getRequester(req.body.user_id || req.body.userId);
    if (!requester) {
      return res.status(401).json({ success: false, message: 'Không xác định được người dùng' });
    }
    if (!canComment(requester)) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn chưa được cấp quyền comment'
      });
    }

    const [result] = await queryWithRetry(
      poolChecker,
      `INSERT INTO icaviet_review_comments
         (review_id, cell_id, row_label, user_id, user_name, content)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [reviewId, cellId, rowLabel || null, requester.id, requester.name || requester.username, content]
    );

    const [rows] = await queryWithRetry(
      poolChecker,
      `SELECT id, review_id, cell_id, row_label, user_id, user_name, content, created_at, updated_at
       FROM icaviet_review_comments WHERE id = ?`,
      [result.insertId]
    );

    res.json({ success: true, data: normalizeComment(rows[0], requester) });
  } catch (error) {
    console.error('Lỗi thêm comment:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm comment' });
  }
});

router.delete('/api/comments/:commentId', async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (!commentId) {
    return res.status(400).json({ success: false, message: 'Thiếu comment_id' });
  }

  try {
    const requester = await getRequester(req.query.user_id || req.query.userId || req.body?.user_id);
    if (!requester) {
      return res.status(401).json({ success: false, message: 'Không xác định được người dùng' });
    }

    const [rows] = await queryWithRetry(
      poolChecker,
      'SELECT id, user_id FROM icaviet_review_comments WHERE id = ? LIMIT 1',
      [commentId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Comment không tồn tại' });
    }

    const isOwner = Number(rows[0].user_id) === Number(requester.id);
    if (!isOwner && requester.username !== 'ittest') {
      return res.status(403).json({ success: false, message: 'Chỉ người viết mới xóa được comment này' });
    }

    await queryWithRetry(poolChecker, 'DELETE FROM icaviet_review_comments WHERE id = ?', [commentId]);
    res.json({ success: true, message: 'Đã xóa comment' });
  } catch (error) {
    console.error('Lỗi xóa comment:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa comment' });
  }
});

export default router;
