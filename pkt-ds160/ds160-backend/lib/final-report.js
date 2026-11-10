// Bản tổng hợp cuối (final) của 1 phiếu kiểm tra.
//
// Mỗi dòng = 1 ô trên phiếu, trả lời đủ 4 câu:
//   - DATA GỐC: khách hàng khai ban đầu là gì
//   - NGƯỜI XỬ LÝ ĐIỀN: người xử lý chốt lại giá trị nào (cột XỬ LÝ, cell data_*)
//   - TƯ VẤN SỬA: người kiểm tra chốt lại giá trị nào (cột TƯ VẤN, cell note_*)
//   - GIÁ TRỊ CUỐI: giá trị thật sự có hiệu lực sau cùng
// kèm lịch sử từng lần save của chính ô đó.
//
// Nguồn số liệu chốt là filler_changes / review_changes trong icaviet_review_queue
// (đúng cái đã submit), còn audit log chỉ dùng để lấy nhãn ô, data gốc và lịch sử.
// Làm ngược lại (cộng dồn log) sẽ lệch nếu có log nào rớt.

const CLEARED_MARKER = '__CLEARED__';

export function stripHtmlToText(value) {
  if (value === CLEARED_MARKER) return '';
  return String(value ?? '')
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ô data_12 (cột XỬ LÝ) và note_12 (cột TƯ VẤN) là hai cột của CÙNG một dòng phiếu,
// nên bản tổng hợp gộp chúng về một dòng thay vì liệt kê hai lần.
export function pairKeyOf(field) {
  return String(field || '').replace(/^note_/, 'data_');
}

export function isInternalField(field) {
  return String(field || '').startsWith('__');
}

export function resolveChangeType(baseValue, oldValue, newValue) {
  if (!newValue && oldValue) return 'delete';
  if (!oldValue && newValue) return 'add';
  if (newValue && newValue === baseValue && oldValue !== baseValue) return 'restore';
  if (newValue === oldValue) return 'none';
  return 'edit';
}

function columnOf(field) {
  const id = String(field || '');
  if (id.startsWith('note_')) return 'TƯ VẤN';
  if (id.startsWith('data_')) return 'XỬ LÝ';
  if (id.startsWith('header_')) return 'ĐẦU PHIẾU';
  return '';
}

function emptyRow(pairKey) {
  return {
    key: pairKey,
    fillerField: '',
    reviewerField: '',
    label: '',
    section: '',
    item: '',
    baseValue: '',
    fillerValue: '',
    reviewerValue: '',
    finalValue: '',
    fillerTouched: false,
    reviewerTouched: false,
    changeType: 'none',
    touchCount: 0,
    actors: [],
    history: []
  };
}

function ensureRow(rows, pairKey) {
  if (!rows.has(pairKey)) rows.set(pairKey, emptyRow(pairKey));
  return rows.get(pairKey);
}

// Nhãn/mục lấy từ log nào ghi rõ nhất. Log cũ (trước khi phiếu gửi kèm nhãn) để trống,
// nên không được ghi đè nhãn tốt bằng nhãn rỗng.
function applyFieldMeta(row, meta = {}) {
  if (!row.label && meta.label && meta.label !== meta.field) row.label = meta.label;
  if (!row.section && meta.section) row.section = meta.section;
  if (!row.item && meta.item) row.item = String(meta.item);
}

/**
 * @param {object} input
 * @param {object} input.review      - dòng icaviet_review_queue (đã parse filler_changes/review_changes)
 * @param {Array}  input.logs        - các dòng icaviet_audit_logs liên quan, cũ -> mới
 */
export function buildFinalReport({ review = {}, logs = [] } = {}) {
  const rows = new Map();
  const fillerChanges = review.fillerChanges || {};
  const reviewChanges = review.reviewChanges || {};

  // 1) Lịch sử + nhãn + data gốc, theo thứ tự thời gian tăng dần.
  for (const log of logs) {
    const changed = log.changedFields || {};
    const values = changed.values || {};
    const fields = Array.isArray(changed.fields) ? changed.fields : Object.keys(values);

    for (const field of fields) {
      if (isInternalField(field)) continue;
      const detail = values[field] && typeof values[field] === 'object' ? values[field] : {};
      const row = ensureRow(rows, pairKeyOf(field));

      applyFieldMeta(row, { ...detail, field });

      const oldValue = stripHtmlToText(detail.old_value ?? detail.oldValue ?? '');
      const newValue = stripHtmlToText(detail.new_value ?? detail.newValue ?? '');
      const baseValue = stripHtmlToText(detail.base_value ?? detail.baseValue ?? '');

      // Data gốc chỉ lấy từ ô cột XỬ LÝ: base của ô TƯ VẤN là giá trị người xử lý
      // để lại lúc giao phiếu, không phải data khách hàng khai.
      if (!row.baseValue && baseValue && !String(field).startsWith('note_')) {
        row.baseValue = baseValue;
      }

      row.touchCount += 1;
      const actorName = log.actorName || log.actorUsername || '';
      if (actorName && !row.actors.includes(actorName)) row.actors.push(actorName);

      row.history.push({
        at: log.createdAt || '',
        atRaw: log.createdAtRaw || null,
        actorName,
        action: log.action || '',
        column: columnOf(field),
        oldValue,
        newValue,
        changeType: detail.change_type || detail.changeType || resolveChangeType(baseValue, oldValue, newValue)
      });
    }
  }

  // 2) Giá trị CHỐT của người xử lý (cột XỬ LÝ).
  for (const [field, raw] of Object.entries(fillerChanges)) {
    if (isInternalField(field)) continue;
    const row = ensureRow(rows, pairKeyOf(field));
    applyFieldMeta(row, { field });
    row.fillerField = field;
    row.fillerValue = stripHtmlToText(raw);
    row.fillerTouched = true;
  }

  // 3) Giá trị CHỐT của tư vấn (cột TƯ VẤN).
  for (const [field, raw] of Object.entries(reviewChanges)) {
    if (isInternalField(field)) continue;
    const row = ensureRow(rows, pairKeyOf(field));
    applyFieldMeta(row, { field });
    row.reviewerField = field;
    row.reviewerValue = stripHtmlToText(raw);
    row.reviewerTouched = true;
  }

  const result = [];
  for (const row of rows.values()) {
    if (!row.fillerField) row.fillerField = row.key;
    if (!row.reviewerField) row.reviewerField = row.key.replace(/^data_/, 'note_');
    if (!row.label) row.label = row.key;

    // Tư vấn sửa thì giá trị tư vấn có hiệu lực; không thì lấy của người xử lý;
    // không ai đụng thì vẫn là data gốc.
    if (row.reviewerTouched) row.finalValue = row.reviewerValue;
    else if (row.fillerTouched) row.finalValue = row.fillerValue;
    else row.finalValue = row.baseValue;

    row.changeType = resolveChangeType(row.baseValue, row.baseValue, row.finalValue);
    row.history.sort((a, b) => String(a.atRaw || a.at).localeCompare(String(b.atRaw || b.at)));
    result.push(row);
  }

  // Sắp theo mục -> số hạng mục -> mã ô, để bản final đọc theo đúng thứ tự trên phiếu.
  result.sort((a, b) => {
    const itemA = parseInt(a.item, 10);
    const itemB = parseInt(b.item, 10);
    if (Number.isFinite(itemA) && Number.isFinite(itemB) && itemA !== itemB) return itemA - itemB;
    return a.key.localeCompare(b.key, 'vi', { numeric: true });
  });

  const summary = {
    totalRows: result.length,
    fillerCells: result.filter(r => r.fillerTouched).length,
    reviewerCells: result.filter(r => r.reviewerTouched).length,
    byType: result.reduce((acc, row) => {
      acc[row.changeType] = (acc[row.changeType] || 0) + 1;
      return acc;
    }, {}),
    actors: [...new Set(result.flatMap(r => r.actors))],
    totalLogs: logs.length
  };

  return { rows: result, summary };
}
