import express from 'express';
import { poolChecker, queryWithRetry } from '../db.js';
import { parseJsonField } from '../lib/submission-normalizers.js';

const router = express.Router();

function normalizeDraftRow(row) {
  if (!row) return null;
  const draft = parseJsonField(row.draft_data, {});
  return {
    ...draft,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : (draft.updatedAt || null)
  };
}

router.get('/api/drafts/:draftKey', async (req, res) => {
  const draftKey = String(req.params.draftKey || '').trim();
  const userId = parseInt(req.query.user_id || req.query.userId, 10);
  if (!draftKey || !userId) {
    return res.status(400).json({ success: false, message: 'Thieu draft_key hoac user_id' });
  }

  try {
    const [rows] = await queryWithRetry(poolChecker, `
      SELECT draft_data, updated_at
      FROM icaviet_form_drafts
      WHERE draft_key = ? AND user_id = ?
      LIMIT 1
    `, [draftKey, userId]);

    res.json({ success: true, data: normalizeDraftRow(rows[0]) });
  } catch (error) {
    console.error('Loi lay draft:', error);
    res.status(500).json({ success: false, message: 'Loi lay ban nhap' });
  }
});

router.post('/api/drafts', async (req, res) => {
  const draftKey = String(req.body.draft_key || req.body.draftKey || '').trim();
  const userId = parseInt(req.body.user_id || req.body.userId, 10);
  const draftType = String(req.body.draft_type || req.body.draftType || 'fill').trim();
  const formType = String(req.body.form_type || req.body.formType || '').trim();
  const customerId = req.body.customer_id || req.body.customerId || null;
  const reviewId = req.body.review_id || req.body.reviewId || null;
  const draftData = req.body.draft_data || req.body.draftData || {};

  if (!draftKey || !userId) {
    return res.status(400).json({ success: false, message: 'Thieu draft_key hoac user_id' });
  }

  try {
    await queryWithRetry(poolChecker, `
      INSERT INTO icaviet_form_drafts
        (draft_key, user_id, draft_type, form_type, customer_id, review_id, draft_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        draft_type = VALUES(draft_type),
        form_type = VALUES(form_type),
        customer_id = VALUES(customer_id),
        review_id = VALUES(review_id),
        draft_data = VALUES(draft_data),
        updated_at = CURRENT_TIMESTAMP
    `, [
      draftKey,
      userId,
      draftType,
      formType || null,
      customerId ? parseInt(customerId, 10) : null,
      reviewId ? parseInt(reviewId, 10) : null,
      JSON.stringify(draftData || {})
    ]);

    res.json({ success: true, message: 'Da luu ban nhap' });
  } catch (error) {
    console.error('Loi luu draft:', error);
    res.status(500).json({ success: false, message: 'Loi luu ban nhap' });
  }
});

router.delete('/api/drafts/:draftKey', async (req, res) => {
  const draftKey = String(req.params.draftKey || '').trim();
  const userId = parseInt(req.query.user_id || req.query.userId || req.body?.user_id || req.body?.userId, 10);
  if (!draftKey || !userId) {
    return res.status(400).json({ success: false, message: 'Thieu draft_key hoac user_id' });
  }

  try {
    await queryWithRetry(poolChecker, `
      DELETE FROM icaviet_form_drafts
      WHERE draft_key = ? AND user_id = ?
    `, [draftKey, userId]);

    res.json({ success: true, message: 'Da xoa ban nhap' });
  } catch (error) {
    console.error('Loi xoa draft:', error);
    res.status(500).json({ success: false, message: 'Loi xoa ban nhap' });
  }
});

export default router;
