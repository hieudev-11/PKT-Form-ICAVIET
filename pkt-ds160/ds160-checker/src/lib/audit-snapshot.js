// Snapshot phục vụ ghi log (audit) cho MỌI loại phiếu kiểm tra.
//
// Trước đây mỗi WordPaper tự chép một bản getAuditSnapshot() giống hệt nhau,
// còn DS-260 / I-130A / I-129F thì KHÔNG có bản nào -> App.vue nhận snapshot rỗng,
// log của các phiếu đó mất sạch nhãn ô và "data gốc", chỉ còn lại mã ô kiểu
// "note_12_3". Đó là lý do log không dùng được để đối chiếu lỗi nhân viên.
//
// File này là bản dùng chung duy nhất: mọi phiếu import từ đây.

const MAX_LABEL_LENGTH = 220;
const MAX_SECTION_LOOKBACK = 400;

export function normalizeAuditText(value = '') {
  const div = document.createElement('div');
  div.innerHTML = String(value ?? '');
  // .diff-old là phần gạch ngang "giá trị cũ" do phiếu tự chèn khi hiển thị,
  // không phải nội dung nhân viên gõ nên phải bỏ trước khi so sánh.
  div.querySelectorAll('.diff-old, .pkt-ui-widget, script, style').forEach(node => node.remove());
  return (div.textContent || div.innerText || '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFieldCell(el) {
  return !!(el && el.dataset && el.dataset.cellId);
}

function isNumberOnly(text) {
  return /^\d+[.)]?$/.test(String(text || '').trim());
}

function rowHasFieldCell(row) {
  return !!row?.querySelector?.('[data-cell-id]');
}

// Cột của ô: data_ = cột XỬ LÝ (người điền), note_ = cột TƯ VẤN (người kiểm tra).
// Biết cột thì log mới trả lời được "ai sửa ở đâu" mà không phải mở phiếu.
export function getAuditCellColumn(cell) {
  const id = String(cell?.dataset?.cellId || '');
  if (id.startsWith('note_')) return 'TƯ VẤN';
  if (id.startsWith('data_')) return 'XỬ LÝ';
  if (id.startsWith('header_')) return 'ĐẦU PHIẾU';
  return '';
}

// Nhãn của ô = chữ ở các cột HẠNG MỤC cùng dòng.
// Điểm mấu chốt: BỎ QUA mọi ô có data-cell-id. Ô note_ nằm ngay sau ô data_,
// nên cách cũ (lấy ô liền trước có chữ) trả về chính giá trị nhân viên vừa điền
// thay vì câu hỏi -> log ghi "Nhãn: NGUYEN VAN A" thay vì "Surnames".
export function getAuditRowLabel(cell) {
  if (!cell) return '';
  const row = cell.closest('tr');
  if (!row) return cell.dataset?.cellId || '';

  const cells = Array.from(row.children);
  const idx = cells.indexOf(cell);
  const parts = [];

  for (let i = 0; i < idx; i += 1) {
    const current = cells[i];
    if (isFieldCell(current)) continue;
    if (current?.style?.display === 'none') continue;
    const text = normalizeAuditText(current?.innerHTML || '');
    if (!text || isNumberOnly(text)) continue;
    if (parts.includes(text)) continue;
    parts.push(text);
  }

  const label = parts.join(' — ').slice(0, MAX_LABEL_LENGTH);
  return label || cell.dataset?.cellId || '';
}

// Tên mục (vd "THÔNG TIN CÁ NHÂN"): dòng tiêu đề gần nhất phía trên,
// nhận diện bằng việc dòng đó không chứa ô nhập nào và chỉ có 1-2 ô.
export function getAuditSectionLabel(cell) {
  const row = cell?.closest?.('tr');
  if (!row) return '';

  let cursor = row.previousElementSibling;
  let steps = 0;
  while (cursor && steps < MAX_SECTION_LOOKBACK) {
    steps += 1;
    if (!rowHasFieldCell(cursor)) {
      const visibleCells = Array.from(cursor.children).filter(td => td?.style?.display !== 'none');
      if (visibleCells.length > 0 && visibleCells.length <= 2) {
        const text = normalizeAuditText(cursor.innerHTML || '');
        if (text && !isNumberOnly(text)) return text.slice(0, MAX_LABEL_LENGTH);
      }
    }
    cursor = cursor.previousElementSibling;
  }
  return '';
}

// Số thứ tự hạng mục ("#" ở cột đầu). Ô số này dùng rowspan nên chỉ xuất hiện ở
// dòng đầu của nhóm -> phải dò ngược lên các dòng trước, dừng khi gặp dòng tiêu đề mục.
export function getAuditItemNumber(cell) {
  const row = cell?.closest?.('tr');
  if (!row) return '';

  let cursor = row;
  let steps = 0;
  while (cursor && steps < MAX_SECTION_LOOKBACK) {
    steps += 1;
    const first = Array.from(cursor.children).find(td => td?.style?.display !== 'none');
    if (first && !isFieldCell(first)) {
      const text = normalizeAuditText(first.innerHTML || '');
      if (isNumberOnly(text)) return text.replace(/[.)]$/, '');
    }
    // Chạm dòng tiêu đề mục mà vẫn chưa thấy số -> nhóm này không đánh số.
    if (cursor !== row && !rowHasFieldCell(cursor)) return '';
    cursor = cursor.previousElementSibling;
  }
  return '';
}

// Quét toàn bộ ô có data-cell-id trong phiếu đang mở để lấy "data gốc" của từng ô.
// App.vue dùng base_value này để log phân biệt được 3 loại thao tác:
// thêm mới (gốc trống), sửa (khác gốc), xóa (gốc có - hiện trống).
export function buildAuditSnapshot(root) {
  const snapshot = {};
  if (!root) return snapshot;

  root.querySelectorAll('[data-cell-id]').forEach(cell => {
    const field = cell.dataset.cellId;
    if (!field) return;

    const currentValue = normalizeAuditText(cell.innerHTML || '');
    const explicitBaseValue = normalizeAuditText(
      cell.dataset.submittedValue ||
      cell.dataset.filledValue ||
      cell.dataset.originalHtml ||
      ''
    );

    // Data gốc được tự đổ vào phiếu thường có màu nâu/color-customer.
    // Một số nhóm dòng động (ví dụ I-130A employment/address) chưa kịp set filledValue,
    // nên nếu lấy base rỗng sẽ bị hiểu nhầm là nhân viên đã sửa từ Trống -> data gốc.
    // Với các ô đang là color-customer, coi giá trị đang hiển thị là base data gốc.
    const isCustomerPrefilled = cell.classList.contains('color-customer')
      || cell.dataset.filled === 'true'
      || cell.dataset.source === 'customer'
      || cell.dataset.source === 'submitted';

    const baseValue = explicitBaseValue || (isCustomerPrefilled ? currentValue : '');

    snapshot[field] = {
      label: getAuditRowLabel(cell),
      section: getAuditSectionLabel(cell),
      item: getAuditItemNumber(cell),
      column: getAuditCellColumn(cell),
      base_value: baseValue,
      current_value: currentValue,
      is_customer_prefilled: isCustomerPrefilled
    };
  });

  return snapshot;
}
