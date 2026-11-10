// Chữ ký điện tử của phiếu kiểm tra.
// Dữ liệu được lưu ở cột `signatures` (LONGTEXT, JSON) của bảng icaviet_review_queue.

// 2 ô ký ở cuối phiếu. Nhãn để trống -> người ký tự gõ nhãn ngay trên phiếu và
// nhãn đó được lưu cùng chữ ký. Muốn cố định nhãn cho mọi phiếu thì điền sẵn
// chuỗi mặc định vào `label` bên dưới (VD: 'NGƯỜI KIỂM TRA').
export const SIGNATURE_SLOTS = [
  { key: 'left', label: '' },
  { key: 'right', label: '' }
]

export const SIGNATURE_LABEL_PLACEHOLDER = 'Nhấn để nhập nhãn (VD: NGƯỜI KIỂM TRA)'

function normalizeSlot(raw, fallbackLabel) {
  const item = raw && typeof raw === 'object' ? raw : {}
  return {
    label: typeof item.label === 'string' ? item.label : fallbackLabel,
    image: typeof item.image === 'string' ? item.image : '',
    signedBy: typeof item.signedBy === 'string' ? item.signedBy : '',
    signedAt: typeof item.signedAt === 'string' ? item.signedAt : ''
  }
}

// Chấp nhận cả object đã parse lẫn chuỗi JSON lấy thẳng từ DB.
export function normalizeSignatures(raw) {
  let source = raw
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source)
    } catch {
      source = null
    }
  }
  if (!source || typeof source !== 'object') source = {}

  const result = {}
  for (const slot of SIGNATURE_SLOTS) {
    result[slot.key] = normalizeSlot(source[slot.key], slot.label)
  }
  return result
}

export function hasAnySignature(signatures) {
  const data = normalizeSignatures(signatures)
  return SIGNATURE_SLOTS.some(slot => !!data[slot.key].image || !!data[slot.key].label.trim())
}

export function formatSignedAt(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN')
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// HTML tĩnh của khối chữ ký, dùng khi xuất PDF (clone không mang theo nội dung
// canvas nên phải dựng lại từ dữ liệu ảnh đã lưu).
export function buildSignatureBlockHtml(signatures) {
  const data = normalizeSignatures(signatures)
  if (!hasAnySignature(data)) return ''

  const cells = SIGNATURE_SLOTS.map(slot => {
    const item = data[slot.key]
    const image = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" style="max-width:100%;max-height:110px;object-fit:contain;margin:0 auto;display:block;" />`
      : ''
    const signedAt = formatSignedAt(item.signedAt)
    const meta = [item.signedBy, signedAt].filter(Boolean).join(' · ')
    return `
      <td style="width:50%;border:1px solid #000;padding:8px 10px;vertical-align:top;text-align:center;">
        <div style="font-weight:700;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(item.label)}</div>
        <div style="min-height:110px;display:flex;align-items:center;justify-content:center;">${image}</div>
        <div style="font-size:13px;color:#374151;margin-top:4px;">${escapeHtml(meta)}</div>
      </td>`
  }).join('')

  return `<table class="pkt-signature-table" style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:10px;"><tbody><tr>${cells}</tr></tbody></table>`
}

// Gắn khối chữ ký vào bản clone dùng để xuất PDF.
export function appendSignatureBlockToClone(clone, signatures) {
  if (!clone) return
  const html = buildSignatureBlockHtml(signatures)
  if (!html) return
  clone.insertAdjacentHTML('beforeend', html)
}
