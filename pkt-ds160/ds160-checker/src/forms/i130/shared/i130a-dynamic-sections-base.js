// Các hàm/hằng số dùng chung cho renderI130ADynamicSections ở cả 5 diện
// (spouse/child/parent/sibling/fiance). CHỈ chứa những gì đã xác nhận
// giống hệt byte-for-byte ở cả 5 file gốc VÀ không phụ thuộc vào các
// tham số do từng I130AWordPaper.vue tự truyền vào (normalizeText,
// firstValue, splitAddr, updateCorrectionCountDisplay) — những tham số
// đó vẫn có thể khác nhau giữa các diện nên các hàm phụ thuộc chúng
// (objectValue, normalizePlainText, freeformAddress, isUSStateCode,
// zipOnlyValue, cleanEmployerName, splitFamilyName, v.v.) KHÔNG được
// đưa vào đây — vẫn định nghĩa riêng trong từng file case như cũ.

const COMBINING_DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g')

export const removeAccents = (str) => String(str || '')
  .normalize('NFD')
  .replace(COMBINING_DIACRITICS_RE, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')

export const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''

export const recordHasValue = (record) => {
  if (!record) return false
  if (typeof record !== 'object') return hasValue(record)
  return Object.values(record).some(value => hasValue(value))
}

export const firstRecordList = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      const rows = value.filter(recordHasValue)
      if (rows.length) return rows
    } else if (recordHasValue(value)) {
      return [value]
    }
  }
  return []
}

export const mergeRecordValues = (primary = {}, fallback = {}) => {
  const result = {}
  if (fallback && typeof fallback === 'object') {
    Object.entries(fallback).forEach(([key, value]) => {
      if (hasValue(value)) result[key] = value
    })
  }
  if (primary && typeof primary === 'object') {
    Object.entries(primary).forEach(([key, value]) => {
      if (hasValue(value)) result[key] = value
    })
  }
  return result
}

export const isUSZipCode = (value) => /^\d{5}(?:-\d{4})?$/.test(String(value || '').trim())

export const formatI130DateMMDDYYYY = (value) => {
  if (value === undefined || value === null || value === '') return ''
  const text = String(value).trim()
  if (!text || /^(PRESENT|NAY)$/i.test(text)) return text

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/)
  if (iso) {
    return `${String(iso[2]).padStart(2, '0')}/${String(iso[3]).padStart(2, '0')}/${iso[1]}`
  }

  const full = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (!full) return text

  const first = Number(full[1])
  const second = Number(full[2])
  const year = full[3]
  let month = second
  let day = first

  // Dữ liệu form đang nhập kiểu Việt Nam DD/MM/YYYY. Nếu số thứ hai > 12 thì chắc chắn đang là MM/DD/YYYY nên giữ nguyên.
  if (first <= 12 && second > 12) {
    month = first
    day = second
  }

  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
  }
  return text
}

export const isI130DateField = (fieldKey = '') => /(^|_)(from|to|date|dob|birth|start|end|ngay)/i.test(String(fieldKey || ''))

export const isSectionHeading = (row) => Array.from(row?.children || []).some(td => {
  const colspan = parseInt(td.getAttribute('colspan') || td.colSpan || '0', 10)
  return colspan >= 24 && td.querySelector('strong')
})

export const getDataCell = (row) => Array.from(row?.children || []).find(td => td.classList.contains('data-cell')) || null
export const getNoteCell = (row) => Array.from(row?.children || []).find(td => td.classList.contains('note-cell')) || null

export const isEmploymentSortDateField = (fieldKey = '') => ['from', 'to'].includes(String(fieldKey || ''))
export const isEmploymentSortTriggerField = (fieldKey = '') => isEmploymentSortDateField(fieldKey)

export const COMMON_VN_FAMILIES = new Set([
  'NGUYEN', 'TRAN', 'LE', 'PHAM', 'HUYNH', 'HOANG', 'PHAN', 'VU', 'VO',
  'DANG', 'BUI', 'DO', 'HO', 'NGO', 'DUONG', 'LY', 'TRINH', 'VUONG',
  'MAI', 'QUACH', 'LAM', 'DIEP', 'KIM', 'TA', 'HA', 'TON'
])

export const splitNameParts = (raw, useWesternOrder = false) => {
  const parts = String(raw || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)

  if (parts.length === 0) return { family: '', middle: '', given: '' }
  if (parts.length === 1) return { family: '', middle: '', given: parts[0] }

  let activeWestern = useWesternOrder
  if (!activeWestern && parts.length >= 2) {
    const cleanParts = parts.map(p => removeAccents(p).toUpperCase())
    const firstWord = cleanParts[0]
    const lastWord = cleanParts[cleanParts.length - 1]
    const firstIsFamily = COMMON_VN_FAMILIES.has(firstWord)
    const lastIsFamily = COMMON_VN_FAMILIES.has(lastWord)
    if (lastIsFamily && !firstIsFamily) {
      activeWestern = true
    }
  }

  if (parts.length === 2) {
    return activeWestern
      ? { family: parts[1], middle: '', given: parts[0] }
      : { family: parts[0], middle: '', given: parts[1] }
  }

  return activeWestern
    ? {
        family: parts[parts.length - 1],
        middle: parts.slice(1, -1).join(' '),
        given: parts[0]
      }
    : {
        family: parts[0],
        middle: parts.slice(1, -1).join(' '),
        given: parts[parts.length - 1]
      }
}
