// Các hàm/hằng số dùng chung cho I130AWordPaper.vue ở cả 5 diện
// (spouse/child/parent/sibling/fiance). CHỈ chứa những gì đã xác nhận
// giống hệt byte-for-byte ở cả 5 file gốc VÀ không phụ thuộc vào
// props/paperRef/rawHtml/changes/emit (state riêng của từng component
// instance) hay logic đặc thù theo diện (autoFillData và các hàm liên
// quan vẫn định nghĩa riêng trong từng file case).

export const SPOUSE_ADDRESS_OPTIONS = [
  'SAME AS HOME ADDRESS',
  'SAME AS MAILING ADDRESS',
  'SAME AS U.S. CONTACT ADDRESS',
  'DO NOT KNOW',
  'OTHER'
]

export const K1_SELECT_ONE = 'SELECT ONE'

export const K1_VISA_CLASS = 'FIANCÉ (E) OR SPOUSE OF A U.S. CITIZEN (K)'

export const K1_SPECIFY_FIANCE = 'FIANCÉ (E) OF A U.S. CITIZEN (K1)'

export const K1_SPECIFY_OPTIONS = [
  K1_SELECT_ONE,
  K1_SPECIFY_FIANCE,
  'CHILD OF A K1 (K2)'
]

export const K1_DEFAULT_SPECIFY = K1_SELECT_ONE

export const K1_PAYER_OPTIONS = [
  K1_SELECT_ONE,
  'SELF',
  'U.S. PETITIONER',
  'OTHER PERSON',
  'PRESENT EMPLOYER',
  'EMPLOYER IN THE U.S.',
  'OTHER COMPANY/ORGANIZATION'
]

export const K1_DEFAULT_PAYER = K1_SELECT_ONE

export const CHILD_RELATIONSHIP_QUESTION_LABEL = 'Which best describes your relationship?'

export const CHILD_RELATIONSHIP_OPTIONS = [
  '',
  "1. Child was born to parents who were married to each other at the time of the child's birth",
  '2. Stepchild or Stepparent',
  "3. Child was born to parents who were not married to each other at the time of the child's birth",
  '4. Child was adopted (not an orphan or Hague Convention adoptee)'
]

export const PARENT_RELATIONSHIP_OPTIONS = [
  'stepchild',
  'stepparent'
]

export const SIBLING_RELATIONSHIP_OPTIONS = [
  'Brother',
  'Sister'
]

export const SIBLING_ADOPTION_QUESTION_LABEL = 'Are you related by adoption?'

export function normalizeI130ACaseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function safeIsAffirmativeValue(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return false
  const text = normalizeI130ACaseText(raw)
  return ['yes', 'y', 'true', '1', 'co', 'có'].includes(text) || text.includes('yes')
}

export function getI130ACaseText(data = {}) {
  const raw = [
    data.petitionRelationship,
    data.petitionRelationshipLabel,
    data.loaiHoSoBaoLanh,
    data.dienBaoLanh,
    data.loaiHoSo,
    data.relationshipToPetitioner,
    data.relationship,
    data.caseType,
    data.petitionType,
    data.formCategory,
    data.category,
    data.form_slug,
    data.formSlug,
    data.formType,
    data.type
  ].join(' ')
  return normalizeI130ACaseText(raw)
}

export function isChildPetitionCase(data = {}) {
  const text = getI130ACaseText(data)
  return text.includes('con gai') || text.includes('con cai') || text.includes('child') || text.includes('son') || text.includes('daughter')
}

export function isParentPetitionCase(data = {}) {
  const text = getI130ACaseText(data)
  return text.includes('cha me') || text.includes('parent') || text.includes('father') || text.includes('mother')
}

export function isSiblingPetitionCase(data = {}) {
  const text = getI130ACaseText(data)
  return text.includes('anh chi em') || text.includes('sibling') || text.includes('brother') || text.includes('sister')
}

export function getChildRelationshipDescriptionValue(data = {}) {
  return String(
    data.bestDescribesRelationship ??
    data.whichBestDescribesRelationship ??
    data.childRelationshipDescription ??
    data.childRelationshipType ??
    data.childBestRelationship ??
    data.relationshipDescriptionToBeneficiary ??
    data.childRelationshipToPetitionerDetail ??
    ''
  ).trim()
}

export function getParentRelationshipDetailValue(data = {}) {
  return String(
    data.stepchildOrStepparent ??
    data.parentRelationshipDetail ??
    data.parentRelationshipType ??
    data.whichBestDescribesRelationshipParent ??
    data.bestDescribesParentRelationship ??
    data.whichBestDescribesRelationship ??
    data.bestDescribesRelationship ??
    ''
  ).trim()
}

export function getSiblingRelationshipValue(data = {}) {
  return String(
    data.siblingRelationshipType ??
    data.brotherOrSister ??
    data.whichSiblingRelationship ??
    data.siblingType ??
    data.relationshipToBeneficiarySibling ??
    data.relationshipDetail ??
    ''
  ).trim()
}

export function getSiblingAdoptionValue(data = {}) {
  return String(
    data.siblingRelatedByAdoption ??
    data.relatedByAdoption ??
    data.areYouRelatedByAdoption ??
    data.siblingAdoption ??
    data.adoptionRelationship ??
    ''
  ).trim()
}

export function optionTextMatches(value, option) {
  const a = normalizeI130ACaseText(value).replace(/^\d+\s+/, '')
  const b = normalizeI130ACaseText(option).replace(/^\d+\s+/, '')
  return a && (a === b || b.includes(a) || a.includes(b))
}

export function normalizeChildRelationshipOption(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const numbered = raw.match(/^\s*([1-4])\b/)
  if (numbered) {
    const option = CHILD_RELATIONSHIP_OPTIONS.find(item => item.startsWith(`${numbered[1]}.`))
    if (option) return option
  }
  return CHILD_RELATIONSHIP_OPTIONS.find(option => option && optionTextMatches(raw, option)) || raw
}

export function normalizeParentRelationshipOptions(value) {
  const raw = String(value || '').toLowerCase()
  const selected = []
  if (raw.includes('stepchild') || raw.includes('step child')) selected.push('stepchild')
  if (raw.includes('stepparent') || raw.includes('step parent')) selected.push('stepparent')
  return selected
}

export function renderParentRelationshipValue(selectedOptions) {
  return selectedOptions.join(', ')
}

export function normalizeSiblingRelationshipOptions(value) {
  const raw = normalizeI130ACaseText(value)
  const selected = []
  if (raw.includes('brother') || raw.includes('anh') || raw.includes('male sibling')) selected.push('Brother')
  if (raw.includes('sister') || raw.includes('chi') || raw.includes('em gai') || raw.includes('female sibling')) selected.push('Sister')
  return selected
}

export function renderSiblingRelationshipValue(selectedOptions) {
  return selectedOptions.join(', ')
}

export function getCellPrintableValue(cell) {
  if (!cell) return ''
  if (cell.classList.contains('yesno-cell')) {
    return cell.querySelector('.yesno-check:checked')?.dataset.val || ''
  }
  if (cell.classList.contains('spouse-address-option-cell')) {
    return getSpouseAddressOptionValue(cell)
  }
  // Nút comment (và mọi widget app chèn vào ô) không phải nội dung phiếu.
  // Nếu không bóc ra, một ô TƯ VẤN trống nhưng có nút sẽ bị tính là 1 lỗi tư vấn.
  // Phải bóc SAU các nhánh yes/no: cloneNode() không sao chép trạng thái checked
  // dạng property của checkbox, clone sớm sẽ đọc nhầm ô đã tick thành chưa tick.
  if (cell.querySelector('.pkt-ui-widget')) {
    const clone = cell.cloneNode(true)
    clone.querySelectorAll('.pkt-ui-widget').forEach(node => node.remove())
    return clone.innerHTML.trim()
  }
  return cell.innerHTML.trim()
}

export function applyPrintableValue(cell, value, sourceClass = '') {
  if (!cell || !value || value === '<br>') return
  if (cell.classList.contains('yesno-cell')) {
    cell.querySelectorAll('.yesno-check').forEach(chk => {
      const checked = chk.dataset.val === value
      chk.checked = checked
      if (checked) chk.setAttribute('checked', 'checked')
      else chk.removeAttribute('checked')
    })
  } else if (cell.classList.contains('spouse-address-option-cell')) {
    fillSpouseAddressOptionCell(cell, value, sourceClass)
  } else {
    cell.innerHTML = value
  }
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  if (sourceClass) cell.classList.add(sourceClass)
}

export function restoreProcessLayoutForPdf(root) {
  root.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('.note-cell').forEach(noteCell => {
      const noteCellId = noteCell.dataset.cellId || ''
      const dataCellId = noteCellId.replace(/^note_/, 'data_')
      const dataCell = dataCellId ? row.querySelector(`[data-cell-id="${dataCellId}"]`) : null
      const noteValue = getCellPrintableValue(noteCell)
      if (noteValue) applyPrintableValue(dataCell, noteValue, 'color-reviewer')
      noteCell.remove()
    })
  })

  root.querySelectorAll('colgroup').forEach(colgroup => {
    const cols = Array.from(colgroup.querySelectorAll('col'))
    if (cols.length <= 26) return

    for (let i = 13; i <= 23; i += 1) {
      const width = parseFloat(cols[i]?.style.width || '')
      if (!Number.isNaN(width) && width > 0) {
        cols[i].style.width = `${width * 2}%`
      }
    }

    const noteCols = Array.from(colgroup.querySelectorAll('col')).slice(24, 35)
    noteCols.forEach(col => col.remove())
  })
}

export function safePdfName(value) {
  return String(value || 'DS160')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'DS160'
}

export function getPdfRowBreakpoints(root) {
  if (!root) return []

  const rootRect = root.getBoundingClientRect()
  const rootTop = rootRect.top
  const maxHeight = Math.ceil(root.scrollHeight || rootRect.height || 0)
  const points = Array.from(root.querySelectorAll('tr'))
    .map(row => {
      const rect = row.getBoundingClientRect()
      if (!rect.height) return 0
      return Math.round(rect.bottom - rootTop)
    })
    .filter(y => y > 0 && y < maxHeight)
    .sort((a, b) => a - b)

  return [...new Set(points)]
}

export function setColGroupWidth(cols, start, end, totalWidth) {
  const targetCols = Array.from(cols).slice(start, end + 1)
  if (!targetCols.length) return

  const currentWidths = targetCols.map(col => {
    const width = parseFloat(col.style.width || '')
    return Number.isFinite(width) && width > 0 ? width : 0
  })
  const currentTotal = currentWidths.reduce((sum, width) => sum + width, 0)
  const fallbackWidth = totalWidth / targetCols.length

  targetCols.forEach((col, index) => {
    const width = currentTotal > 0 ? (currentWidths[index] / currentTotal) * totalWidth : fallbackWidth
    col.style.width = `${width.toFixed(4)}%`
    col.style.display = ''
  })
}

export function normalizeChecklistColgroup(colgroup, hasConsultColumn) {
  if (!colgroup) return
  const cols = colgroup.querySelectorAll('col')

  // Tổng bố cục: cột # giữ 3%, phần nội dung còn lại chia: HẠNG MỤC 47%, XỬ LÝ 28%, TƯ VẤN 22%
  // Ở chế độ create chưa có TƯ VẤN nên XỬ LÝ nhận phần còn lại (50%).
  setColGroupWidth(cols, 0, 1, 3)
  setColGroupWidth(cols, 2, 12, hasConsultColumn ? 47 : 47)
  setColGroupWidth(cols, 13, 23, hasConsultColumn ? 28 : 50)

  if (hasConsultColumn) {
    setColGroupWidth(cols, 24, 34, 22)
    Array.from(cols).slice(35).forEach(col => {
      col.style.display = 'none'
      col.style.width = '0%'
    })
  } else {
    Array.from(cols).slice(24).forEach(col => {
      col.style.display = 'none'
      col.style.width = '0%'
    })
  }
}

export function normalizeText(str) {
  if (typeof str !== 'string') return str
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toUpperCase()
            .replace(/VIET NAM/g, 'VIETNAM')
}

export function shouldRenderLowercaseEmail(label = '', value = '') {
  const labelText = String(label || '').toLowerCase()
  const valueText = String(value ?? '')
  return labelText.includes('email') ||
         /[^\s@]+@[^\s@]+\.[^\s@]+/i.test(valueText) ||
         valueText.toLowerCase().includes('gmail')
}

export function normalizeEmailDisplayValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeK1SpecifyValue(value) {
  const raw = stripHtml(value).replace(/\s+/g, ' ').trim()
  const normalized = normalizeText(raw)

  if (!raw || normalized === 'SELECT ONE' || normalized === '-- SELECT ONE --') {
    return K1_SELECT_ONE
  }

  if (normalized.includes('CHILD') || normalized.includes('K2')) {
    return 'CHILD OF A K1 (K2)'
  }

  if (normalized.includes('FIANCE') || normalized.includes('FIANCEE') || normalized.includes('K1')) {
    return K1_SPECIFY_FIANCE
  }

  return K1_SELECT_ONE
}

export function getK1SpecifySelectedValue(cell) {
  if (!cell) return K1_SELECT_ONE
  const selectValue = cell.querySelector('select')?.value
  if (selectValue) return normalizeK1SpecifyValue(selectValue)
  return normalizeK1SpecifyValue(cell.innerHTML || cell.textContent || '')
}

export function applyK1SpecifyColor(cell, value, sourceClass) {
  if (!cell) return
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

  const selected = normalizeK1SpecifyValue(value)
  if (selected === K1_SELECT_ONE) {
    delete cell.dataset.filled
    delete cell.dataset.filledValue
    return
  }

  cell.dataset.filled = 'true'
  cell.dataset.filledValue = selected
  if (sourceClass) cell.classList.add(sourceClass)
}

export function normalizeK1PayerValue(value) {
  const raw = stripHtml(value).replace(/&nbsp;/gi, ' ').replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ').trim()
  const normalized = normalizeText(raw)

  if (!raw || normalized === 'SELECT ONE' || normalized === 'SELECTONE') {
    return K1_SELECT_ONE
  }

  if (normalized === 'SELF' || normalized.includes('BAN THAN') || normalized.includes('CA NHAN') || normalized.includes('TU TUC') || normalized.includes('APPLICANT')) {
    return 'SELF'
  }

  if (normalized.includes('PETITIONER')) return 'U.S. PETITIONER'
  if (normalized.includes('PRESENT EMPLOYER')) return 'PRESENT EMPLOYER'
  if (normalized.includes('EMPLOYER IN THE U.S') || normalized.includes('EMPLOYER IN THE US')) return 'EMPLOYER IN THE U.S.'
  if (normalized.includes('COMPANY') || normalized.includes('ORGANIZATION') || normalized.includes('CONG TY')) return 'OTHER COMPANY/ORGANIZATION'
  if (normalized.includes('OTHER PERSON') || normalized.includes('NGUOI KHAC') || normalized.includes('KHAC')) return 'OTHER PERSON'

  return K1_SELECT_ONE
}

export function getK1PayerDefaultValue(data = {}) {
  const values = [
    data.tripSponsor,
    data.personEntityPayingForTrip,
    data.payerType,
    data.tripPayer
  ]
  const raw = values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''
  const normalized = normalizeK1PayerValue(raw)
  return normalized === 'SELF' ? 'SELF' : K1_DEFAULT_PAYER
}

export function getK1PayerSelectedValue(cell) {
  if (!cell) return K1_DEFAULT_PAYER
  const selectValue = cell.querySelector('select')?.value
  if (selectValue) return normalizeK1PayerValue(selectValue)
  return normalizeK1PayerValue(cell.innerHTML || cell.textContent || '')
}

export function applyK1PayerColor(cell, value, sourceClass) {
  if (!cell) return
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

  const selected = normalizeK1PayerValue(value)
  if (selected === K1_SELECT_ONE) {
    delete cell.dataset.filled
    delete cell.dataset.filledValue
    return
  }

  cell.dataset.filled = 'true'
  cell.dataset.filledValue = selected
  if (sourceClass) cell.classList.add(sourceClass)
}

export function isCompanionTravelQuestion(rowText) {
  return (rowText || '').replace(/\s+/g, ' ').includes('Are there other person traveling with you')
}

export function isCompanionGroupQuestion(rowText) {
  return (rowText || '').replace(/\s+/g, ' ').includes('Are you travelling as part of a group')
}

export function getCheckedYesNoValue(cell) {
  const checked = cell?.querySelector('.yesno-check:checked')
  return checked?.dataset.val || ''
}

export function getRowYesNoValue(row) {
  if (!row) return ''
  const cells = Array.from(row.querySelectorAll('.yesno-cell'))
  const reviewCell = cells.find(cell => cell.classList.contains('note-cell') && getCheckedYesNoValue(cell))
  const dataCell = cells.find(cell => cell.classList.contains('data-cell') && getCheckedYesNoValue(cell))
  return getCheckedYesNoValue(reviewCell) || getCheckedYesNoValue(dataCell)
}

export function syncCompanionDetailRows(table) {
  if (!table) return
  const rows = Array.from(table.querySelectorAll('tr'))
  const travelRow = rows.find(row => isCompanionTravelQuestion(row.textContent))
  const groupRow = rows.find(row => isCompanionGroupQuestion(row.textContent))
  const hasCompanion = getRowYesNoValue(travelRow) === 'YES'
  const isGroup = getRowYesNoValue(groupRow) === 'YES'

  table.querySelectorAll('tr.companion-detail-row').forEach(row => {
    const isGroupDetail = row.textContent.includes('Group Name')
    row.style.display = hasCompanion && (isGroup ? isGroupDetail : !isGroupDetail) ? '' : 'none'
  })
}

export function normalizeAddressComparePart(value, field = '') {
  const compact = normalizeText(stripHtml(value))
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^A-Z0-9]+/g, '')

  if (field === 'country') {
    if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA', 'HOAKY', 'MY'].includes(compact)) return 'USA'
    if (['VN', 'VIETNAM'].includes(compact)) return 'VIETNAM'
  }

  return compact
}

export function getI130ARowLabel(row) {
  return Array.from(row?.children || [])
    .filter(cell => !cell.classList.contains('data-cell') && !cell.classList.contains('note-cell'))
    .map(cell => cell.textContent || '')
    .join(' ')
}

export function getI130ASectionValue(rows, ...labels) {
  const targets = labels.map(label => normalizeI130ACaseText(label)).filter(Boolean)
  const row = rows.find(item => {
    const label = normalizeI130ACaseText(getI130ARowLabel(item))
    return targets.some(target => label.includes(target))
  })
  const dataCell = Array.from(row?.children || []).find(cell => cell.classList.contains('data-cell'))
  return stripHtml(getCellPrintableValue(dataCell))
}

export function isLawfulPermanentResidentStatus(value) {
  const text = normalizeI130ACaseText(value)
  if (!text) return false
  return text.includes('lawful permanent resident') ||
         text.includes('permanent resident') ||
         text.includes('thuong tru') ||
         text.includes('lpr') ||
         text.includes('green card') ||
         text.includes('the xanh')
}

export function addressesMatchForLiveAtMailingAddress(mailing = {}, current = {}) {
  const requiredFields = ['line1', 'city', 'state', 'zip']
  const requiredMatch = requiredFields.every(field => {
    const left = normalizeAddressComparePart(mailing[field], field)
    const right = normalizeAddressComparePart(current[field], field)
    return left && right && left === right
  })
  if (!requiredMatch) return false

  const countryLeft = normalizeAddressComparePart(mailing.country, 'country')
  const countryRight = normalizeAddressComparePart(current.country, 'country')
  if (countryLeft && countryRight && countryLeft !== countryRight) return false

  const line2Left = normalizeAddressComparePart(mailing.line2, 'line2')
  const line2Right = normalizeAddressComparePart(current.line2, 'line2')
  if ((line2Left || line2Right) && line2Left !== line2Right) return false

  return true
}

export function shouldLiveAtCurrentMailingAddressFromRenderedRows() {
  const mailingRows = getI130ASectionRows('DIA CHI NHAN THU')
  const oldAddressRows = getI130ASectionRows('DIA CHI CU TRONG 5 NAM QUA')
  if (!mailingRows.length || !oldAddressRows.length) return false

  const mailing = {
    country: getI130ASectionValue(mailingRows, 'Country'),
    line1: getI130ASectionValue(mailingRows, 'Address line 1'),
    line2: getI130ASectionValue(mailingRows, 'Address line 2'),
    city: getI130ASectionValue(mailingRows, 'City or town'),
    state: getI130ASectionValue(mailingRows, 'State/Province'),
    zip: getI130ASectionValue(mailingRows, 'ZIP code/Postal code')
  }
  const current = {
    country: getI130ASectionValue(oldAddressRows, '(1) Country'),
    line1: getI130ASectionValue(oldAddressRows, '(1) Address line 1'),
    line2: getI130ASectionValue(oldAddressRows, '(1) Address line 2'),
    city: getI130ASectionValue(oldAddressRows, '(1) City or town'),
    state: getI130ASectionValue(oldAddressRows, '(1) State/Province'),
    zip: getI130ASectionValue(oldAddressRows, '(1) ZIP code/Postal code'),
    to: getI130ASectionValue(oldAddressRows, '(1) To')
  }
  const toKey = normalizeI130ACaseText(current.to)
  const isCurrentAddress = !toKey || ['present', 'hien tai', 'now', 'current', 'nay'].includes(toKey)

  return isCurrentAddress && addressesMatchForLiveAtMailingAddress(mailing, current)
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function normalizePlainPasteText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function plainTextToCellHtml(value) {
  const text = normalizePlainPasteText(value)
  if (!text) return ''
  return text.split('\n').map(escapeHtml).join('<br>')
}

export function setCaretToEnd(element) {
  const selection = window.getSelection?.()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function normalizeSpouseAddressOptionValue(value) {
  const normalized = normalizeText(stripHtml(value)).replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.includes('SAME AS HOME ADDRESS')) return 'SAME AS HOME ADDRESS'
  if (normalized.includes('SAME AS MAILING ADDRESS')) return 'SAME AS MAILING ADDRESS'
  if (normalized.includes('SAME AS U.S. CONTACT ADDRESS') || normalized.includes('SAME AS US CONTACT ADDRESS')) {
    return 'SAME AS U.S. CONTACT ADDRESS'
  }
  if (normalized.includes('DO NOT KNOW')) return 'DO NOT KNOW'
  if (normalized === 'OTHER' || normalized.includes(' OTHER')) return 'OTHER'
  return ''
}

export function getSpouseAddressOptionValue(cell) {
  return normalizeSpouseAddressOptionValue(
    cell?.querySelector('.spouse-address-option-check:checked')?.dataset.val || ''
  )
}

export function isSpouseAddressOptionSource(cell) {
  if (!cell) return false
  const text = normalizeText(stripHtml(
    cell.dataset.originalHtml ||
    cell.innerHTML ||
    cell.textContent ||
    ''
  )).replace(/\s+/g, ' ').trim()

  return SPOUSE_ADDRESS_OPTIONS.every(option => text.includes(option))
}

export function syncSpouseAddressOptionChecks(cell, value) {
  const selected = normalizeSpouseAddressOptionValue(value)
  cell?.querySelectorAll('.spouse-address-option-check').forEach(chk => {
    const checked = chk.dataset.val === selected
    chk.checked = checked
    if (checked) chk.setAttribute('checked', 'checked')
    else chk.removeAttribute('checked')
  })
}

export function clearSpouseAddressOptionCell(cell) {
  if (!cell) return
  syncSpouseAddressOptionChecks(cell, '')
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  delete cell.dataset.filled
  delete cell.dataset.filledValue
}

export function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function splitSocialMediaText(value) {
  return stripHtml(value)
    .split(/\r?\n|;|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

export function uniqueSocialMediaItems(items) {
  const seen = new Set()
  const result = []

  items.forEach(item => {
    const cleaned = stripHtml(item).replace(/\s+/g, ' ').trim()
    if (!cleaned) return

    const key = cleaned.toLowerCase()
    if (seen.has(key)) return

    seen.add(key)
    result.push(cleaned)
  })

  return result
}

export function getSocialMediaValues(...values) {
  const collect = (value) => {
    if (!value) return []

    if (Array.isArray(value)) {
      return value.flatMap(item => collect(item))
    }

    if (typeof value === 'object') {
      const keys = [
        'url', 'link', 'identifier', 'username', 'handle', 'value', 'name',
        'platform', 'provider', 'socialMedia', 'socialMediaLink', 'socialMediaLinks'
      ]
      return keys.flatMap(key => collect(value[key]))
    }

    return splitSocialMediaText(value)
  }

  return uniqueSocialMediaItems(values.flatMap(value => collect(value)))
}

export function getAllSocialMediaValue(...values) {
  return getSocialMediaValues(...values).join(', ')
}

export function inferSocialMediaProvider(value) {
  const raw = stripHtml(value)
  if (!raw) return ''

  const cleaned = raw
    .replace(/^@+/, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^m\./i, '')
    .replace(/^mobile\./i, '')
    .trim()

  const normalized = normalizeText(cleaned)
  if (!normalized) return ''

  if (normalized.includes('FACEBOOK') || normalized.includes('FB.COM')) return 'FACEBOOK'
  if (normalized.includes('TIKTOK')) return 'TIKTOK'
  if (normalized.includes('INSTAGRAM')) return 'INSTAGRAM'
  if (normalized.includes('YOUTUBE') || normalized.includes('YOUTU.BE')) return 'YOUTUBE'
  if (normalized.includes('X.COM') || normalized.includes('TWITTER')) return 'X/TWITTER'
  if (normalized.includes('LINKEDIN')) return 'LINKEDIN'
  if (normalized.includes('ZALO')) return 'ZALO'
  if (normalized.includes('TELEGRAM')) return 'TELEGRAM'

  const hostLike = cleaned.split(/[/?#]/)[0]
  const provider = hostLike.includes('.')
    ? hostLike.split('.')[0]
    : hostLike.split(/\s+/)[0]

  return provider.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase()
}

export function getSocialMediaProvider(...values) {
  return uniqueSocialMediaItems(
    getSocialMediaValues(...values)
      .map(inferSocialMediaProvider)
      .filter(Boolean)
  ).join(', ')
}

export function normalizeSocialMediaAccount(account) {
  const firstNonEmpty = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''

  if (!account) return null

  if (typeof account === 'object' && !Array.isArray(account)) {
    const identifier = firstNonEmpty(
      account.link,
      account.url,
      account.identifier,
      account.username,
      account.handle,
      account.value,
      account.socialMediaLink,
      account.socialMedia,
      account.socialMediaLinks
    )
    const provider = firstNonEmpty(
      account.platform,
      account.provider,
      account.socialMediaProvider,
      account.socialMediaPlatform,
      account.socialMediaProviderPlatform,
      account.name
    )

    const cleanIdentifier = stripHtml(identifier).replace(/\s+/g, ' ').trim()
    const cleanProvider = stripHtml(provider).replace(/\s+/g, ' ').trim() || inferSocialMediaProvider(cleanIdentifier)

    if (!cleanIdentifier && !cleanProvider) return null

    return {
      provider: normalizeText(cleanProvider || inferSocialMediaProvider(cleanIdentifier)),
      identifier: normalizeText(cleanIdentifier)
    }
  }

  const identifier = stripHtml(account).replace(/\s+/g, ' ').trim()
  if (!identifier) return null

  return {
    provider: normalizeText(inferSocialMediaProvider(identifier)),
    identifier: normalizeText(identifier)
  }
}

export function getSocialMediaAccountsFromValue(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap(item => getSocialMediaAccountsFromValue(item))
  }

  if (typeof value === 'object') {
    const normalized = normalizeSocialMediaAccount(value)
    return normalized ? [normalized] : []
  }

  return splitSocialMediaText(value)
    .map(item => normalizeSocialMediaAccount(item))
    .filter(Boolean)
}

export function getSocialMediaAccounts(...values) {
  const seen = new Set()
  const result = []

  values.flatMap(value => getSocialMediaAccountsFromValue(value)).forEach(account => {
    const provider = stripHtml(account.provider).replace(/\s+/g, ' ').trim()
    const identifier = stripHtml(account.identifier).replace(/\s+/g, ' ').trim()
    if (!provider && !identifier) return

    const key = `${provider.toLowerCase()}|${identifier.toLowerCase()}`
    if (seen.has(key)) return

    seen.add(key)
    result.push({ provider, identifier })
  })

  return result
}

export function isAffirmativeValue(value) {
  const normalized = normalizeText(stripHtml(value)).replace(/\s+/g, ' ').trim()
  if (!normalized ||
      normalized === 'NO' ||
      normalized === 'FALSE' ||
      normalized === '0' ||
      normalized === 'KHONG' ||
      normalized.startsWith('KHONG ') ||
      normalized.startsWith('CHUA ') ||
      normalized.startsWith('NO ')) {
    return false
  }
  return normalized === 'YES' ||
         normalized === 'Y' ||
         normalized === 'TRUE' ||
         normalized === '1' ||
         normalized === 'CA3' ||
         normalized === 'CO' ||
         normalized.startsWith('CO ') ||
         normalized.startsWith('CO,') ||
         normalized.startsWith('CO-') ||
         normalized === 'ROI' ||
         normalized.includes('DA ROI') ||
         normalized.includes('DA TUNG') ||
         normalized.includes('DA NOP') ||
         normalized.includes('DANG CHO') ||
         normalized.includes('BAO LANH') ||
         normalized.includes('PETITION') ||
         normalized.includes('FILED') ||
         normalized.includes('ROT') ||
         normalized.includes('TU CHOI') ||
         normalized.includes('REFUSED') ||
         normalized.includes('DENIED') ||
         normalized.includes('WITHDRAWN')
}

export function splitPersonName(fullName) {
  const cleaned = stripHtml(fullName).replace(/\s+/g, ' ').trim()
  if (!cleaned) return { surname: '', givenName: '' }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(part => part.trim()).filter(Boolean)
    return { surname: parts[0] || '', givenName: parts.slice(1).join(' ') }
  }
  const parts = cleaned.split(' ').filter(Boolean)
  return { surname: parts[0] || '', givenName: parts.slice(1).join(' ') }
}

export function normalizeRelationship(value) {
  const cleaned = stripHtml(value).replace(/\s+/g, ' ').trim()
  const normalized = normalizeText(cleaned)
  if (!normalized) return ''
  if (/\b(VO|CHONG|WIFE|HUSBAND|SPOUSE)\b/.test(normalized)) return 'SPOUSE'
  if (/\b(CON|SON|DAUGHTER|CHILD)\b/.test(normalized)) return 'CHILD'
  if (/\b(CHA|BA|BO|ME|MOTHER|FATHER|PARENT)\b/.test(normalized)) return 'PARENT'
  if (/\b(ANH|CHI|EM|BROTHER|SISTER|SIBLING)\b/.test(normalized)) return 'SIBLING'
  if (/\b(BAN|FRIEND)\b/.test(normalized)) return 'FRIEND'
  if (/\b(HON PHU|HON THE|FIANCE|FIANCEE)\b/.test(normalized)) return 'FIANCE/FIANCEE'
  return cleaned
}

export function parseCompanionLine(line) {
  let cleaned = stripHtml(line)
    .replace(/^\s*(?:[-*]|\d+[\).:-]?)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return null
  if (/^(KHONG|KHONG CO|NO|NONE|N\/A|NA)$/i.test(normalizeText(cleaned))) return null

  let fullName = cleaned
  let relationship = ''
  const parenthesized = cleaned.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (parenthesized) {
    fullName = parenthesized[1].trim()
    relationship = parenthesized[2].trim()
  } else {
    const dashParts = cleaned.split(/\s+[-–—]\s+/).map(part => part.trim()).filter(Boolean)
    if (dashParts.length > 1) {
      fullName = dashParts[0]
      relationship = dashParts.slice(1).join(' - ')
    }
  }

  const nameParts = splitPersonName(fullName)
  return {
    surname: nameParts.surname,
    givenName: nameParts.givenName,
    relationship: normalizeRelationship(relationship)
  }
}

export function fillYesNoCell(td, val) {
  if (!td || !td.classList.contains('yesno-cell')) return
  const upperVal = (val || '').toUpperCase().trim()
  const checks = td.querySelectorAll('.yesno-check')
  checks.forEach(chk => {
    chk.checked = (chk.dataset.val === upperVal)
  })
  td.dataset.filled = 'true'
  td.dataset.filledValue = upperVal
  td.classList.remove('color-filler', 'color-reviewer')
  td.classList.add('color-customer')

  // Toggle companion detail rows if this is question 11/12
  const rowText = Array.from(td.closest('tr')?.querySelectorAll('td') || []).map(t => t.textContent).join(' ')
  if (isCompanionTravelQuestion(rowText) || isCompanionGroupQuestion(rowText)) {
    syncCompanionDetailRows(td.closest('table'))
  }
}

export function fillImmigrantStatusCell(td, val) {
  if (!td || !td.classList.contains('immigrant-status-cell')) return
  const upperVal = (val || '').toUpperCase().trim()
  if (upperVal !== 'NONIMMIGRANT' && upperVal !== 'IMMIGRANT') return
  const checks = td.querySelectorAll('.immigrant-status-check')
  checks.forEach(chk => {
    chk.checked = (chk.dataset.val === upperVal)
  })
  td.dataset.filled = 'true'
  td.dataset.filledValue = upperVal
  td.classList.remove('color-filler', 'color-reviewer')
  td.classList.add('color-customer')
}

export function i130aAppendixStripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}

export function i130aAppendixEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function i130aAppendixNormalize(value) {
  return i130aAppendixStripHtml(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/VIET NAM/g, 'VIETNAM')
    .trim()
}

export function i130aAppendixDisplayValue(label = '', value = '') {
  if (shouldRenderLowercaseEmail(label, value)) {
    return normalizeEmailDisplayValue(value)
  }

  return i130aAppendixNormalize(value)
}

export function i130aAppendixFirstValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      const nested = i130aAppendixFirstValue(...value)
      if (nested !== '') return nested
      continue
    }
    if (typeof value === 'object') {
      const nested = i130aAppendixFirstValue(
        value.value,
        value.text,
        value.fullName,
        value.hoTen,
        value.ten,
        value.name,
        value.fullAddress,
        value.address,
        value.diaChi,
        value.date,
        value.fullDate,
        value.birthDate,
        value.dob
      )
      if (nested !== '') return nested
      continue
    }
    const text = String(value).trim()
    if (text !== '') return text
  }
  return ''
}

export function i130aAppendixPick(source, keys = []) {
  if (!source || typeof source !== 'object') return ''
  return i130aAppendixFirstValue(...keys.map(key => source[key]))
}

export function i130aAppendixGetObject(source, keys = []) {
  if (!source || typeof source !== 'object') return {}
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') return value[0]
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  }
  return {}
}

export function i130aAppendixNameText(value) {
  if (Array.isArray(value)) return i130aAppendixNameText(value[0])
  if (value && typeof value === 'object') {
    return i130aAppendixFirstValue(
      value.fullName,
      value.hoTen,
      value.tenTrenGiayTo,
      value.name,
      [value.familyName, value.middleName, value.givenName].filter(Boolean).join(' '),
      [value.lastName, value.middleName, value.firstName].filter(Boolean).join(' '),
      [value.ho, value.tenDem, value.ten].filter(Boolean).join(' ')
    )
  }
  return i130aAppendixFirstValue(value)
}

export function i130aAppendixSplitName(...values) {
  const raw = i130aAppendixFirstValue(...values.map(i130aAppendixNameText))
  const direct = values.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {}
  const familyDirect = i130aAppendixPick(direct, ['familyName', 'lastName', 'ho', 'surname'])
  const middleDirect = i130aAppendixPick(direct, ['middleName', 'tenDem'])
  const givenDirect = i130aAppendixPick(direct, ['givenName', 'firstName', 'ten'])

  if (familyDirect || middleDirect || givenDirect) {
    const givenText = String(givenDirect || '').replace(/\s+/g, ' ').trim()
    const givenKey = i130aAppendixNormalize(givenText)
    const familyKey = i130aAppendixNormalize(familyDirect)
    const familyMiddleKey = i130aAppendixNormalize([familyDirect, middleDirect].filter(Boolean).join(' '))
    const givenLooksLikeFullName = givenText.includes(' ') && (
      !familyDirect ||
      (!!familyMiddleKey && givenKey.startsWith(`${familyMiddleKey} `)) ||
      (!!familyKey && givenKey.startsWith(`${familyKey} `))
    )

    if (givenLooksLikeFullName) {
      const parts = i130aAppendixNormalize(givenText).split(/\s+/).filter(Boolean)
      return {
        family: parts[0] || '',
        middle: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
        given: parts.length > 1 ? parts[parts.length - 1] : (parts[0] || '')
      }
    }

    return {
      family: i130aAppendixNormalize(familyDirect),
      middle: i130aAppendixNormalize(middleDirect),
      given: i130aAppendixNormalize(givenDirect)
    }
  }

  const parts = i130aAppendixNormalize(raw).split(/\s+/).filter(Boolean)
  if (!parts.length) return { family: '', middle: '', given: '' }
  if (parts.length === 1) return { family: '', middle: '', given: parts[0] }
  return {
    family: parts[0],
    middle: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    given: parts[parts.length - 1]
  }
}

export function i130aAppendixSplitParentName(...values) {
  const direct = values.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {}
  const familyDirect = i130aAppendixPick(direct, ['familyName', 'lastName', 'ho', 'surname'])
  const middleDirect = i130aAppendixPick(direct, ['middleName', 'tenDem'])
  const givenDirect = i130aAppendixPick(direct, ['givenName', 'firstName', 'ten'])
  const givenText = String(givenDirect || '').replace(/\s+/g, ' ').trim()
  const givenKey = i130aAppendixNormalize(givenText)
  const familyKey = i130aAppendixNormalize(familyDirect)
  const familyMiddleKey = i130aAppendixNormalize([familyDirect, middleDirect].filter(Boolean).join(' '))
  const givenLooksLikeFullName = givenText.includes(' ') && (
    !familyDirect ||
    (!!familyMiddleKey && givenKey.startsWith(`${familyMiddleKey} `)) ||
    (!!familyKey && givenKey.startsWith(`${familyKey} `))
  )

  const raw = givenLooksLikeFullName
    ? givenText
    : i130aAppendixFirstValue(...values.map(i130aAppendixNameText))
  const parts = i130aAppendixNormalize(raw).split(/\s+/).filter(Boolean)

  if (parts.length > 1) {
    return {
      family: parts[0],
      middle: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      given: parts[parts.length - 1]
    }
  }

  if (familyDirect || middleDirect || givenDirect) {
    return {
      family: i130aAppendixNormalize(familyDirect),
      middle: i130aAppendixNormalize(middleDirect),
      given: i130aAppendixNormalize(givenDirect)
    }
  }

  return { family: '', middle: '', given: parts[0] || '' }
}

export function i130aAppendixFormatDate(...values) {
  const raw = i130aAppendixFirstValue(...values)
  if (!raw) return ''
  return formatI130DateMMDDYYYY(raw) || String(raw).trim()
}

export function formatI130DateMMDDYYYY(value) {
  if (value === undefined || value === null || value === '') return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${mm}/${dd}/${value.getFullYear()}`
  }

  const text = String(value).trim()
  if (!text) return ''

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/)
  if (iso) {
    return `${String(iso[2]).padStart(2, '0')}/${String(iso[3]).padStart(2, '0')}/${iso[1]}`
  }

  const full = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (full) {
    let first = Number(full[1])
    let second = Number(full[2])
    const year = full[3]

    // Dữ liệu trong form thường được nhập theo kiểu Việt Nam DD/MM/YYYY.
    // Phiếu kiểm tra I-130 phải hiển thị theo chuẩn Mỹ MM/DD/YYYY.
    let month = second
    let day = first

    // Nếu giá trị đầu rõ ràng là tháng (<=12) và giá trị thứ hai là ngày (>12) thì giữ MM/DD/YYYY.
    if (first <= 12 && second > 12) {
      month = first
      day = second
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
    }
  }

  const monthYear = text.match(/^(\d{1,2})[\/\-.](\d{4})$/)
  if (monthYear) {
    const month = Number(monthYear[1])
    if (month >= 1 && month <= 12) return `${String(month).padStart(2, '0')}/${monthYear[2]}`
  }

  return text
}

export function i130aAppendixIsLocalAddressPart(value) {
  const text = i130aAppendixNormalize(value)
  if (!text) return false
  return /\b(PHUONG|XA|QUAN|HUYEN|WARD|DISTRICT|COMMUNE|TOWN|THI XA)\b/.test(text)
}

export function i130aAppendixCountryOnly(...values) {
  for (const value of values) {
    const raw = i130aAppendixFirstValue(value)
    if (!raw) continue

    const parts = String(raw)
      .split(/\r?\n|,|;/)
      .map(part => part.trim())
      .filter(Boolean)
    const candidates = parts.length ? [...parts].reverse() : [raw]

    for (const candidate of candidates) {
      const key = i130aAppendixNormalize(candidate).replace(/[^A-Z0-9]+/g, '')
      if (!key) continue
      if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA', 'HOAKY', 'MY'].includes(key)) return 'USA'
      if (key === 'VN' || key.includes('VIETNAM')) return 'VIETNAM'
    }
  }

  return ''
}

export function i130aAppendixCityOnly(...values) {
  for (const value of values) {
    const raw = i130aAppendixFirstValue(value)
    if (!raw) continue

    const parts = String(raw)
      .split(/\r?\n|,|;/)
      .map(part => part.trim())
      .filter(Boolean)
    const city = parts[0] || raw
    if (city) return i130aAppendixNormalize(city)
  }

  return ''
}

export function i130aAppendixNormalizeCaseText(value) {
  return i130aAppendixNormalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

export function i130aAppendixIsBaoLanhVoChongCase(data = {}) {
  // Chỉ dựa trên các field định danh diện hồ sơ thật sự.
  // Không quét JSON.stringify(data) vì các form khác có thể vẫn chứa chữ "vo-chong"
  // trong danh sách option/cache, làm phần I-130A của NĐBL hiện nhầm.
  const candidateValues = [
    data.form_slug,
    data.formSlug,
    data.form_key,
    data.formKey,
    data.formType,
    data.loaiForm,
    data.loaiHoSo,
    data.loai_ho_so,
    data.loaiHoSoBaoLanh,
    data.loai_ho_so_bao_lanh,
    data.dienBaoLanh,
    data.dien_bao_lanh,
    data.petitionRelationship,
    data.petitionRelationshipLabel,
    data.relationship,
    data.relationshipToPetitioner,
    data.petitionType,
    data.caseType,
    data.category,
    data.formCategory,
    data.type
  ]

  const joined = candidateValues
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(i130aAppendixNormalizeCaseText)
    .join(' ')

  if (!joined) return false

  const spousePatterns = [
    'BAOLANHVOCHONG',
    'BAO LANH VO CHONG',
    'VO CHONG',
    'VỢ CHỒNG',
    'SPOUSE',
    'WIFE',
    'HUSBAND',
    'CR1',
    'IR1'
  ].map(i130aAppendixNormalizeCaseText)

  return spousePatterns.some(pattern => joined.includes(pattern))
}

export function i130aAppendixValueHtml(value) {
  const text = i130aAppendixDisplayValue('', value)
  return i130aAppendixEscapeHtml(text)
}

export function i130aAppendixParseSortDate(value) {
  const raw = String(value || '').trim()
  const key = i130aAppendixNormalize(raw)
  if (!key) return 0
  if (['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)) return Date.now()

  const parts = raw.split(/[/-]/).map(part => part.trim()).filter(Boolean)
  if (parts.length === 3) {
    let year = ''
    let month = ''
    let day = ''

    if (parts[0].length === 4) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else {
      const first = parseInt(parts[0], 10)
      const second = parseInt(parts[1], 10)
      year = parts[2]
      if (second > 12) {
        month = parts[0]
        day = parts[1]
      } else if (first > 12) {
        day = parts[0]
        month = parts[1]
      } else {
        month = parts[0]
        day = parts[1]
      }
    }

    const time = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  const time = new Date(raw).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function i130aAppendixGetBeneficiaryData(data = {}) {
  return i130aAppendixGetObject(data, [
    'beneficiaryData',
    'nguoiDuocBaoLanh',
    'nguoi_duoc_bao_lanh',
    'ndblData',
    'ndbl',
    'beneficiary'
  ])
}

export function i130aAppendixGetParent(source = {}, relation = 'father') {
  const fatherKeys = ['father', 'fatherInfo', 'bo', 'cha', 'fatherData', 'thongTinCha']
  const motherKeys = ['mother', 'motherInfo', 'me', 'motherData', 'thongTinMe']
  return i130aAppendixGetObject(source, relation === 'father' ? fatherKeys : motherKeys)
}

export function i130aAppendixGetAddressList(source = {}, fallback = {}) {
  const sources = [source, fallback].filter(item => item && typeof item === 'object')
  for (const item of sources) {
    const direct = item.addresses ||
      item.addressHistory ||
      item.residenceHistory ||
      item.previousAddresses ||
      item.diaChi5Nam ||
      item.diaChiTrong5Nam ||
      item.diaChiCu5Nam ||
      item.dia_chi_5_nam ||
      item.dia_chi_trong_5_nam

    if (Array.isArray(direct) && direct.length > 0) return direct
  }
  return [source]
}

export function i130aAppendixGetJobList(source = {}, fallback = {}) {
  const sources = [source, fallback].filter(item => item && typeof item === 'object')
  for (const item of sources) {
    const direct = item.employmentHistory ||
      item.jobs ||
      item.works ||
      item.congViec5Nam ||
      item.congViecTrong5Nam ||
      item.cong_viec_5_nam ||
      item.cong_viec_trong_5_nam

    if (Array.isArray(direct) && direct.length > 0) return direct
  }
  return [source]
}

export function normalizeI130ARelationshipText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function resolveI130APetitionSectionTitle(data = {}) {
  const first = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''
  const raw = first(
    data.petitionRelationship,
    data.petitionRelationshipLabel,
    data.loaiHoSoBaoLanh,
    data.dienBaoLanh,
    data.loaiHoSo,
    data.relationshipToPetitioner,
    data.relationship,
    data.caseType,
    data.petitionType,
    data.formCategory,
    data.category
  )
  const normalized = normalizeI130ARelationshipText(raw)

  if (normalized.includes('vo chong') || normalized.includes('spouse') || normalized.includes('wife') || normalized.includes('husband') || normalized.includes('cr1') || normalized.includes('ir1')) return 'VỢ CHỒNG'
  if (normalized.includes('con gai') || normalized.includes('con cai') || normalized.includes('child') || normalized.includes('son') || normalized.includes('daughter')) return 'CON CÁI'
  if (normalized.includes('cha me') || normalized.includes('parent') || normalized.includes('father') || normalized.includes('mother')) return 'CHA MẸ'
  if (normalized.includes('anh chi em') || normalized.includes('sibling') || normalized.includes('brother') || normalized.includes('sister')) return 'ANH CHỊ EM'
  if (normalized.includes('hon phu') || normalized.includes('hon the') || normalized.includes('fiance') || normalized.includes('fiancee')) return 'HÔN PHU / HÔN THÊ'

  return raw ? String(raw).replace(/-/g, ' ').toUpperCase() : 'VỢ CHỒNG'
}

