<template>
  <div class="word-paper-container ds260-word-paper-container">
    <div ref="paperRef" v-html="rawHtml"></div>
  </div>
</template>

<script setup>
import { clearCellContent, recordClearedChange } from '../lib/cell-clear.js'
import { buildAuditSnapshot } from '../lib/audit-snapshot.js'
import { ref, onMounted, watch, nextTick } from 'vue'
import { appendSignatureBlockToClone } from '../lib/signatures.js'
import { appendCommentsToClone } from '../lib/pdf-comments.js'
import {
  buildDS260Mappings,
  getDS260HeaderValues,
  parseChildrenFromData as parseDS260ChildrenFromData,
  OTHER_PASSPORT_QUESTION_LABEL
} from '../forms/ds260-mappings.js'

const props = defineProps({
  mode: String,
  formType: String,
  customerData: Object,
  currentUser: Object,
  reviewers: Array,
  selectedReviewer: [String, Number],
  logCompare: Boolean,
  signatures: { type: Object, default: null },
  // Comment theo dòng của phiếu đã kiểm tra, chỉ dùng khi xuất PDF.
  comments: { type: Array, default: () => [] }
})

const emit = defineEmits(['change', 'submit-form', 'update:selectedReviewer'])

const paperRef = ref(null)
const rawHtml = ref('')
const changes = ref({})
const DS260_PLACEHOLDER_STATE_KEY = '__ds260_hidden_placeholders__'
const OLD_ADDRESS_ANCHOR = 'ĐỊA CHỈ CŨ'
const OLD_ADDRESS_MIN_COUNT = 2
const OLD_ADDRESS_TEMPLATE_INDEX = 2
const OLD_ADDRESS_REPEAT_SECTION = 'old-address'
const OLD_ADDRESS_FIELD_KEYS = [
  { label: 'Street Address', key: 'street' },
  { label: 'City', key: 'city' },
  { label: 'State/Province', key: 'state' },
  { label: 'Postal Zone/ZIP Code', key: 'zip' },
  { label: 'Country/Region', key: 'country' },
  { label: 'From', key: 'from' },
  { label: 'To', key: 'to' }
]
const PHONE_ANCHOR = 'SỐ ĐIỆN THOẠI'
const PHONE_MIN_COUNT = 2
const PHONE_TEMPLATE_INDEX = 2
const PHONE_REPEAT_SECTION = 'additional-phone'
const PHONE_REPEAT_LABEL = 'Additional Phone Number'
const EMAIL_ANCHOR = 'ĐỊA CHỈ EMAIL'
const EMAIL_MIN_COUNT = 2
const EMAIL_TEMPLATE_INDEX = 2
const EMAIL_REPEAT_SECTION = 'previous-email'
const EMAIL_REPEAT_LABEL = 'Email Address'
const SOCIAL_ANCHOR = 'MẠNG XÃ HỘI'
const SOCIAL_MIN_COUNT = 2
const SOCIAL_TEMPLATE_INDEX = 2
const SOCIAL_REPEAT_SECTION = 'standard-social'
const SOCIAL_PROVIDER_LABEL = 'Social Media Provider/Platform'
const SOCIAL_IDENTIFIER_LABEL = 'Social Media Identifier'
const OTHER_SOCIAL_ANCHOR = 'Other Social Media'
const OTHER_SOCIAL_MIN_COUNT = 2
const OTHER_SOCIAL_TEMPLATE_INDEX = 2
const OTHER_SOCIAL_REPEAT_SECTION = 'other-social'
// Hộ chiếu khác trong 15 năm qua: neo là chính dòng câu hỏi (nằm trong mục QUỐC TỊCH, không có
// tiêu đề mục riêng), khối gốc trong HTML là (1) gồm 2 dòng Country/Region of Issuance + Passport Number.
const OTHER_PASSPORT_ANCHOR = OTHER_PASSPORT_QUESTION_LABEL
const OTHER_PASSPORT_MIN_COUNT = 1
const OTHER_PASSPORT_TEMPLATE_INDEX = 1
const OTHER_PASSPORT_REPEAT_SECTION = 'other-passport'
const OTHER_PASSPORT_FIELD_KEYS = [
  { label: 'Country/Region of Issuance', key: 'issuing_country' },
  { label: 'Passport Number', key: 'passport_number' }
]
const TRAVEL_ANCHOR = 'DU LỊCH NƯỚC NGOÀI'
const TRAVEL_MIN_COUNT = 2
const TRAVEL_TEMPLATE_INDEX = 2
const TRAVEL_REPEAT_SECTION = 'foreign-travel'
const TRAVEL_FIELD_KEYS = [
  { label: 'Name of Country/Region', key: 'country' },
  { label: 'Locations', key: 'locations' },
  { label: 'Date Arrived', key: 'arrival_date' },
  { label: 'Length of Stay', key: 'length_of_stay' },
  { label: 'Person/Entity Who Paid for Trip', key: 'trip_payer' }
]
const SIBLINGS_ANCHOR = 'THÔNG TIN ANH CHỊ EM'
const SIBLINGS_MIN_COUNT = 1
const SIBLINGS_TEMPLATE_INDEX = 1
const SIBLINGS_REPEAT_SECTION = 'siblings'
const SIBLINGS_FIELD_KEYS = [
  { label: 'Siblings Surnames', key: 'surnames' },
  { label: 'Siblings Given Names', key: 'given_names' },
  { label: 'Date of Birth', key: 'birth_date' },
  { label: 'Nationality', key: 'nationality' }
]
const PREVIOUS_WORK_ANCHOR = 'CÔNG VIỆC TRƯỚC ĐÂY'
const PREVIOUS_WORK_MIN_COUNT = 2
const PREVIOUS_WORK_TEMPLATE_INDEX = 2
const PREVIOUS_WORK_REPEAT_SECTION = 'previous-work'
const PREVIOUS_WORK_FIELD_KEYS = [
  { label: 'Employer Name', key: 'employer' },
  { label: 'Employer Street Address', key: 'street' },
  { label: 'City', key: 'city' },
  { label: 'State/Province', key: 'state' },
  { label: 'Postal Zone/ZIP Code', key: 'zip' },
  { label: 'Country/Region', key: 'country' },
  { label: 'Telephone Number', key: 'phone' },
  { label: 'Job Title', key: 'title' },
  { label: "Supervisor's Surnames", key: 'supervisor_surnames' },
  { label: "Supervisor's Given Names", key: 'supervisor_given_names' },
  { label: 'From', key: 'from' },
  { label: 'To', key: 'to' }
]
const PREVIOUS_SPOUSE_ANCHOR = 'CUỘC HÔN NHÂN CŨ'
const PREVIOUS_SPOUSE_COUNT_LABEL = 'Number of Previous spouses'
const PREVIOUS_SPOUSE_BASE_COUNT = 1
const PREVIOUS_SPOUSE_REPEAT_SECTION = 'previous-spouse'
const PREVIOUS_SPOUSE_FIELD_KEYS = [
  { label: 'Surnames', key: 'surnames' },
  { label: 'Given Names', key: 'given_names' },
  { label: 'Date of birth', key: 'birth_date' },
  { label: 'Nationality', key: 'nationality' },
  { label: 'Date of Marriage', key: 'marriage_date' },
  { label: 'Date Marriage Ended', key: 'marriage_end_date' },
  { label: 'How was your marriage terminated', key: 'termination_reason' },
  { label: 'Country/Region where marriage was terminated', key: 'termination_country' }
]
const CHILD_ANCHOR = 'CON CÁI'
const CHILD_COUNT_LABEL = 'Number of Children'
const CHILD_MIN_COUNT = 2
const CHILD_TEMPLATE_INDEX = 2
const CHILD_REPEAT_SECTION = 'child'
const CHILD_FIELD_KEYS = [
  { label: 'Child Surnames', key: 'surnames' },
  { label: 'Child Given Names', key: 'given_names' },
  { label: 'Date of Birth', key: 'birth_date' },
  { label: 'City', key: 'birth_city' },
  { label: 'State/Province', key: 'birth_state' },
  { label: 'Country/Region', key: 'birth_country' },
  { label: 'Does this child live with you?', key: 'lives_with_you' },
  { label: 'Current Address', key: 'current_address' },
  { label: 'City', key: 'address_city' },
  { label: 'State/Province', key: 'address_state' },
  { label: 'Postal Zone/ZIP Code', key: 'address_zip' },
  { label: 'Country/Region', key: 'address_country' },
  { label: 'Is this child immigrating to the U.S. with you?', key: 'immigrating_with_you' },
  { label: 'Is this child immigrating to the U.S. at a later date to join you?', key: 'immigrating_later' }
]
const EDUCATION_ANCHOR = 'CÁC TRƯỜNG ĐÃ HỌC'
const EDUCATION_COUNT_LABEL = 'Number of Educational Institutions Attended'
const EDUCATION_MIN_COUNT = 2
const EDUCATION_TEMPLATE_INDEX = 2
const EDUCATION_REPEAT_SECTION = 'education'
const EDUCATION_FIELD_KEYS = [
  { label: 'Name of Institution', key: 'name' },
  { label: 'Street Address', key: 'street' },
  { label: 'City', key: 'city' },
  { label: 'State/Province', key: 'state' },
  { label: 'Postal Zone/ZIP Code', key: 'zip' },
  { label: 'Country/Region', key: 'country' },
  { label: 'Course of Study', key: 'course' },
  { label: 'Degree, Diploma or Certificate Received', key: 'degree' },
  { label: 'From', key: 'from' },
  { label: 'To', key: 'to' }
]
const US_VISA_ANCHOR = 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY'
const US_VISA_BASE_COUNT = 1
const US_VISA_REPEAT_SECTION = 'us-visa-arrival'
const US_VISA_FIELD_KEYS = [
  { label: 'Date Arrived', key: 'date_arrived' },
  { label: 'Length of Stay', key: 'length_of_stay' }
]


function getUSVisaSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, US_VISA_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getUSVisaSectionRows() {
  const { rows, startIndex, endIndex } = getUSVisaSectionBounds()
  if (startIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function getUSVisaArrivalFieldKey(row) {
  const field = US_VISA_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function isUSVisaArrivalRow(row) {
  return US_VISA_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label))
}

function isUSVisaArrivalRepeatRow(row) {
  return row?.dataset?.ds260RepeatSection === US_VISA_REPEAT_SECTION || (
    isUSVisaArrivalRow(row) && getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
  )
}

function getUSVisaArrivalRowsByIndex(repeatIndex) {
  if (repeatIndex <= US_VISA_BASE_COUNT) {
    return getUSVisaSectionRows().filter(row => isUSVisaArrivalRow(row) && !isUSVisaArrivalRepeatRow(row))
  }
  return getUSVisaSectionRows().filter(row => isUSVisaArrivalRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedUSVisaArrivalMaxIndex() {
  return getUSVisaSectionRows().reduce((max, row) => {
    if (!isUSVisaArrivalRepeatRow(row)) return max
    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, US_VISA_BASE_COUNT)
}

function getStoredUSVisaArrivalMaxIndex(data = {}) {
  const changeMaps = [data?._fillerChanges, data?.fillerChanges, data?.filler_changes, data?._reviewChanges, data?.reviewChanges, data?.review_changes]
  const idPattern = /^(?:data|note)_ds260_us_visa_arrival_(\d+)_/
  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function countUSVisaArrivalData(data = {}) {
  const value = data?.usArrivalsList
  if (Array.isArray(value)) {
    return value.filter(item => {
      if (!item) return false
      if (typeof item === 'object') {
        return Boolean(
          String(item.arrivalDate || item.date || item.dateArrived || item.usArrivalDate || '').trim() ||
          String(item.stayDurationVal || item.stayDuration || item.length || item.lengthOfStay || '').trim()
        )
      }
      return String(item || '').trim() !== ''
    }).length
  }
  if (value && typeof value === 'object') return 1
  return String(value || '').split(/\n+/).map(line => line.trim()).filter(Boolean).length
}

function getRequiredUSVisaArrivalCount(data = {}) {
  return Math.max(US_VISA_BASE_COUNT, countUSVisaArrivalData(data), getStoredUSVisaArrivalMaxIndex(data))
}

function getUSVisaArrivalCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (fieldKey === 'date_arrived') {
    const suffixes = ['day', 'month', 'year']
    return `${prefix}_ds260_us_visa_arrival_${repeatIndex}_${fieldKey}_${suffixes[cellIndex] || cellIndex + 1}`
  }
  if (fieldKey === 'length_of_stay') {
    const suffixes = ['number', 'unit']
    return `${prefix}_ds260_us_visa_arrival_${repeatIndex}_${fieldKey}_${suffixes[cellIndex] || cellIndex + 1}`
  }
  if (totalCells <= 1) return `${prefix}_ds260_us_visa_arrival_${repeatIndex}_${fieldKey}`
  return `${prefix}_ds260_us_visa_arrival_${repeatIndex}_${fieldKey}_${cellIndex + 1}`
}

function resetUSVisaArrivalCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix) {
  cell.dataset.cellId = getUSVisaArrivalCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareUSVisaArrivalRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = US_VISA_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)
  const numberCell = getVisibleNonInputCells(row)[0]
  if (numberCell) numberCell.innerHTML = `(${repeatIndex})`

  const fieldKey = getUSVisaArrivalFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')
  dataCells.forEach((cell, index) => resetUSVisaArrivalCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data'))
  noteCells.forEach((cell, index) => resetUSVisaArrivalCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note'))
}

function getUSVisaArrivalInsertBeforeRow() {
  const sectionRows = getUSVisaSectionRows()
  const arrivalRows = sectionRows.filter(row => isUSVisaArrivalRow(row) || isUSVisaArrivalRepeatRow(row))
  const lastArrivalRow = arrivalRows[arrivalRows.length - 1]
  return lastArrivalRow?.nextSibling || null
}

function appendUSVisaArrivalBlock(repeatIndex) {
  if (repeatIndex <= US_VISA_BASE_COUNT || getUSVisaArrivalRowsByIndex(repeatIndex).length) return false
  const templateRows = getUSVisaArrivalRowsByIndex(US_VISA_BASE_COUNT)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const insertBeforeRow = getUSVisaArrivalInsertBeforeRow()
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareUSVisaArrivalRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })
  return true
}

function removeDynamicUSVisaArrivalRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${US_VISA_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupUSVisaArrivalAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, US_VISA_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button.ds260-us-visa-arrival-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }
  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button ds260-us-visa-arrival-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm lần nhập cảnh Mỹ trước đây'
  button.setAttribute('aria-label', 'Thêm lần nhập cảnh Mỹ trước đây')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendUSVisaArrivalBlock(getRenderedUSVisaArrivalMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncUSVisaArrivalRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicUSVisaArrivalRows()
  const requiredCount = getRequiredUSVisaArrivalCount(data)
  for (let index = US_VISA_BASE_COUNT + 1; index <= requiredCount; index += 1) {
    appendUSVisaArrivalBlock(index)
  }
  setupUSVisaArrivalAddButton()
}

// Snapshot "data gốc" + nhãn ô cho audit log. Thiếu hàm này thì App.vue chỉ ghi
// được mã ô (note_12_3) mà không có nhãn, không có data gốc -> log vô dụng.
function getAuditSnapshot() {
  return buildAuditSnapshot(paperRef.value)
}

defineExpose({
  getAuditSnapshot,
  exportPdf
})

onMounted(() => { loadFormHtml() })

watch(() => props.formType, () => { loadFormHtml() })

watch(() => props.customerData, (data) => {
  nextTick(() => {
    if (data) {
      hydratePaper(data)
    } else {
      resetTable(true)
      syncOldAddressRows({})
      syncAdditionalPhoneRows({})
      syncPreviousEmailRows({})
      syncSocialRows({})
      syncOtherPassportRows({})
      syncSiblingsRows({})
      syncTravelRows({})
      syncPreviousWorkRows({})
      syncPreviousSpouseRows({})
      syncChildRows({})
      syncUSVisaArrivalRows({})
      injectHeaderControls()
      injectDS260PlaceholderToggles()
    }
  })
})

watch([() => props.selectedReviewer, () => props.reviewers, () => props.currentUser], () => {
  nextTick(() => injectHeaderControls())
})

async function loadFormHtml() {
  try {
    const res = await fetch('/forms/ds260.html')
    if (!res.ok) {
      rawHtml.value = `<div style="padding:40px;text-align:center;color:#94a3b8;">
        Khong tim thay mau phieu DS-260 trong <code>public/forms/ds260.html</code>
      </div>`
      return
    }

    rawHtml.value = await res.text()
    await nextTick()
    initInteractiveTable()
    convertYesNoCells()
    syncOldAddressRows(props.customerData)
    syncAdditionalPhoneRows(props.customerData)
    syncPreviousEmailRows(props.customerData)
    syncSocialRows(props.customerData)
    syncOtherPassportRows(props.customerData)
    syncSiblingsRows(props.customerData)
    syncTravelRows(props.customerData)
    syncPreviousWorkRows(props.customerData)
    syncPreviousSpouseRows(props.customerData)
    syncChildRows(props.customerData)
    syncEducationRows(props.customerData)
    syncUSVisaArrivalRows(props.customerData)
    if (props.customerData) {
      hydratePaper(props.customerData)
    } else {
      injectHeaderControls()
      injectDS260PlaceholderToggles()
    }
  } catch (error) {
    console.error('DS-260 form load failed:', error)
    rawHtml.value = '<div style="color:red;padding:40px;">Loi tai form DS-260.</div>'
  }
}

function hydratePaper(data) {
  if (!paperRef.value || !data) return
  resetTable()
  syncOldAddressRows(data)
  syncAdditionalPhoneRows(data)
  syncPreviousEmailRows(data)
  syncSocialRows(data)
  syncOtherPassportRows(data)
  syncSiblingsRows(data)
  syncTravelRows(data)
  syncPreviousWorkRows(data)
  syncPreviousSpouseRows(data)
  syncChildRows(data)
  syncEducationRows(data)
  syncUSVisaArrivalRows(data)
  fillHeaderData(data)
  autoFillData(data)

  applyStoredChanges(data)
  reorderPreviousWorkRows()
  injectHeaderControls()
  if (props.logCompare) prepareDS260LogCompareView()
  injectDS260PlaceholderToggles()
  updateCorrectionCountDisplay()
}

function normalizeLabel(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function printableHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function normalizeChangeCompareValue(value = '') {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getRenderedCompareValue(cell) {
  return normalizeChangeCompareValue(cell?.dataset?.filledValue || cell?.innerHTML || '')
}

function getPairedCellById(cellId, fromPrefix, toPrefix) {
  if (!paperRef.value || !cellId || !cellId.startsWith(fromPrefix)) return null
  return paperRef.value.querySelector(`[data-cell-id="${cellId.replace(fromPrefix, toPrefix)}"]`) || null
}

function getStoredChangeTarget(cellId, colorClass) {
  const cell = paperRef.value?.querySelector(`[data-cell-id="${cellId}"]`) || null
  if (!cell || colorClass !== 'color-reviewer' || !cellId.startsWith('data_')) return cell

  const reviewerEditableDataIds = new Set(['header_A_hcm', 'header_A_id', 'header_A_mshs'])
  const pairedNoteCell = getPairedCellById(cellId, 'data_', 'note_')
  return pairedNoteCell && !reviewerEditableDataIds.has(cellId) ? pairedNoteCell : cell
}

function shouldSkipStoredChange(cellId, targetCell, value, colorClass) {
  if (!targetCell || value === '__CLEARED__') return false

  const incomingValue = normalizeChangeCompareValue(value)
  if (!incomingValue) return false

  if (colorClass === 'color-reviewer') {
    const dataCell = targetCell.classList.contains('note-cell')
      ? getPairedCellById(targetCell.dataset.cellId || cellId, 'note_', 'data_')
      : targetCell
    const submittedValue = getRenderedCompareValue(dataCell) || normalizeChangeCompareValue(targetCell.dataset.submittedValue)
    return !!submittedValue && submittedValue === incomingValue
  }

  const currentAutoFilledValue = getRenderedCompareValue(targetCell)
  return !!currentAutoFilledValue && currentAutoFilledValue === incomingValue
}

function labelMatches(value, label) {
  const haystack = normalizeLabel(value)
  const needle = normalizeLabel(label)
  if (!haystack || !needle) return false
  return haystack === needle || haystack.startsWith(needle) || haystack.includes(needle)
}

function getChecklistTable() {
  if (!paperRef.value) return null
  return paperRef.value.querySelector('table.ds260-main-table') || paperRef.value.querySelectorAll('table')[2] || null
}

function getChecklistRows() {
  const table = getChecklistTable()
  return table ? Array.from(table.querySelectorAll('tbody tr')) : []
}

function getDS260PlainCellText(cell) {
  return String(cell?.innerHTML || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDS260SectionNumberCell(row) {
  const cells = Array.from(row?.children || []).filter(cell => {
    if (cell.classList.contains('data-cell') || cell.classList.contains('note-cell')) return false
    if (cell.style.display === 'none') return false
    return cell.tagName === 'TD' || cell.tagName === 'TH'
  })
  const firstCell = cells[0]
  if (!firstCell) return null

  const strongText = normalizeLabel(firstCell.querySelector('strong')?.textContent || '')
  if (/^\d+$/.test(strongText)) return firstCell

  const clone = firstCell.cloneNode(true)
  clone.querySelectorAll('button').forEach(button => button.remove())
  return /^\d+$/.test(normalizeLabel(clone.textContent || '')) ? firstCell : null
}

function getDS260SectionNumber(row) {
  const cell = getDS260SectionNumberCell(row)
  if (!cell) return ''
  const clone = cell.cloneNode(true)
  clone.querySelectorAll('button').forEach(button => button.remove())
  return normalizeLabel(cell.querySelector('strong')?.textContent || clone.textContent || '')
}

function collapseDS260DuplicateSectionNumberCell(cell, sectionNumber) {
  if (!cell || cell.dataset.ds260DuplicateNumberCollapsed === 'true') return
  if (cell.querySelector('.ds260-placeholder-toggle')) return

  cell.dataset.ds260DuplicateNumber = sectionNumber
  cell.dataset.ds260DuplicateNumberHtml = cell.innerHTML
  cell.dataset.ds260DuplicateNumberCollapsed = 'true'
  cell.innerHTML = ''
}

function getDS260SectionRows(startRow) {
  const startNumber = getDS260SectionNumber(startRow)
  if (!startRow || !startNumber) return []

  const rows = []
  let row = startRow
  while (row) {
    if (row !== startRow && isFullWidthSectionHeader(row)) break

    const rowNumber = getDS260SectionNumber(row)
    if (row !== startRow && rowNumber && rowNumber !== startNumber) break

    rows.push(row)
    row = row.nextElementSibling
  }
  return rows
}

function isDS260PlaceholderDataCell(cell) {
  if (!cell?.classList?.contains('data-cell')) return false
  if (cell.classList.contains('color-customer') || cell.classList.contains('color-filler') || cell.classList.contains('color-reviewer')) return false
  if (cell.dataset.filled === 'true' || cell.dataset.filledValue) return false
  if (cell.querySelector('input, select, textarea, button')) return false

  const currentText = getDS260PlainCellText(cell)
  if (!currentText) return false

  const originalText = getDS260PlainCellText({ innerHTML: cell.dataset.originalHtml || '' })
  return !!originalText && currentText === originalText
}

function setDS260SectionPlaceholdersHidden(startRow, hidden) {
  getDS260SectionRows(startRow).forEach(row => {
    row.querySelectorAll('.data-cell').forEach(cell => {
      if (hidden) {
        if (!isDS260PlaceholderDataCell(cell)) return
        cell.dataset.ds260PlaceholderHidden = 'true'
        cell.dataset.ds260HiddenHtml = cell.innerHTML
        cell.innerHTML = ''
        return
      }

      if (cell.dataset.ds260PlaceholderHidden !== 'true') return
      if (!getDS260PlainCellText(cell)) {
        cell.innerHTML = cell.dataset.ds260HiddenHtml || cell.dataset.originalHtml || ''
      }
      delete cell.dataset.ds260PlaceholderHidden
      delete cell.dataset.ds260HiddenHtml
    })
  })
}

function updateDS260PlaceholderToggleButton(button, hidden) {
  button.textContent = hidden ? '+' : '-'
  button.title = hidden ? 'Hien lai placeholder cua muc nay' : 'An placeholder cua muc nay'
  button.setAttribute('aria-label', button.title)
}

function normalizeDS260HiddenPlaceholderState(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => !!enabled)
      .map(([key]) => String(key).trim())
      .filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getDS260HiddenPlaceholderSections(data = props.customerData || {}) {
  const raw = changes.value[DS260_PLACEHOLDER_STATE_KEY] ??
    data?._fillerChanges?.[DS260_PLACEHOLDER_STATE_KEY] ??
    data?.fillerChanges?.[DS260_PLACEHOLDER_STATE_KEY] ??
    data?.filler_changes?.[DS260_PLACEHOLDER_STATE_KEY]

  return normalizeDS260HiddenPlaceholderState(raw)
}

function persistDS260HiddenPlaceholderState() {
  if (props.mode !== 'create') return

  const hiddenSections = []
  getChecklistTable()?.querySelectorAll('.ds260-placeholder-toggle').forEach(button => {
    const numberCell = button.closest('td, th')
    if (numberCell?.dataset.ds260PlaceholdersHidden !== 'true') return

    const sectionNumber = getDS260SectionNumber(numberCell.closest('tr'))
    if (sectionNumber && !hiddenSections.includes(sectionNumber)) hiddenSections.push(sectionNumber)
  })

  if (hiddenSections.length) changes.value[DS260_PLACEHOLDER_STATE_KEY] = hiddenSections
  else delete changes.value[DS260_PLACEHOLDER_STATE_KEY]
  emit('change', { ...changes.value })
}

function applyDS260HiddenPlaceholderState(data = props.customerData || {}) {
  const hiddenSections = new Set(getDS260HiddenPlaceholderSections(data))
  if (!hiddenSections.size) return

  getChecklistRows().forEach(row => {
    const sectionNumber = getDS260SectionNumber(row)
    if (!sectionNumber || !hiddenSections.has(sectionNumber)) return

    const numberCell = getDS260SectionNumberCell(row)
    const button = numberCell?.querySelector('.ds260-placeholder-toggle')
    setDS260SectionPlaceholdersHidden(row, true)
    if (numberCell) numberCell.dataset.ds260PlaceholdersHidden = 'true'
    if (button) updateDS260PlaceholderToggleButton(button, true)
  })
}

function createDS260PlaceholderToggleButton(startRow, numberCell) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-placeholder-toggle'
  button.style.cssText = [
    'display:block',
    'width:18px',
    'height:18px',
    'line-height:14px',
    'margin:4px auto 0',
    'padding:0',
    'border:1px solid #64748b',
    'border-radius:3px',
    'background:#f8fafc',
    'color:#0f172a',
    'font-size:14px',
    'font-weight:700',
    'font-family:Arial,sans-serif',
    'text-align:center',
    'cursor:pointer'
  ].join(';')
  updateDS260PlaceholderToggleButton(button, false)

  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const hidden = numberCell.dataset.ds260PlaceholdersHidden !== 'true'
    setDS260SectionPlaceholdersHidden(startRow, hidden)
    numberCell.dataset.ds260PlaceholdersHidden = hidden ? 'true' : 'false'
    updateDS260PlaceholderToggleButton(button, hidden)
    persistDS260HiddenPlaceholderState()
  })

  return button
}

function injectDS260PlaceholderToggles() {
  const rows = getChecklistRows()
  let currentNumber = ''

  rows.forEach(row => {
    if (isFullWidthSectionHeader(row)) {
      currentNumber = ''
      return
    }

    const numberCell = getDS260SectionNumberCell(row)
    const sectionNumber = getDS260SectionNumber(row)
    if (!numberCell || !sectionNumber) return
    if (sectionNumber === currentNumber) {
      collapseDS260DuplicateSectionNumberCell(numberCell, sectionNumber)
      return
    }

    currentNumber = sectionNumber
    if (numberCell.querySelector('.ds260-placeholder-toggle')) return

    numberCell.style.textAlign = 'center'
    numberCell.appendChild(createDS260PlaceholderToggleButton(row, numberCell))
  })

  applyDS260HiddenPlaceholderState()
}

function getRecords(value) {
  if (Array.isArray(value)) {
    return value.filter(item => item && typeof item === 'object' && Object.values(item).some(v => String(v || '').trim() !== ''))
  }
  if (value && typeof value === 'object' && Object.values(value).some(v => String(v || '').trim() !== '')) return [value]
  return []
}

function firstTextValue(...values) {
  return values.find(value => String(value ?? '').trim() !== '') || ''
}

function getPeriodStartDate(item = {}) {
  return firstTextValue(item.dateFrom, item.fromDate, item.startDate, item.from, item.ngayBatDau, item.tuNgay)
}

function getPeriodEndDate(item = {}) {
  return firstTextValue(item.dateTo, item.toDate, item.endDate, item.to, item.ngayKetThuc, item.denNgay)
}

function getOldAddressDataCount(data = {}) {
  return getRecords(data?.residenceHistory)
    .filter(item => getPeriodStartDate(item) && getPeriodEndDate(item))
    .length
}

function splitTextList(value) {
  if (Array.isArray(value)) return value.filter(item => String(item || '').trim() !== '')
  return String(value || '')
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function getAdditionalPhoneDataCount(data = {}) {
  return splitTextList(data?.previousPhones).length
}

function getPreviousEmailDataCount(data = {}) {
  return splitTextList(data?.previousEmails).length
}

function getListDataCount(value) {
  if (Array.isArray(value)) return value.filter(item => String(item || '').trim() !== '').length
  if (value && typeof value === 'object') return Object.values(value).some(item => String(item || '').trim() !== '') ? 1 : 0
  return splitTextList(value).length
}

function getSocialDataCount(data = {}) {
  return getListDataCount(data?.listSocialNetworks)
}

function getOtherSocialDataCount(data = {}) {
  const candidates = [
    data?.otherSocialNetworks,
    data?.otherSocialMediaAccounts,
    data?.otherSocialMediaList,
    data?.listOtherSocialNetworks,
    data?.otherSocials,
    data?.otherSocialMediaDetails,
    data?.otherSocialMediaEntries
  ]

  return candidates.reduce((max, value) => Math.max(max, getListDataCount(value)), 0)
}

function getOtherPassportDataCount(data = {}) {
  return getRecords(data?.otherPassports15YearsList)
    .filter(item => firstTextValue(item?.issuingCountry, item?.country, item?.countryName, item?.passportNumber, item?.number))
    .length
}

function getTravelCountryDataCount(data = {}) {
  const value = data?.countriesVisited5YearsList
  if (Array.isArray(value)) {
    return value.filter(item => {
      if (item && typeof item === 'object') return firstTextValue(item.countryName, item.name, item.country)
      return String(item || '').trim() !== ''
    }).length
  }

  return splitTextList(value).length
}

function getPreviousWorkDataCount(data = {}) {
  return getRecords(data?.previousJobs).length
}

function getPreviousSpouseDataCount(data = {}) {
  const listCount = Math.max(
    getRecords(data?.previousSpouses).length,
    getRecords(data?.previousSpousesList).length,
    getRecords(data?.honNhanCu).length,
    getRecords(data?.previousMarriages).length,
    getRecords(data?.previousMarriagesList).length
  )
  if (listCount) return listCount

  if (firstTextValue(data?.previousSpouseLastName, data?.previousSpouseFirstName, data?.previousSpouseBirthDate)) return 1

  const marriageCount = parseInt(String(data?.marriageCount ?? data?.numberOfMarriages ?? '').replace(/\D+/g, ''), 10)
  return Number.isFinite(marriageCount) && marriageCount > 1 ? marriageCount - 1 : 0
}

function getStructuredListCount(value) {
  if (Array.isArray(value)) return value.filter(item => String(item || '').trim() !== '').length
  if (value && typeof value === 'object') return Object.values(value).some(item => String(item || '').trim() !== '') ? 1 : 0

  const text = String(value || '').trim()
  if (!text) return 0

  try {
    const parsed = JSON.parse(text)
    return getStructuredListCount(parsed)
  } catch {
    return 0
  }
}

function parseChildCountValue(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const count = parseInt(text.replace(/\D+/g, ''), 10)
  return Number.isFinite(count) ? Math.max(0, count) : null
}

function getExplicitChildCount(data = {}) {
  return parseChildCountValue(
    data?.numberOfChildren ??
    data?.childrenCount ??
    data?.childCount ??
    data?.soCon ??
    data?.number_children
  )
}

function getChildListDataCount(data = {}) {
  const parsedChildren = parseDS260ChildrenFromData(data)
  if (parsedChildren.length) return parsedChildren.length

  return Math.max(
    getStructuredListCount(data?.children),
    getStructuredListCount(data?.childrenList)
  )
}

function getChildDataCount(data = {}) {
  return getChildListDataCount(data) || getExplicitChildCount(data) || 0
}

function isFullWidthSectionHeader(row) {
  const visibleCells = Array.from(row?.children || []).filter(cell => cell.style.display !== 'none')
  if (visibleCells.length !== 1) return false

  const colspan = parseInt(visibleCells[0].getAttribute('colspan'), 10) || 1
  return colspan >= 24 && !!normalizeLabel(visibleCells[0].textContent)
}

function getOldAddressSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, OLD_ADDRESS_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getOldAddressSectionRows() {
  const { rows, startIndex, endIndex } = getOldAddressSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function getOldAddressRowsByIndex(repeatIndex) {
  return getOldAddressSectionRows().filter(row => isOldAddressRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function isOldAddressRepeatRow(row) {
  return OLD_ADDRESS_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getRenderedOldAddressMaxIndex() {
  return getOldAddressSectionRows().reduce((max, row) => {
    if (!isOldAddressRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, OLD_ADDRESS_MIN_COUNT)
}

function getStoredOldAddressMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_old_address_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredOldAddressCount(data = {}) {
  return Math.max(OLD_ADDRESS_MIN_COUNT, getOldAddressDataCount(data), getStoredOldAddressMaxIndex(data))
}

function getOldAddressFieldKey(row) {
  const field = OLD_ADDRESS_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function getOldAddressCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (totalCells <= 1) return `${prefix}_ds260_old_address_${repeatIndex}_${fieldKey}`

  const suffix = cellIndex === 0 ? 'month' : 'year'
  return `${prefix}_ds260_old_address_${repeatIndex}_${fieldKey}_${suffix}`
}

function resetClonedEditableCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix) {
  cell.dataset.cellId = getOldAddressCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareOldAddressRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = OLD_ADDRESS_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(OLD_ADDRESS_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  const fieldKey = getOldAddressFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetClonedEditableCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data')
  })

  noteCells.forEach((cell, index) => {
    resetClonedEditableCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note')
  })
}

function appendOldAddressBlock(repeatIndex) {
  if (repeatIndex <= OLD_ADDRESS_TEMPLATE_INDEX || getOldAddressRowsByIndex(repeatIndex).length) return false

  const templateRows = getOldAddressRowsByIndex(OLD_ADDRESS_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getOldAddressSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareOldAddressRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicOldAddressRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${OLD_ADDRESS_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupOldAddressAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, OLD_ADDRESS_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm địa chỉ cũ'
  button.setAttribute('aria-label', 'Thêm địa chỉ cũ')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendOldAddressBlock(getRenderedOldAddressMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncOldAddressRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicOldAddressRows()

  const requiredCount = getRequiredOldAddressCount(data)
  for (let index = OLD_ADDRESS_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendOldAddressBlock(index)
  }

  setupOldAddressAddButton()
}

function getAdditionalPhoneSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, PHONE_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getAdditionalPhoneSectionRows() {
  const { rows, startIndex, endIndex } = getAdditionalPhoneSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isAdditionalPhoneRepeatRow(row) {
  return rowMatchesLabel(row, PHONE_REPEAT_LABEL) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getAdditionalPhoneRowsByIndex(repeatIndex) {
  return getAdditionalPhoneSectionRows().filter(row => isAdditionalPhoneRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedAdditionalPhoneMaxIndex() {
  return getAdditionalPhoneSectionRows().reduce((max, row) => {
    if (!isAdditionalPhoneRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, PHONE_MIN_COUNT)
}

function getStoredAdditionalPhoneMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_additional_phone_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredAdditionalPhoneCount(data = {}) {
  return Math.max(PHONE_MIN_COUNT, getAdditionalPhoneDataCount(data), getStoredAdditionalPhoneMaxIndex(data))
}

function resetAdditionalPhoneCell(cell, repeatIndex, prefix) {
  cell.dataset.cellId = `${prefix}_ds260_additional_phone_${repeatIndex}_number`
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareAdditionalPhoneRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = PHONE_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(PHONE_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  getDataCells(row).forEach(cell => resetAdditionalPhoneCell(cell, repeatIndex, 'data'))
  Array.from(row.querySelectorAll('.note-cell'))
    .filter(cell => cell.style.display !== 'none')
    .forEach(cell => resetAdditionalPhoneCell(cell, repeatIndex, 'note'))
}

function appendAdditionalPhoneRow(repeatIndex) {
  if (repeatIndex <= PHONE_TEMPLATE_INDEX || getAdditionalPhoneRowsByIndex(repeatIndex).length) return false

  const templateRows = getAdditionalPhoneRowsByIndex(PHONE_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getAdditionalPhoneSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  const row = templateRows[0].cloneNode(true)
  prepareAdditionalPhoneRepeatRow(row, repeatIndex)
  tbody.insertBefore(row, insertBeforeRow)
  return true
}

function removeDynamicAdditionalPhoneRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${PHONE_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupAdditionalPhoneAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, PHONE_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm số điện thoại cũ'
  button.setAttribute('aria-label', 'Thêm số điện thoại cũ')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendAdditionalPhoneRow(getRenderedAdditionalPhoneMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncAdditionalPhoneRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicAdditionalPhoneRows()

  const requiredCount = getRequiredAdditionalPhoneCount(data)
  for (let index = PHONE_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendAdditionalPhoneRow(index)
  }

  setupAdditionalPhoneAddButton()
}

function getPreviousEmailSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, EMAIL_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getPreviousEmailSectionRows() {
  const { rows, startIndex, endIndex } = getPreviousEmailSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isPreviousEmailRepeatRow(row) {
  return rowMatchesLabel(row, EMAIL_REPEAT_LABEL) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getPreviousEmailRowsByIndex(repeatIndex) {
  return getPreviousEmailSectionRows().filter(row => isPreviousEmailRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedPreviousEmailMaxIndex() {
  return getPreviousEmailSectionRows().reduce((max, row) => {
    if (!isPreviousEmailRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, EMAIL_MIN_COUNT)
}

function getStoredPreviousEmailMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_previous_email_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredPreviousEmailCount(data = {}) {
  return Math.max(EMAIL_MIN_COUNT, getPreviousEmailDataCount(data), getStoredPreviousEmailMaxIndex(data))
}

function resetPreviousEmailCell(cell, repeatIndex, prefix) {
  cell.dataset.cellId = `${prefix}_ds260_previous_email_${repeatIndex}_address`
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function preparePreviousEmailRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = EMAIL_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(EMAIL_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  getDataCells(row).forEach(cell => resetPreviousEmailCell(cell, repeatIndex, 'data'))
  Array.from(row.querySelectorAll('.note-cell'))
    .filter(cell => cell.style.display !== 'none')
    .forEach(cell => resetPreviousEmailCell(cell, repeatIndex, 'note'))
}

function appendPreviousEmailRow(repeatIndex) {
  if (repeatIndex <= EMAIL_TEMPLATE_INDEX || getPreviousEmailRowsByIndex(repeatIndex).length) return false

  const templateRows = getPreviousEmailRowsByIndex(EMAIL_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getPreviousEmailSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  const row = templateRows[0].cloneNode(true)
  preparePreviousEmailRepeatRow(row, repeatIndex)
  tbody.insertBefore(row, insertBeforeRow)
  return true
}

function removeDynamicPreviousEmailRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${EMAIL_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupPreviousEmailAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, EMAIL_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm email cũ'
  button.setAttribute('aria-label', 'Thêm email cũ')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendPreviousEmailRow(getRenderedPreviousEmailMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncPreviousEmailRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicPreviousEmailRows()

  const requiredCount = getRequiredPreviousEmailCount(data)
  for (let index = EMAIL_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendPreviousEmailRow(index)
  }

  setupPreviousEmailAddButton()
}

function getSocialSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, SOCIAL_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getSocialSectionRows() {
  const { rows, startIndex, endIndex } = getSocialSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function getOtherSocialRowIndex(rows = getSocialSectionRows()) {
  return rows.findIndex(row => rowMatchesLabel(row, OTHER_SOCIAL_ANCHOR))
}

function getStandardSocialSectionRows() {
  const rows = getSocialSectionRows()
  const otherIndex = getOtherSocialRowIndex(rows)
  return otherIndex === -1 ? rows : rows.slice(0, otherIndex)
}

function getOtherSocialSectionRows() {
  const rows = getSocialSectionRows()
  const otherIndex = getOtherSocialRowIndex(rows)
  return otherIndex === -1 ? [] : rows.slice(otherIndex + 1)
}

function getSocialRowField(row) {
  if (rowMatchesLabel(row, SOCIAL_PROVIDER_LABEL)) return 'provider'
  if (rowMatchesLabel(row, SOCIAL_IDENTIFIER_LABEL)) return 'identifier'
  return ''
}

function isStandardSocialRepeatRow(row) {
  return rowMatchesLabel(row, SOCIAL_PROVIDER_LABEL) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getStandardSocialTemplateRows() {
  const rows = getStandardSocialSectionRows()
  const providerIndex = rows.findIndex(row => rowMatchesLabel(row, SOCIAL_PROVIDER_LABEL) && rowMatchesRepeatIndex(row, SOCIAL_TEMPLATE_INDEX))
  if (providerIndex === -1) return []

  const identifierIndex = rows.findIndex((row, index) => index > providerIndex && rowMatchesLabel(row, SOCIAL_IDENTIFIER_LABEL))
  if (identifierIndex === -1) return []

  return [rows[providerIndex], rows[identifierIndex]]
}

function getRenderedStandardSocialMaxIndex() {
  return getStandardSocialSectionRows().reduce((max, row) => {
    if (!isStandardSocialRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, SOCIAL_MIN_COUNT)
}

function getStoredStandardSocialMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_social_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredStandardSocialCount(data = {}) {
  return Math.max(SOCIAL_MIN_COUNT, getSocialDataCount(data), getStoredStandardSocialMaxIndex(data))
}

function resetSocialCell(cell, repeatSection, repeatIndex, fieldKey, prefix) {
  cell.dataset.cellId = `${prefix}_ds260_${repeatSection}_${repeatIndex}_${fieldKey}`
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareStandardSocialRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = SOCIAL_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(SOCIAL_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  const fieldKey = getSocialRowField(row)
  getDataCells(row).forEach(cell => resetSocialCell(cell, 'social', repeatIndex, fieldKey, 'data'))
  Array.from(row.querySelectorAll('.note-cell'))
    .filter(cell => cell.style.display !== 'none')
    .forEach(cell => resetSocialCell(cell, 'social', repeatIndex, fieldKey, 'note'))
}

function appendStandardSocialPair(repeatIndex) {
  if (repeatIndex <= SOCIAL_TEMPLATE_INDEX) return false
  if (getStandardSocialSectionRows().some(row => isStandardSocialRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))) return false

  const templateRows = getStandardSocialTemplateRows()
  if (templateRows.length < 2) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const rows = getSocialSectionRows()
  const otherIndex = getOtherSocialRowIndex(rows)
  const insertBeforeRow = otherIndex === -1 ? rows[rows.length - 1]?.nextSibling || null : rows[otherIndex]
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareStandardSocialRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function isOtherSocialRepeatRow(row) {
  return (rowMatchesLabel(row, SOCIAL_PROVIDER_LABEL) || rowMatchesLabel(row, SOCIAL_IDENTIFIER_LABEL)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getOtherSocialRowsByIndex(repeatIndex) {
  return getOtherSocialSectionRows().filter(row => isOtherSocialRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedOtherSocialMaxIndex() {
  return getOtherSocialSectionRows().reduce((max, row) => {
    if (!isOtherSocialRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, OTHER_SOCIAL_MIN_COUNT)
}

function getStoredOtherSocialMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_other_social_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredOtherSocialCount(data = {}) {
  return Math.max(OTHER_SOCIAL_MIN_COUNT, getOtherSocialDataCount(data), getStoredOtherSocialMaxIndex(data))
}

function prepareOtherSocialRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = OTHER_SOCIAL_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(OTHER_SOCIAL_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    } else if (rowMatchesLabel(row, SOCIAL_IDENTIFIER_LABEL)) {
      cell.innerHTML = cell.innerHTML.replace(/\(\s*2\s*\)/g, `(${repeatIndex})`)
    }
  })

  const fieldKey = getSocialRowField(row)
  getDataCells(row).forEach(cell => resetSocialCell(cell, 'other_social', repeatIndex, fieldKey, 'data'))
  Array.from(row.querySelectorAll('.note-cell'))
    .filter(cell => cell.style.display !== 'none')
    .forEach(cell => resetSocialCell(cell, 'other_social', repeatIndex, fieldKey, 'note'))
}

function appendOtherSocialPair(repeatIndex) {
  if (repeatIndex <= OTHER_SOCIAL_TEMPLATE_INDEX || getOtherSocialRowsByIndex(repeatIndex).length) return false

  const templateRows = getOtherSocialRowsByIndex(OTHER_SOCIAL_TEMPLATE_INDEX)
  if (templateRows.length < 2) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getSocialSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareOtherSocialRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicSocialRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${SOCIAL_REPEAT_SECTION}"], tr[data-ds260-repeat-section="${OTHER_SOCIAL_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupSocialAddButtons() {
  if (!paperRef.value) return

  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, SOCIAL_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (headerCell) {
    const existing = headerCell.querySelector('.ds260-add-row-button')
    if (props.mode === 'view') {
      existing?.remove()
    } else if (!existing) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'ds260-add-row-button'
      button.textContent = '+'
      button.title = 'Thêm mạng xã hội'
      button.setAttribute('aria-label', 'Thêm mạng xã hội')
      button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
      button.addEventListener('click', () => {
        appendStandardSocialPair(getRenderedStandardSocialMaxIndex() + 1)
        updateCorrectionCountDisplay()
      })
      headerCell.appendChild(button)
    }
  }

  const otherSocialRow = getSocialSectionRows().find(row => rowMatchesLabel(row, OTHER_SOCIAL_ANCHOR))
  const otherSocialCell = getNonInputLabelCells(otherSocialRow).find(cell => labelMatches(cell.textContent, OTHER_SOCIAL_ANCHOR))
  if (!otherSocialCell) return

  const existingOther = otherSocialCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existingOther?.remove()
    return
  }

  if (existingOther) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm other social media'
  button.setAttribute('aria-label', 'Thêm other social media')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendOtherSocialPair(getRenderedOtherSocialMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  otherSocialCell.appendChild(button)
}

function syncSocialRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicSocialRows()

  const requiredSocialCount = getRequiredStandardSocialCount(data)
  for (let index = SOCIAL_TEMPLATE_INDEX + 1; index <= requiredSocialCount; index += 1) {
    appendStandardSocialPair(index)
  }

  const requiredOtherSocialCount = getRequiredOtherSocialCount(data)
  for (let index = OTHER_SOCIAL_TEMPLATE_INDEX + 1; index <= requiredOtherSocialCount; index += 1) {
    appendOtherSocialPair(index)
  }

  setupSocialAddButtons()
}

// ── Hộ chiếu khác trong 15 năm qua ────────────────────────────────────────────
// Khối nằm giữa dòng câu hỏi và tiêu đề mục kế tiếp (ĐỊA CHỈ HIỆN TẠI). Nhờ chặn biên như vậy mà
// dòng "Passport Number" của mục hộ chiếu quốc tịch khác (nằm TRƯỚC câu hỏi) không bị nhận nhầm.
function getOtherPassportSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, OTHER_PASSPORT_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getOtherPassportSectionRows() {
  const { rows, startIndex, endIndex } = getOtherPassportSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isOtherPassportRepeatRow(row) {
  return OTHER_PASSPORT_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getOtherPassportRowsByIndex(repeatIndex) {
  return getOtherPassportSectionRows().filter(row => isOtherPassportRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedOtherPassportMaxIndex() {
  return getOtherPassportSectionRows().reduce((max, row) => {
    if (!isOtherPassportRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, OTHER_PASSPORT_MIN_COUNT)
}

function getStoredOtherPassportMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_other_passport_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredOtherPassportCount(data = {}) {
  return Math.max(OTHER_PASSPORT_MIN_COUNT, getOtherPassportDataCount(data), getStoredOtherPassportMaxIndex(data))
}

function getOtherPassportFieldKey(row) {
  const field = OTHER_PASSPORT_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function resetOtherPassportCell(cell, repeatIndex, fieldKey, prefix) {
  cell.dataset.cellId = `${prefix}_ds260_other_passport_${repeatIndex}_${fieldKey}`
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareOtherPassportRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = OTHER_PASSPORT_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(OTHER_PASSPORT_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  const fieldKey = getOtherPassportFieldKey(row)
  getDataCells(row).forEach(cell => resetOtherPassportCell(cell, repeatIndex, fieldKey, 'data'))
  Array.from(row.querySelectorAll('.note-cell'))
    .filter(cell => cell.style.display !== 'none')
    .forEach(cell => resetOtherPassportCell(cell, repeatIndex, fieldKey, 'note'))
}

function appendOtherPassportBlock(repeatIndex) {
  if (repeatIndex <= OTHER_PASSPORT_TEMPLATE_INDEX || getOtherPassportRowsByIndex(repeatIndex).length) return false

  const templateRows = getOtherPassportRowsByIndex(OTHER_PASSPORT_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getOtherPassportSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareOtherPassportRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicOtherPassportRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${OTHER_PASSPORT_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupOtherPassportAddButton() {
  if (!paperRef.value) return
  const questionRow = getChecklistRows().find(row => rowMatchesLabel(row, OTHER_PASSPORT_ANCHOR))
  // Ô đầu dòng chỉ rộng 4% nên gắn nút vào ô nội dung câu hỏi cho dễ bấm.
  const headerCell = getNonInputLabelCells(questionRow)[0] || questionRow?.children?.[1]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm hộ chiếu khác'
  button.setAttribute('aria-label', 'Thêm hộ chiếu khác')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendOtherPassportBlock(getRenderedOtherPassportMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncOtherPassportRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicOtherPassportRows()

  const requiredCount = getRequiredOtherPassportCount(data)
  for (let index = OTHER_PASSPORT_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendOtherPassportBlock(index)
  }

  setupOtherPassportAddButton()
}

function getTravelSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, TRAVEL_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getTravelSectionRows() {
  const { rows, startIndex, endIndex } = getTravelSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

// Bản Word VER02 đổi mục du lịch từ một dòng tên quốc gia thành khối 5 dòng
// (quốc gia / thành phố / ngày đến / thời gian ở / người chi trả).
function isTravelRepeatRow(row) {
  return TRAVEL_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getTravelRowsByIndex(repeatIndex) {
  return getTravelSectionRows().filter(row => isTravelRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedTravelMaxIndex() {
  return getTravelSectionRows().reduce((max, row) => {
    if (!isTravelRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, TRAVEL_MIN_COUNT)
}

function getStoredTravelMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_foreign_travel_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredTravelCount(data = {}) {
  return Math.max(TRAVEL_MIN_COUNT, getTravelCountryDataCount(data), getStoredTravelMaxIndex(data))
}

function getTravelFieldKey(row) {
  const field = TRAVEL_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

// Giữ nguyên hậu tố "country" của bản cũ để các sửa đã lưu của khối (3)(4)... không mất.
function getRepeatCellId(prefix, section, repeatIndex, fieldKey, cellIndex, totalCells) {
  const base = `${prefix}_ds260_${section}_${repeatIndex}_${fieldKey}`
  if (totalCells <= 1) return base
  if (totalCells === 3) return `${base}_${['day', 'month', 'year'][cellIndex] || cellIndex + 1}`
  if (totalCells === 2) return `${base}_${['value', 'unit'][cellIndex] || cellIndex + 1}`
  return `${base}_${cellIndex + 1}`
}

function resetRepeatSectionCell(cell, cellId) {
  cell.dataset.cellId = cellId
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareTravelRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = TRAVEL_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(TRAVEL_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  const fieldKey = getTravelFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetRepeatSectionCell(cell, getRepeatCellId('data', 'foreign_travel', repeatIndex, fieldKey, index, dataCells.length))
  })
  noteCells.forEach((cell, index) => {
    resetRepeatSectionCell(cell, getRepeatCellId('note', 'foreign_travel', repeatIndex, fieldKey, index, noteCells.length))
  })
}

function appendTravelBlock(repeatIndex) {
  if (repeatIndex <= TRAVEL_TEMPLATE_INDEX || getTravelRowsByIndex(repeatIndex).length) return false

  const templateRows = getTravelRowsByIndex(TRAVEL_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getTravelSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareTravelRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicTravelRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${TRAVEL_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupTravelAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, TRAVEL_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm quốc gia đã du lịch'
  button.setAttribute('aria-label', 'Thêm quốc gia đã du lịch')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendTravelBlock(getRenderedTravelMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncTravelRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicTravelRows()

  const requiredCount = getRequiredTravelCount(data)
  for (let index = TRAVEL_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendTravelBlock(index)
  }

  setupTravelAddButton()
}

// ── THÔNG TIN ANH CHỊ EM (mục mới của bản Word VER02) ────────────────────────
function getSiblingsDataCount(data = {}) {
  return getRecords(data?.siblingsList)
    .filter(item => firstTextValue(item?.lastName, item?.firstName, item?.middleName, item?.fullName, item?.name))
    .length
}

function getSiblingsSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, SIBLINGS_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getSiblingsSectionRows() {
  const { rows, startIndex, endIndex } = getSiblingsSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isSiblingsRepeatRow(row) {
  return SIBLINGS_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getSiblingsRowsByIndex(repeatIndex) {
  return getSiblingsSectionRows().filter(row => isSiblingsRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getRenderedSiblingsMaxIndex() {
  return getSiblingsSectionRows().reduce((max, row) => {
    if (!isSiblingsRepeatRow(row)) return max

    const found = getVisibleNonInputCells(row)
      .map(cell => parseInt(normalizeLabel(cell.textContent), 10))
      .filter(value => Number.isFinite(value) && value > 0)
    return Math.max(max, ...found)
  }, SIBLINGS_MIN_COUNT)
}

function getStoredSiblingsMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_siblings_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredSiblingsCount(data = {}) {
  return Math.max(SIBLINGS_MIN_COUNT, getSiblingsDataCount(data), getStoredSiblingsMaxIndex(data))
}

function getSiblingsFieldKey(row) {
  const field = SIBLINGS_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function prepareSiblingsRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = SIBLINGS_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(SIBLINGS_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
    }
  })

  const fieldKey = getSiblingsFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetRepeatSectionCell(cell, getRepeatCellId('data', 'siblings', repeatIndex, fieldKey, index, dataCells.length))
  })
  noteCells.forEach((cell, index) => {
    resetRepeatSectionCell(cell, getRepeatCellId('note', 'siblings', repeatIndex, fieldKey, index, noteCells.length))
  })
}

function appendSiblingsBlock(repeatIndex) {
  if (repeatIndex <= SIBLINGS_TEMPLATE_INDEX || getSiblingsRowsByIndex(repeatIndex).length) return false

  const templateRows = getSiblingsRowsByIndex(SIBLINGS_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getSiblingsSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    prepareSiblingsRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicSiblingsRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${SIBLINGS_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupSiblingsAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, SIBLINGS_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm anh chị em'
  button.setAttribute('aria-label', 'Thêm anh chị em')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendSiblingsBlock(getRenderedSiblingsMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncSiblingsRows(data = {}) {
  if (!paperRef.value) return
  removeDynamicSiblingsRows()

  const requiredCount = getRequiredSiblingsCount(data)
  for (let index = SIBLINGS_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendSiblingsBlock(index)
  }

  setupSiblingsAddButton()
}


function getPreviousWorkSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, PREVIOUS_WORK_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getPreviousWorkSectionRows() {
  const { rows, startIndex, endIndex } = getPreviousWorkSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isPreviousWorkRepeatRow(row) {
  return PREVIOUS_WORK_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

// Số thứ tự khối LẤY TỪ dataset chứ không lấy từ chữ "(N)" đang hiển thị: reorderPreviousWorkRows()
// đánh số lại phần hiển thị theo ngày nhưng KHÔNG đổi cellId, nên nếu tra khối bằng chữ hiển thị thì
// sau một lần sắp xếp, khối data_ds260_previous_work_3_* có thể bị nhận nhầm là khối 1 (hoặc không
// dựng lại được) -> mất dữ liệu người dùng đã nhập.
function getPreviousWorkRepeatIndexFromRow(row) {
  const stamped = parseInt(row?.dataset?.ds260RepeatIndex || '', 10)
  if (Number.isFinite(stamped) && stamped > 0) return stamped

  const shown = parseInt(normalizeLabel(getPreviousWorkBlockNumberCell(row)?.textContent), 10)
  return Number.isFinite(shown) && shown > 0 ? shown : 0
}

// Đóng dấu số thứ tự gốc cho 2 khối (1)(2) có sẵn trong HTML. Chỉ đóng dấu khi dòng chưa có dataset,
// và lần chạy đầu tiên diễn ra ngay sau initInteractiveTable() - lúc đó bảng còn nguyên bản nên chữ
// "(1)"/"(2)" chắc chắn đúng.
function stampPreviousWorkBaseRows() {
  getPreviousWorkSectionRows().forEach(row => {
    if (!isPreviousWorkRepeatRow(row) || row.dataset.ds260RepeatIndex) return
    const shown = parseInt(normalizeLabel(getPreviousWorkBlockNumberCell(row)?.textContent), 10)
    if (Number.isFinite(shown) && shown > 0) row.dataset.ds260RepeatIndex = String(shown)
  })
}

// Trả bảng về trạng thái chuẩn (thứ tự khối 1..N, chữ "(N)" khớp cellId) trước khi đổ dữ liệu.
// resetTable() không làm việc này, mà App.vue dùng lại đúng một instance WordPaper khi đổi hồ sơ,
// nên nếu không khôi phục thì thứ tự đã bị sắp xếp của hồ sơ trước sẽ dính sang hồ sơ sau.
function restorePreviousWorkBlockLayout() {
  const { rows, startIndex } = getPreviousWorkSectionBounds()
  if (startIndex < 0) return

  let insertAfter = rows[startIndex]
  if (!insertAfter || isPreviousWorkRepeatRow(insertAfter)) return

  const maxIndex = getRenderedPreviousWorkMaxIndex()
  for (let index = 1; index <= maxIndex; index += 1) {
    getPreviousWorkRowsByIndex(index).forEach(row => {
      const numberCell = getPreviousWorkBlockNumberCell(row)
      if (numberCell) numberCell.innerHTML = `(${index})`
      insertAfter.insertAdjacentElement('afterend', row)
      insertAfter = row
    })
  }
}

function getPreviousWorkRowsByIndex(repeatIndex) {
  const target = parseInt(repeatIndex, 10) || 0
  if (!target) return []
  return getPreviousWorkSectionRows()
    .filter(row => isPreviousWorkRepeatRow(row) && getPreviousWorkRepeatIndexFromRow(row) === target)
}

function getRenderedPreviousWorkMaxIndex() {
  return getPreviousWorkSectionRows().reduce((max, row) => {
    if (!isPreviousWorkRepeatRow(row)) return max
    return Math.max(max, getPreviousWorkRepeatIndexFromRow(row))
  }, PREVIOUS_WORK_MIN_COUNT)
}

function getStoredPreviousWorkMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_previous_work_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredPreviousWorkCount(data = {}) {
  return Math.max(PREVIOUS_WORK_MIN_COUNT, getPreviousWorkDataCount(data), getStoredPreviousWorkMaxIndex(data))
}

function getPreviousWorkFieldKey(row) {
  const field = PREVIOUS_WORK_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function getPreviousWorkCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (totalCells <= 1) return `${prefix}_ds260_previous_work_${repeatIndex}_${fieldKey}`
  const suffixes = totalCells === 3 ? ['day', 'month', 'year'] : totalCells === 2 ? ['month', 'year'] : []
  const suffix = suffixes[cellIndex] || `part_${cellIndex + 1}`
  return `${prefix}_ds260_previous_work_${repeatIndex}_${fieldKey}_${suffix}`
}

function resetPreviousWorkCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix) {
  cell.dataset.cellId = getPreviousWorkCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)
  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function preparePreviousWorkRepeatRow(row, repeatIndex) {
  row.dataset.ds260RepeatSection = PREVIOUS_WORK_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  // Không so khớp với chữ "(2)" nữa: dòng mẫu có thể đang hiển thị số khác sau một lần sắp xếp.
  const numberCell = getPreviousWorkBlockNumberCell(row)
  if (numberCell) numberCell.innerHTML = `(${repeatIndex})`

  const fieldKey = getPreviousWorkFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetPreviousWorkCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data')
  })

  noteCells.forEach((cell, index) => {
    resetPreviousWorkCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note')
  })
}

function appendPreviousWorkBlock(repeatIndex) {
  if (repeatIndex <= PREVIOUS_WORK_TEMPLATE_INDEX || getPreviousWorkRowsByIndex(repeatIndex).length) return false

  const templateRows = getPreviousWorkRowsByIndex(PREVIOUS_WORK_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getPreviousWorkSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    preparePreviousWorkRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicPreviousWorkRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${PREVIOUS_WORK_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function setupPreviousWorkAddButton() {
  if (!paperRef.value) return
  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, PREVIOUS_WORK_ANCHOR))
  const headerCell = headerRow?.children?.[0]
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-add-row-button')
  if (props.mode === 'view') {
    existing?.remove()
    return
  }

  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds260-add-row-button'
  button.textContent = '+'
  button.title = 'Thêm công việc trước đây'
  button.setAttribute('aria-label', 'Thêm công việc trước đây')
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', () => {
    appendPreviousWorkBlock(getRenderedPreviousWorkMaxIndex() + 1)
    updateCorrectionCountDisplay()
  })
  headerCell.appendChild(button)
}

function syncPreviousWorkRows(data = {}) {
  if (!paperRef.value) return
  stampPreviousWorkBaseRows()
  removeDynamicPreviousWorkRows()
  restorePreviousWorkBlockLayout()

  const requiredCount = getRequiredPreviousWorkCount(data)
  for (let index = PREVIOUS_WORK_TEMPLATE_INDEX + 1; index <= requiredCount; index += 1) {
    appendPreviousWorkBlock(index)
  }

  setupPreviousWorkAddButton()
}

// ── Tự sắp xếp lại các khối "CÔNG VIỆC TRƯỚC ĐÂY" theo ngày (gần -> xa) khi nhân viên gõ tay
// ngày From/To. Khác với I-129F, nút "+" của mục này nằm ở dòng tiêu đề (colspan=26, ngoài phạm
// vi các dòng bị di chuyển) nên không có rủi ro nút bị "nuốt" khi đánh số lại - chỉ cần cập nhật
// lại chữ "(N)" hiển thị ở TỪNG dòng trong khối (form DS-260 lặp lại số thứ tự trên mọi dòng của
// khối, không chỉ dòng đầu, khác I-129F).
const PREVIOUS_WORK_MONTH_TOKENS = {
  JAN: 1, JANUARY: 1, FEB: 2, FEBRUARY: 2, MAR: 3, MARCH: 3, APR: 4, APRIL: 4,
  MAY: 5, JUN: 6, JUNE: 6, JUL: 7, JULY: 7, AUG: 8, AUGUST: 8, SEP: 9, SEPT: 9, SEPTEMBER: 9,
  OCT: 10, OCTOBER: 10, NOV: 11, NOVEMBER: 11, DEC: 12, DECEMBER: 12
}

function parsePreviousWorkMonthNumber(text) {
  const key = normalizeLabel(text).toUpperCase()
  if (PREVIOUS_WORK_MONTH_TOKENS[key]) return PREVIOUS_WORK_MONTH_TOKENS[key]
  const numeric = parseInt(key, 10)
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 12 ? numeric : 0
}

function getPreviousWorkDateRowScore(row) {
  if (!row) return -Infinity
  const cells = getDataCells(row)
  if (!cells.length) return -Infinity
  const yearText = cells.length >= 3 ? cells[2].textContent : cells[cells.length - 1].textContent
  const year = parseInt(normalizeLabel(yearText), 10)
  if (!Number.isFinite(year) || year <= 0) return -Infinity
  const day = cells.length >= 3 ? (parseInt(normalizeLabel(cells[0].textContent), 10) || 1) : 1
  const month = cells.length >= 2 ? (parsePreviousWorkMonthNumber(cells.length >= 3 ? cells[1].textContent : cells[0].textContent) || 1) : 1
  return year * 10000 + month * 100 + day
}

function collectPreviousWorkGroupsForSort() {
  const maxIndex = getRenderedPreviousWorkMaxIndex()
  const groups = []
  for (let index = 1; index <= maxIndex; index += 1) {
    const rows = getPreviousWorkRowsByIndex(index)
    if (rows.length) groups.push(rows)
  }
  return groups
}

function getPreviousWorkGroupSortKey(groupRows) {
  const fromRow = groupRows.find(row => getPreviousWorkFieldKey(row) === 'from')
  const toRow = groupRows.find(row => getPreviousWorkFieldKey(row) === 'to')
  const startScore = getPreviousWorkDateRowScore(fromRow)
  const rawEndScore = getPreviousWorkDateRowScore(toRow)
  const endScore = rawEndScore === -Infinity && startScore !== -Infinity ? Infinity : rawEndScore
  return {
    hasAny: startScore !== -Infinity || rawEndScore !== -Infinity,
    endScore,
    startScore
  }
}

function getPreviousWorkBlockNumberCell(row) {
  return getVisibleNonInputCells(row).find(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function reorderPreviousWorkRows() {
  // Giống hệt cách I-129F đang làm (reorderEmploymentGroups): di chuyển nguyên cả khối <tr>, nội
  // dung trong khối đi theo khối, không đụng vào cellId/changes.value của từng ô. customerData chỉ
  // được gán lại (kích hoạt dựng lại toàn bộ) khi mở/tải lại hồ sơ, KHÔNG xảy ra trong lúc đang gõ
  // - nên chỉ cần dời <tr> là đủ, không cần "hoán đổi nội dung" phức tạp như trước.
  if (!paperRef.value) return

  const bounds = getPreviousWorkSectionBounds()
  if (bounds.startIndex < 0) return

  const groups = collectPreviousWorkGroupsForSort()
  if (groups.length < 2) return

  const withKeys = groups.map((rows, index) => ({ rows, index, key: getPreviousWorkGroupSortKey(rows) }))
  withKeys.sort((a, b) => {
    if (a.key.hasAny !== b.key.hasAny) return a.key.hasAny ? -1 : 1
    if (!a.key.hasAny) return a.index - b.index
    if (b.key.endScore !== a.key.endScore) return b.key.endScore - a.key.endScore
    if (b.key.startScore !== a.key.startScore) return b.key.startScore - a.key.startScore
    return a.index - b.index
  })

  const sortedGroups = withKeys.map(item => item.rows)
  if (sortedGroups.every((rows, index) => rows === groups[index])) return

  let insertAfter = bounds.rows[bounds.startIndex]
  if (!insertAfter) return

  sortedGroups.forEach(groupRows => {
    groupRows.forEach(row => {
      insertAfter.insertAdjacentElement('afterend', row)
      insertAfter = row
    })
  })

  // CHỈ đổi chữ "(N)" hiển thị cho đúng thứ tự đang nhìn thấy. Tuyệt đối không đụng tới
  // dataset.ds260RepeatIndex hay cellId - đó mới là thứ neo dữ liệu đã lưu vào đúng khối.
  sortedGroups.forEach((groupRows, groupIndex) => {
    const newIndex = groupIndex + 1
    groupRows.forEach(row => {
      const numberCell = getPreviousWorkBlockNumberCell(row)
      if (numberCell) numberCell.textContent = `(${newIndex})`
    })
  })
}

function resortPreviousWorkRowsFromCell(cell) {
  if (props.mode !== 'create') return
  const row = cell?.closest?.('tr')
  if (!row) return
  // Không dựa vào cellId: 2 khối (1)/(2) có sẵn trong HTML gốc được initInteractiveTable() gán
  // cellId chung dạng "data_N" (không phải "data_ds260_previous_work_N_..."), nên phải nhận diện
  // đúng dòng "From"/"To" bằng CHÍNH nhãn của dòng, rồi xác nhận dòng đó thật sự nằm trong phạm vi
  // mục "CÔNG VIỆC TRƯỚC ĐÂY" (Education/Travel... cũng có nhãn "From"/"To" giống hệt).
  const fieldKey = getPreviousWorkFieldKey(row)
  if (fieldKey !== 'from' && fieldKey !== 'to') return
  if (!getPreviousWorkSectionRows().includes(row)) return
  // Chạy ở tick kế tiếp: việc di chuyển hẳn các <tr> ngay trong lúc blur đang xử lý dễ gây lỗi
  // focus/click trên trình duyệt thật (đã gặp vấn đề tương tự ở I-129F).
  setTimeout(() => reorderPreviousWorkRows(), 0)
}

function getPreviousSpouseSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, PREVIOUS_SPOUSE_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getPreviousSpouseSectionRows() {
  const { rows, startIndex, endIndex } = getPreviousSpouseSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isPreviousSpouseDetailRow(row) {
  return PREVIOUS_SPOUSE_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label))
}

function isPreviousSpouseRepeatRow(row) {
  return isPreviousSpouseDetailRow(row) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getPreviousSpouseBaseRows() {
  return getPreviousSpouseSectionRows().filter(row => {
    if (!isPreviousSpouseDetailRow(row)) return false
    if (row.dataset.ds260RepeatSection === PREVIOUS_SPOUSE_REPEAT_SECTION) return false
    return true
  })
}

function getPreviousSpouseRowsByIndex(repeatIndex) {
  return getPreviousSpouseSectionRows().filter(row => isPreviousSpouseRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getStoredPreviousSpouseMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_previous_spouse_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getPreviousSpouseNumberCell() {
  const row = getPreviousSpouseSectionRows().find(item => rowMatchesLabel(item, PREVIOUS_SPOUSE_COUNT_LABEL))
  return getDataCells(row)[0] || null
}

function parsePreviousSpouseNumberCell() {
  const cell = getPreviousSpouseNumberCell()
  const value = normalizeChangeCompareValue(cell?.dataset?.filledValue || cell?.innerHTML || '')
  const count = parseInt(value.replace(/\D+/g, ''), 10)
  return Number.isFinite(count) ? count : null
}

function getRequiredPreviousSpouseCount(data = {}, overrideCount = null) {
  if (Number.isFinite(overrideCount)) return Math.max(0, overrideCount)
  return Math.max(getPreviousSpouseDataCount(data), getStoredPreviousSpouseMaxIndex(data))
}

function getPreviousSpouseFieldKey(row) {
  const field = PREVIOUS_SPOUSE_FIELD_KEYS.find(item => rowMatchesLabel(row, item.label))
  return field?.key || 'field'
}

function getPreviousSpouseLabelCell(row) {
  return getNonInputLabelCells(row).find(cell => {
    const text = normalizeLabel(cell.textContent)
    return PREVIOUS_SPOUSE_FIELD_KEYS.some(item => labelMatches(text, item.label))
  })
}

function getPreviousSpouseNumberCellInRow(row) {
  const labelCell = getPreviousSpouseLabelCell(row)
  const candidateCells = Array.from(row?.children || []).filter(cell => {
    if (cell.classList.contains('data-cell') || cell.classList.contains('note-cell')) return false
    if (cell.style.display === 'none') return false
    if (cell === labelCell) return false
    return true
  })

  return candidateCells.find(cell => normalizeLabel(cell.textContent) === String(PREVIOUS_SPOUSE_BASE_COUNT)) ||
    candidateCells.find(cell => /^\d+$/.test(normalizeLabel(cell.textContent))) ||
    candidateCells.find(cell => !normalizeLabel(cell.textContent) && (parseInt(cell.getAttribute('colspan'), 10) || 1) >= 4) ||
    candidateCells.find(cell => !normalizeLabel(cell.textContent)) ||
    null
}

function setPreviousSpouseRowNumber(row, repeatIndex) {
  const numberCell = getPreviousSpouseNumberCellInRow(row)
  if (!numberCell) return

  numberCell.innerHTML = `(${repeatIndex})`
  numberCell.style.whiteSpace = 'nowrap'
  numberCell.style.textAlign = 'center'
}

function getPreviousSpouseCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (totalCells <= 1) return `${prefix}_ds260_previous_spouse_${repeatIndex}_${fieldKey}`
  const suffixes = totalCells === 3 ? ['day', 'month', 'year'] : totalCells === 2 ? ['month', 'year'] : []
  const suffix = suffixes[cellIndex] || `part_${cellIndex + 1}`
  return `${prefix}_ds260_previous_spouse_${repeatIndex}_${fieldKey}_${suffix}`
}

function resetPreviousSpouseCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix, preserveContent = false) {
  cell.dataset.cellId = getPreviousSpouseCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)

  // Khi bấm dấu +, các dòng hôn nhân cũ đã có data không được reset về placeholder.
  if (preserveContent) {
    const editable = cell.classList.contains('note-cell')
      ? props.mode === 'review'
      : props.mode === 'create'
    cell.setAttribute('contenteditable', editable ? 'true' : 'false')
    if (editable) bindEditableCell(cell)
    return
  }

  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function preparePreviousSpouseRepeatRow(row, repeatIndex, options = {}) {
  row.dataset.ds260RepeatSection = PREVIOUS_SPOUSE_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  setPreviousSpouseRowNumber(row, repeatIndex)
  const labelCell = getPreviousSpouseLabelCell(row)
  if (!getPreviousSpouseNumberCellInRow(row) && labelCell) {
    labelCell.innerHTML = `(${repeatIndex}) ${labelCell.innerHTML}`
  }

  const fieldKey = getPreviousSpouseFieldKey(row)
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetPreviousSpouseCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data', options.preserveContent === true)
  })

  noteCells.forEach((cell, index) => {
    resetPreviousSpouseCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note', options.preserveContent === true)
  })
}

function appendPreviousSpouseBlock(repeatIndex) {
  if (repeatIndex <= PREVIOUS_SPOUSE_BASE_COUNT || getPreviousSpouseRowsByIndex(repeatIndex).length) return false

  const templateRows = getPreviousSpouseBaseRows()
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getPreviousSpouseSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach(templateRow => {
    const row = templateRow.cloneNode(true)
    preparePreviousSpouseRepeatRow(row, repeatIndex)
    tbody.insertBefore(row, insertBeforeRow)
  })

  return true
}

function removeDynamicPreviousSpouseRows() {
  const table = getChecklistTable()
  table?.querySelectorAll(`tr[data-ds260-repeat-section="${PREVIOUS_SPOUSE_REPEAT_SECTION}"]`).forEach(row => row.remove())
}

function getPreviousSpouseRepeatIndexFromRow(row) {
  const indexCell = getVisibleNonInputCells(row).find(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
  const index = parseInt(normalizeLabel(indexCell?.textContent || ''), 10)
  return Number.isFinite(index) ? index : 0
}

function getMaxVisiblePreviousSpouseIndex() {
  return getPreviousSpouseSectionRows().reduce((max, row) => {
    if (!isPreviousSpouseRepeatRow(row)) return max
    return Math.max(max, getPreviousSpouseRepeatIndexFromRow(row))
  }, PREVIOUS_SPOUSE_BASE_COUNT)
}

function setPreviousSpouseNumberCellValue(count) {
  const cell = getPreviousSpouseNumberCell()
  if (!cell) return

  const value = String(count)
  cell.innerHTML = value
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = value
  cell.classList.remove('color-customer', 'color-reviewer')
  cell.classList.add('color-filler', 'modified')

  if (cell.dataset.cellId) {
    changes.value[cell.dataset.cellId] = value
    emit('change', { ...changes.value })
  }
}

function addPreviousSpouseBlockByButton() {
  const currentCount = Math.max(PREVIOUS_SPOUSE_BASE_COUNT, getMaxVisiblePreviousSpouseIndex() || 0)
  const nextCount = currentCount + 1

  appendPreviousSpouseBlock(nextCount)
  setPreviousSpouseNumberCellValue(nextCount)
  updateCorrectionCountDisplay()
}

function attachPreviousSpouseAddButton() {
  if (!paperRef.value) return

  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, PREVIOUS_SPOUSE_ANCHOR))
  const headerCell = headerRow?.querySelector('td')
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-previous-spouse-add-row-button')
  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '+'
  button.title = 'Thêm hôn nhân cũ'
  button.className = 'ds260-add-row-button ds260-previous-spouse-add-row-button'
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    addPreviousSpouseBlockByButton()
  })

  headerCell.appendChild(button)
}

function syncPreviousSpouseRows() {
  if (!paperRef.value) return

  // Giong phan con cai: chi giu 1 block hon nhan cu mac dinh.
  // Khong tu bung theo Number of Previoud spouses hoac keys cu trong filler/review.
  removeDynamicPreviousSpouseRows()
  getPreviousSpouseBaseRows().forEach(row => setPreviousSpouseRowNumber(row, PREVIOUS_SPOUSE_BASE_COUNT))
  attachPreviousSpouseAddButton()
  updateCorrectionCountDisplay()
}

function syncPreviousSpouseRowsFromNumberCell() {
  // Khong tu dong them dong khi sua so bang tay.
  // Cac block hon nhan cu chi duoc them bang nut + de tranh bung dong cu.
}

function getChildSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, CHILD_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getChildSectionRows() {
  const { rows, startIndex, endIndex } = getChildSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isChildRepeatRow(row) {
  return CHILD_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getChildRowsByIndex(repeatIndex) {
  return getChildSectionRows().filter(row => isChildRepeatRow(row) && rowMatchesChildRepeatIndex(row, repeatIndex))
}

function getStoredChildMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_child_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.keys(changeMap).reduce((innerMax, cellId) => {
      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getChildNumberCell() {
  const row = getChildSectionRows().find(item => rowMatchesLabel(item, CHILD_COUNT_LABEL))
  return getDataCells(row)[0] || null
}

function parseChildNumberCell() {
  const cell = getChildNumberCell()
  const value = normalizeChangeCompareValue(cell?.dataset?.filledValue || cell?.innerHTML || '')
  return parseChildCountValue(value)
}

function getRequiredChildCount(data = {}, overrideCount = null) {
  if (Number.isFinite(overrideCount)) return Math.max(0, overrideCount)

  const listCount = getChildListDataCount(data)
  if (listCount) return listCount

  const explicitCount = getExplicitChildCount(data)
  if (Number.isFinite(explicitCount)) return explicitCount

  // Do not use getStoredChildMaxIndex() here. Old filler/review keys such as
  // data_ds260_child_13_* are stale edit history and must not decide how many
  // child blocks are displayed.
  return CHILD_MIN_COUNT
}

function getChildCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (totalCells <= 1) return `${prefix}_ds260_child_${repeatIndex}_${fieldKey}`
  const suffixes = totalCells === 3 ? ['day', 'month', 'year'] : totalCells === 2 ? ['month', 'year'] : []
  const suffix = suffixes[cellIndex] || `part_${cellIndex + 1}`
  return `${prefix}_ds260_child_${repeatIndex}_${fieldKey}_${suffix}`
}

function resetChildCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix, preserveContent = false) {
  cell.dataset.cellId = getChildCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)

  // Khi người dùng bấm dấu +, các dòng con (1), (2) đã được fill data từ form.
  // Không được reset lại innerHTML/dataset của các dòng đang có, nếu không sẽ mất data đã truyền vào.
  if (preserveContent) {
    const editable = cell.classList.contains('note-cell')
      ? props.mode === 'review'
      : props.mode === 'create'
    cell.setAttribute('contenteditable', editable ? 'true' : 'false')
    if (editable) bindEditableCell(cell)
    return
  }

  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('yesno-cell')) {
    cell.classList.remove('yesno-cell')
    cell.innerHTML = cell.dataset.originalHtml || 'YES / NO'
  }

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareChildRepeatRow(row, repeatIndex, fieldIndex, options = {}) {
  row.dataset.ds260RepeatSection = CHILD_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(CHILD_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
      cell.style.whiteSpace = 'nowrap'
      cell.style.textAlign = 'center'
    }
  })

  const fieldKey = CHILD_FIELD_KEYS[fieldIndex]?.key || `field_${fieldIndex + 1}`
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetChildCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data', options.preserveContent === true)
  })

  noteCells.forEach((cell, index) => {
    resetChildCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note', options.preserveContent === true)
  })
}

function appendChildBlock(repeatIndex) {
  if (repeatIndex <= CHILD_TEMPLATE_INDEX || getChildRowsByIndex(repeatIndex).length) return false

  const templateRows = getChildRowsByIndex(CHILD_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getChildSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach((templateRow, index) => {
    const row = templateRow.cloneNode(true)
    prepareChildRepeatRow(row, repeatIndex, index)
    tbody.insertBefore(row, insertBeforeRow)
  })

  convertYesNoCells()
  return true
}

function parseParenthesizedRepeatIndex(value) {
  const match = String(value || '').match(/\(\s*(\d+)\s*\)/)
  const index = match ? parseInt(match[1], 10) : 0
  return Number.isFinite(index) ? index : 0
}

function rowMatchesChildRepeatIndex(row, repeatIndex) {
  const target = parseInt(repeatIndex, 10) || 0
  if (!target) return true

  return getVisibleNonInputCells(row).some(cell => parseParenthesizedRepeatIndex(cell.textContent) === target)
}

function getChildRepeatIndexFromRow(row) {
  const indexCell = getVisibleNonInputCells(row).find(cell => parseParenthesizedRepeatIndex(cell.textContent) > 0)
  return parseParenthesizedRepeatIndex(indexCell?.textContent)
}

function normalizeExistingChildRows(maxIndex) {
  const rows = getChildSectionRows().filter(row => isChildRepeatRow(row))
  const groups = new Map()

  rows.forEach(row => {
    const repeatIndex = getChildRepeatIndexFromRow(row)
    if (!repeatIndex) return

    if (repeatIndex > maxIndex) {
      row.remove()
      return
    }

    if (!groups.has(repeatIndex)) groups.set(repeatIndex, [])
    groups.get(repeatIndex).push(row)
  })

  groups.forEach((groupRows, repeatIndex) => {
    groupRows.forEach((row, fieldIndex) => {
      if (fieldIndex >= CHILD_FIELD_KEYS.length) {
        row.remove()
        return
      }
      prepareChildRepeatRow(row, repeatIndex, fieldIndex, { preserveContent: true })
    })
  })
}

function getMaxVisibleChildIndex() {
  return getChildSectionRows().reduce((max, row) => {
    if (!isChildRepeatRow(row)) return max
    return Math.max(max, getChildRepeatIndexFromRow(row))
  }, 0)
}

function ensureChildRows(targetCount) {
  if (!paperRef.value) return

  const safeCount = Math.max(CHILD_MIN_COUNT, parseInt(targetCount, 10) || CHILD_MIN_COUNT)
  normalizeExistingChildRows(safeCount)

  for (let index = CHILD_TEMPLATE_INDEX + 1; index <= safeCount; index += 1) {
    appendChildBlock(index)
  }

  normalizeExistingChildRows(safeCount)
  convertYesNoCells()
  updateCorrectionCountDisplay()
}

function setChildNumberCellValue(count) {
  const cell = getChildNumberCell()
  if (!cell) return

  const value = String(count)
  cell.innerHTML = value
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = value
  cell.classList.remove('color-customer', 'color-reviewer')
  cell.classList.add('color-filler', 'modified')

  if (cell.dataset.cellId) {
    changes.value[cell.dataset.cellId] = value
    emit('change', { ...changes.value })
  }
}

function addChildBlockByButton() {
  const currentCount = Math.max(CHILD_MIN_COUNT, getMaxVisibleChildIndex() || 0)
  const nextCount = currentCount + 1

  ensureChildRows(nextCount)
  setChildNumberCellValue(nextCount)
}

function attachChildAddButton() {
  if (!paperRef.value) return

  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, CHILD_ANCHOR))
  const headerCell = headerRow?.querySelector('td')
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-child-add-row-button')
  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '+'
  button.title = 'Thêm con'
  button.className = 'ds260-add-row-button ds260-child-add-row-button'
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    addChildBlockByButton()
  })

  headerCell.appendChild(button)
}

function syncChildRows(data = {}) {
  if (!paperRef.value) return

  ensureChildRows(getRequiredChildCount(data))
  attachChildAddButton()
}

function syncChildRowsFromNumberCell() {
  // Do not auto-create child blocks when Number of Children is edited manually.
  // Child blocks are added only with the + button so old saved child_13 keys cannot expand the form.
}


function getEducationSectionBounds() {
  const rows = getChecklistRows()
  const anchorIndex = rows.findIndex(row => rowMatchesLabel(row, EDUCATION_ANCHOR))
  if (anchorIndex === -1) return { rows, anchorIndex, startIndex: -1, endIndex: -1 }

  let endIndex = rows.length
  for (let index = anchorIndex + 1; index < rows.length; index += 1) {
    if (isFullWidthSectionHeader(rows[index])) {
      endIndex = index
      break
    }
  }

  return { rows, anchorIndex, startIndex: anchorIndex + 1, endIndex }
}

function getEducationSectionRows() {
  const { rows, startIndex, endIndex } = getEducationSectionBounds()
  if (startIndex < 0 || endIndex < 0) return []
  return rows.slice(startIndex, endIndex)
}

function isEducationRepeatRow(row) {
  return EDUCATION_FIELD_KEYS.some(item => rowMatchesLabel(row, item.label)) &&
    getVisibleNonInputCells(row).some(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
}

function getEducationRowsByIndex(repeatIndex) {
  return getEducationSectionRows().filter(row => isEducationRepeatRow(row) && rowMatchesRepeatIndex(row, repeatIndex))
}

function getEducationNumberCell() {
  const row = getEducationSectionRows().find(item => rowMatchesLabel(item, EDUCATION_COUNT_LABEL))
  return getDataCells(row)[0] || null
}

function getEducationCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells) {
  if (totalCells <= 1) return `${prefix}_ds260_education_${repeatIndex}_${fieldKey}`
  const suffixes = totalCells === 3 ? ['day', 'month', 'year'] : totalCells === 2 ? ['month', 'year'] : []
  const suffix = suffixes[cellIndex] || `part_${cellIndex + 1}`
  return `${prefix}_ds260_education_${repeatIndex}_${fieldKey}_${suffix}`
}

function resetEducationCell(cell, repeatIndex, fieldKey, cellIndex, totalCells, prefix, preserveContent = false) {
  cell.dataset.cellId = getEducationCellId(prefix, repeatIndex, fieldKey, cellIndex, totalCells)

  // Khi người dùng bấm dấu +, các trường đã fill sẵn không được reset về placeholder.
  if (preserveContent) {
    const editable = cell.classList.contains('note-cell')
      ? props.mode === 'review'
      : props.mode === 'create'
    cell.setAttribute('contenteditable', editable ? 'true' : 'false')
    if (editable) bindEditableCell(cell)
    return
  }

  delete cell.dataset.ds260Bound
  delete cell.dataset.filled
  delete cell.dataset.filledValue
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

  if (cell.classList.contains('yesno-cell')) {
    cell.classList.remove('yesno-cell')
    cell.innerHTML = cell.dataset.originalHtml || 'YES / NO'
  }

  if (cell.classList.contains('note-cell')) {
    cell.innerHTML = ''
    cell.dataset.submittedValue = ''
    cell.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode === 'review') bindEditableCell(cell)
    return
  }

  cell.innerHTML = cell.dataset.originalHtml || cell.innerHTML
  cell.setAttribute('contenteditable', props.mode === 'create' ? 'true' : 'false')
  if (props.mode === 'create') bindEditableCell(cell)
}

function prepareEducationRepeatRow(row, repeatIndex, fieldIndex, options = {}) {
  row.dataset.ds260RepeatSection = EDUCATION_REPEAT_SECTION
  row.dataset.ds260RepeatIndex = String(repeatIndex)

  getVisibleNonInputCells(row).forEach(cell => {
    if (normalizeLabel(cell.textContent) === String(EDUCATION_TEMPLATE_INDEX)) {
      cell.innerHTML = `(${repeatIndex})`
      cell.style.whiteSpace = 'nowrap'
      cell.style.textAlign = 'center'
      return
    }

    const text = normalizeLabel(cell.textContent)
    if (/^Name of Institution\(\d+\)/.test(text)) {
      cell.innerHTML = `Name of Institution(${repeatIndex})`
    }
  })

  const fieldKey = EDUCATION_FIELD_KEYS[fieldIndex]?.key || `field_${fieldIndex + 1}`
  const dataCells = getDataCells(row)
  const noteCells = Array.from(row.querySelectorAll('.note-cell')).filter(cell => cell.style.display !== 'none')

  dataCells.forEach((cell, index) => {
    resetEducationCell(cell, repeatIndex, fieldKey, index, dataCells.length, 'data', options.preserveContent === true)
  })

  noteCells.forEach((cell, index) => {
    resetEducationCell(cell, repeatIndex, fieldKey, index, noteCells.length, 'note', options.preserveContent === true)
  })
}

function appendEducationBlock(repeatIndex) {
  if (repeatIndex <= EDUCATION_TEMPLATE_INDEX || getEducationRowsByIndex(repeatIndex).length) return false

  const templateRows = getEducationRowsByIndex(EDUCATION_TEMPLATE_INDEX)
  if (!templateRows.length) return false

  const table = getChecklistTable()
  const tbody = table?.querySelector('tbody')
  const { rows, endIndex } = getEducationSectionBounds()
  const insertBeforeRow = rows[endIndex] || null
  if (!tbody) return false

  templateRows.forEach((templateRow, index) => {
    const row = templateRow.cloneNode(true)
    prepareEducationRepeatRow(row, repeatIndex, index)
    tbody.insertBefore(row, insertBeforeRow)
  })

  convertYesNoCells()
  return true
}

function getEducationRepeatIndexFromRow(row) {
  const indexCell = getVisibleNonInputCells(row).find(cell => /^\d+$/.test(normalizeLabel(cell.textContent)))
  const index = parseInt(normalizeLabel(indexCell?.textContent || ''), 10)
  return Number.isFinite(index) ? index : 0
}

function normalizeExistingEducationRows(maxIndex) {
  const rows = getEducationSectionRows().filter(row => isEducationRepeatRow(row))
  const groups = new Map()

  rows.forEach(row => {
    const repeatIndex = getEducationRepeatIndexFromRow(row)
    if (!repeatIndex) return

    if (repeatIndex > maxIndex) {
      row.remove()
      return
    }

    if (!groups.has(repeatIndex)) groups.set(repeatIndex, [])
    groups.get(repeatIndex).push(row)
  })

  groups.forEach((groupRows, repeatIndex) => {
    groupRows.forEach((row, fieldIndex) => {
      if (fieldIndex >= EDUCATION_FIELD_KEYS.length) {
        row.remove()
        return
      }
      prepareEducationRepeatRow(row, repeatIndex, fieldIndex, { preserveContent: true })
    })
  })
}

function getMaxVisibleEducationIndex() {
  return getEducationSectionRows().reduce((max, row) => {
    if (!isEducationRepeatRow(row)) return max
    return Math.max(max, getEducationRepeatIndexFromRow(row))
  }, 0)
}

function ensureEducationRows(targetCount) {
  if (!paperRef.value) return

  const safeCount = Math.max(EDUCATION_MIN_COUNT, parseInt(targetCount, 10) || EDUCATION_MIN_COUNT)
  normalizeExistingEducationRows(safeCount)

  for (let index = EDUCATION_TEMPLATE_INDEX + 1; index <= safeCount; index += 1) {
    appendEducationBlock(index)
  }

  normalizeExistingEducationRows(safeCount)
  convertYesNoCells()
  updateCorrectionCountDisplay()
}

function setEducationNumberCellValue(count) {
  const cell = getEducationNumberCell()
  if (!cell) return

  const value = String(count)
  cell.innerHTML = value
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = value
  cell.classList.remove('color-customer', 'color-reviewer')
  cell.classList.add('color-filler', 'modified')

  if (cell.dataset.cellId) {
    changes.value[cell.dataset.cellId] = value
    emit('change', { ...changes.value })
  }
}

function addEducationBlockByButton() {
  const currentCount = Math.max(EDUCATION_MIN_COUNT, getMaxVisibleEducationIndex() || 0)
  const nextCount = currentCount + 1

  ensureEducationRows(nextCount)
  setEducationNumberCellValue(nextCount)
}

function attachEducationAddButton() {
  if (!paperRef.value) return

  const headerRow = getChecklistRows().find(row => rowMatchesLabel(row, EDUCATION_ANCHOR))
  const headerCell = headerRow?.querySelector('td')
  if (!headerCell) return

  const existing = headerCell.querySelector('.ds260-education-add-row-button')
  if (existing) return

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '+'
  button.title = 'Thêm trường đã học'
  button.className = 'ds260-add-row-button ds260-education-add-row-button'
  button.style.cssText = 'float:right;width:24px;height:22px;line-height:18px;border:1px solid #16a34a;border-radius:5px;background:#dcfce7;color:#15803d;font-size:18px;font-weight:700;cursor:pointer;padding:0;margin:-1px 0 0 8px;'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    addEducationBlockByButton()
  })

  headerCell.appendChild(button)
}

function parseEducationListValue(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]

  const text = String(value || '').trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    return parsed && typeof parsed === 'object' ? [parsed] : []
  } catch {
    return []
  }
}

function getEducationListDataCount(data = {}) {
  // Dem giong records() trong ds260-mappings.js: chi tinh ban ghi con du lieu that,
  // de so block dung ra khop dung so truong duoc autofill.
  return parseEducationListValue(data?.schoolList).filter(item => {
    if (!item || typeof item !== 'object') return String(item || '').trim() !== ''
    return Object.values(item).some(value => String(value || '').trim() !== '')
  }).length
}

function getStoredEducationMaxIndex(data = {}) {
  const changeMaps = [
    data?._fillerChanges,
    data?.fillerChanges,
    data?.filler_changes,
    data?._reviewChanges,
    data?.reviewChanges,
    data?.review_changes
  ]
  const idPattern = /^(?:data|note)_ds260_education_(\d+)_/

  return changeMaps.reduce((max, changeMap) => {
    if (!changeMap || typeof changeMap !== 'object') return max
    return Object.entries(changeMap).reduce((innerMax, [cellId, value]) => {
      // Chi mo lai block khi key con du lieu that. Key rong hoac __CLEARED__ la lich su sua cu,
      // khong duoc phep lam bung them block (xem ghi chu o getRequiredChildCount).
      if (value === '__CLEARED__' || !normalizeChangeCompareValue(value)) return innerMax

      const match = String(cellId).match(idPattern)
      const index = match ? parseInt(match[1], 10) : 0
      return Number.isFinite(index) ? Math.max(innerMax, index) : innerMax
    }, max)
  }, 0)
}

function getRequiredEducationCount(data = {}) {
  return Math.max(
    EDUCATION_MIN_COUNT,
    getEducationListDataCount(data),
    getStoredEducationMaxIndex(data)
  )
}

function syncEducationRows(data = {}) {
  if (!paperRef.value) return

  // Giu 2 block mac dinh, nhung phai dung lai du block cho so truong khach khai va cho
  // cac block da duoc them bang nut + va da luu vao draft. Neu chi dung dung
  // EDUCATION_MIN_COUNT thi normalizeExistingEducationRows() se xoa block (3) tro di,
  // cac key data_ds260_education_3_* van nam trong draft nhung khong con o nao de hien
  // -> nguoi dung bam Save van bao thanh cong ma nhin nhu mat du lieu.
  ensureEducationRows(getRequiredEducationCount(data))
  attachEducationAddButton()
}

function syncEducationRowsFromNumberCell() {
  // Khong tu dong them dong khi sua so bang tay. Chi them bang nut + de khong bung dong cu.
}

function setColGroupWidth(cols, start, end, totalWidth) {
  const targetCols = Array.from(cols).slice(start, end + 1)
  if (!targetCols.length) return

  const currentWidths = targetCols.map(col => {
    const width = parseFloat(col.style.width || '')
    return Number.isFinite(width) && width > 0 ? width : 0
  })
  const sum = currentWidths.reduce((acc, width) => acc + width, 0)

  targetCols.forEach((col, index) => {
    const ratio = sum > 0 ? currentWidths[index] / sum : 1 / targetCols.length
    col.style.display = ''
    col.style.width = `${ratio * totalWidth}%`
  })
}

function normalizeChecklistColgroup(colgroup, hasConsultColumn) {
  if (!colgroup) return
  const cols = colgroup.querySelectorAll('col')
  // Tang do rong cot STT/(1) de khi xuat PDF khong bi rot tung ky tu.
  // Dong thoi chia deu lai hai cot TU VAN / XU LY de cac o ngan nhu Passport Number rong hon.
  setColGroupWidth(cols, 0, 1, 5)
  setColGroupWidth(cols, 2, 12, 45)
  setColGroupWidth(cols, 13, 23, hasConsultColumn ? 25 : 50)

  if (hasConsultColumn) {
    setColGroupWidth(cols, 24, 34, 25)
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

function handlePlainTextPaste(event) {
  const editable = event.target?.closest?.('[contenteditable="true"]')
  if (!editable) return
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

function bindEditableCell(cell) {
  if (!cell || cell.dataset.ds260Bound === 'true') return
  cell.dataset.ds260Bound = 'true'

  cell.addEventListener('focus', function () {
    // Lưu lại nội dung thật sự lúc focus để blur có thể so sánh đúng
    // "đã sửa hay chưa" — tránh việc chỉ click vào rồi click ra (không
    // gõ gì) mà vẫn bị tính là đã thay đổi.
    this.dataset.valueAtFocus = this.innerHTML
    if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
      this.innerHTML = ''
    }
  })

  cell.addEventListener('blur', function () {
    handleEditableCellBlur(this)
  })
}

function handleEditableCellBlur(cell) {
  if (!cell?.dataset?.cellId) return
  const rawValue = cell.innerHTML.trim()
  if (rawValue === (cell.dataset.valueAtFocus || '').trim()) return
  const original = cell.dataset.originalHtml || ''
  const isReviewerCell = props.mode === 'review' || cell.classList.contains('note-cell')
  const colorClass = isReviewerCell ? 'color-reviewer' : 'color-filler'

  if (!rawValue || rawValue === '<br>') {
    if (cell.dataset.ds260PlaceholderHidden === 'true') {
      cell.innerHTML = ''
      cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
      delete changes.value[cell.dataset.cellId]
    } else if (cell.classList.contains('data-cell') && props.mode === 'create' && cell.dataset.filled === 'true') {
      cell.innerHTML = ''
      cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
      changes.value[cell.dataset.cellId] = '__CLEARED__'
    } else {
      cell.innerHTML = cell.classList.contains('note-cell') ? '' : original
      cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
      delete changes.value[cell.dataset.cellId]
    }
  } else if (cell.dataset.filled === 'true' && rawValue === cell.dataset.filledValue && !isReviewerCell) {
    cell.classList.remove('color-filler', 'color-reviewer', 'modified')
    cell.classList.add('color-customer')
    delete changes.value[cell.dataset.cellId]
  } else {
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    cell.classList.add(colorClass, 'modified')
    changes.value[cell.dataset.cellId] = rawValue
  }

  emit('change', { ...changes.value })
  updateCorrectionCountDisplay()
  syncPreviousSpouseRowsFromNumberCell(cell)
  syncChildRowsFromNumberCell(cell)
  syncEducationRowsFromNumberCell(cell)
  resortPreviousWorkRowsFromCell(cell)
}

function initHeaderCells() {
  if (!paperRef.value) return
  const skipIds = new Set(['header-dien-don', 'header-kiem-tra', 'header-submit-cell'])
  const headerTable = paperRef.value.querySelectorAll('table')[1]
  if (!headerTable) return

  headerTable.querySelectorAll('td[data-cell-id]').forEach(cell => {
    if (skipIds.has(cell.id)) return
    cell.classList.add('data-cell')
    cell.dataset.originalHtml = cell.innerHTML

    const editableInReview = ['header_A_hcm', 'header_A_id', 'header_A_mshs'].includes(cell.dataset.cellId)
    const editable = props.mode === 'create' || (props.mode === 'review' && editableInReview)

    cell.setAttribute('contenteditable', editable && props.mode !== 'view' ? 'true' : 'false')
    if (editable && props.mode !== 'view') bindEditableCell(cell)
  })
}

function initInteractiveTable() {
  if (!paperRef.value) return
  if (!paperRef.value.dataset.ds260PlainPasteBound) {
    paperRef.value.addEventListener('paste', handlePlainTextPaste)
    paperRef.value.dataset.ds260PlainPasteBound = 'true'
  }

  initHeaderCells()

  const checklistTable = getChecklistTable()
  if (!checklistTable) return

  const thead = checklistTable.querySelector('thead') || checklistTable.querySelector('tr.header')
  if (thead) {
    thead.querySelectorAll('th').forEach(th => {
      const text = normalizeLabel(th.textContent)
      if (text === 'NOTE') {
        th.style.display = 'none'
      }
      if (text === 'XU LY' && (props.mode === 'review' || props.mode === 'view' || props.logCompare)) {
        th.innerHTML = props.logCompare ? '<strong>DATA GỐC</strong>' : '<strong>XỬ LÝ</strong>'
        const handlingHeader = th.cloneNode(true)
        handlingHeader.innerHTML = props.logCompare ? '<strong>ĐÃ SỬA</strong>' : '<strong>TƯ VẤN</strong>'
        th.parentNode.insertBefore(handlingHeader, th.nextSibling)
      }
    })
  }

  const colgroup = checklistTable.querySelector('colgroup')
  if (colgroup) {
    const cols = colgroup.querySelectorAll('col')
    if (cols.length >= 26) {
      if (props.mode === 'review' || props.mode === 'view' || props.logCompare) {
        const refNode = cols[24]
        for (let index = 13; index < 24; index += 1) {
          colgroup.insertBefore(cols[index].cloneNode(), refNode)
        }
        normalizeChecklistColgroup(colgroup, true)
      } else {
        normalizeChecklistColgroup(colgroup, false)
      }
    }
  }

  const tbody = checklistTable.querySelector('tbody')
  if (!tbody) return

  const rowspans = new Array(26).fill(0)
  let cellId = 0

  Array.from(tbody.querySelectorAll('tr:not(.header)')).forEach(row => {
    let colIdx = 0
    const dataCellsToClone = []

    Array.from(row.children).forEach(cell => {
      while (colIdx < 26 && rowspans[colIdx] > 0) {
        rowspans[colIdx] -= 1
        colIdx += 1
      }

      const colspan = parseInt(cell.getAttribute('colspan'), 10) || 1
      const rowspan = parseInt(cell.getAttribute('rowspan'), 10) || 1

      if (colIdx + colspan > 24) {
        const newColspan = 24 - colIdx
        if (newColspan <= 0) {
          cell.style.display = 'none'
        } else {
          cell.setAttribute('colspan', String(newColspan))
        }
      }

      const isData = colIdx >= 13 && colIdx < 24
      if (isData) {
        cell.classList.add('data-cell')
        cell.dataset.cellId = `data_${cellId}`
        cell.dataset.originalHtml = cell.innerHTML

        if (props.mode === 'create') {
          cell.setAttribute('contenteditable', 'true')
          bindEditableCell(cell)
        } else {
          cell.setAttribute('contenteditable', 'false')
          dataCellsToClone.push(cell)
        }
      }

      for (let index = 0; index < colspan; index += 1) {
        if (colIdx + index < 26) rowspans[colIdx + index] = rowspan - 1
      }
      colIdx += colspan
      cellId += 1
    })

    while (colIdx < 26) {
      if (rowspans[colIdx] > 0) rowspans[colIdx] -= 1
      colIdx += 1
    }

    if ((props.mode === 'review' || props.mode === 'view' || props.logCompare) && dataCellsToClone.length) {
      const lastDataCell = dataCellsToClone[dataCellsToClone.length - 1]
      const insertRef = lastDataCell.nextSibling

      dataCellsToClone.forEach(dataCell => {
        const reviewCell = dataCell.cloneNode(true)
        reviewCell.classList.remove('data-cell', 'color-customer', 'color-filler', 'color-reviewer', 'modified')
        reviewCell.classList.add('note-cell')
        reviewCell.dataset.cellId = dataCell.dataset.cellId.replace('data_', 'note_')
        reviewCell.dataset.submittedValue = dataCell.innerHTML.trim()
        reviewCell.dataset.originalHtml = dataCell.dataset.originalHtml || ''
        reviewCell.innerHTML = ''
        reviewCell.setAttribute('contenteditable', props.mode === 'review' && !props.logCompare ? 'true' : 'false')
        row.insertBefore(reviewCell, insertRef)
        if (props.mode === 'review' && !props.logCompare) bindEditableCell(reviewCell)
      })
    }
  })
}

function isYesNoSource(cell) {
  const text = normalizeLabel(cell.dataset.originalHtml || cell.dataset.submittedValue || cell.innerHTML)
  return text === 'YES NO' || text === 'YESNO'
}

function convertYesNoCells() {
  if (!paperRef.value) return

  paperRef.value.querySelectorAll('.data-cell, .note-cell').forEach(cell => {
    if (!isYesNoSource(cell) || cell.classList.contains('yesno-cell')) return

    const disabled = props.mode === 'view' || props.logCompare || (props.mode === 'review' && cell.classList.contains('data-cell'))
    cell.classList.add('yesno-cell')
    cell.setAttribute('contenteditable', 'false')
    cell.innerHTML = `
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="YES" ${disabled ? 'disabled' : ''}>
        <span>YES</span>
      </label>
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="NO" ${disabled ? 'disabled' : ''}>
        <span>NO</span>
      </label>
    `

    if (!disabled) {
      const checks = cell.querySelectorAll('.yesno-check')
      checks.forEach(check => {
        check.addEventListener('change', function () {
          checks.forEach(other => {
            if (other !== this) other.checked = false
          })
          const value = this.checked ? this.dataset.val : ''
          handleYesNoChange(cell, value)
        })
      })
    }
  })
}

function handleYesNoChange(cell, value) {
  if (!cell?.dataset?.cellId) return

  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

  if (!value) {
    // Bỏ chọn một ô vốn đã có data khách hàng là thao tác XÓA, không phải
    // "không có thay đổi": phải ghi marker __CLEARED__, nếu không thì mở lại
    // phiếu là autofill đổ data cũ về và thao tác xóa mất trắng.
    recordClearedChange(changes.value, cell)
  } else if (props.mode === 'review' || cell.classList.contains('note-cell')) {
    cell.classList.add('color-reviewer')
    changes.value[cell.dataset.cellId] = value

    if (cell.classList.contains('data-cell')) {
      const noteId = cell.dataset.cellId.replace('data_', 'note_')
      const noteCell = paperRef.value?.querySelector(`[data-cell-id="${noteId}"]`)
      if (noteCell) {
        fillYesNoCell(noteCell, value, 'color-reviewer')
        changes.value[noteId] = value
      }
    }
  } else if (cell.dataset.filled === 'true' && value === cell.dataset.filledValue) {
    cell.classList.add('color-customer')
    delete changes.value[cell.dataset.cellId]
  } else {
    cell.classList.add('color-filler')
    changes.value[cell.dataset.cellId] = value
  }

  emit('change', { ...changes.value })
  updateCorrectionCountDisplay()
}

function fillYesNoCell(cell, value, colorClass = 'color-customer') {
  if (!cell) return
  const normalized = normalizeLabel(value)
  const finalValue = normalized.startsWith('Y') ? 'YES' : normalized.startsWith('N') ? 'NO' : ''

  cell.querySelectorAll('.yesno-check').forEach(check => {
    const checked = check.dataset.val === finalValue
    check.checked = checked
    if (checked) check.setAttribute('checked', 'checked')
    else check.removeAttribute('checked')
  })

  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  if (finalValue && colorClass) cell.classList.add(colorClass)
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = finalValue
}

function getCellPrintableValue(cell) {
  if (!cell) return ''
  if (cell.classList.contains('yesno-cell')) {
    return cell.querySelector('.yesno-check:checked')?.dataset.val || ''
  }
  // Nút comment (và mọi widget app chèn vào ô) không phải nội dung phiếu.
  // Phải bóc SAU các nhánh yes/no: cloneNode() không sao chép trạng thái checked
  // dạng property của checkbox, clone sớm sẽ đọc nhầm ô đã tick thành chưa tick.
  if (cell.querySelector('.pkt-ui-widget')) {
    const clone = cell.cloneNode(true)
    clone.querySelectorAll('.pkt-ui-widget').forEach(node => node.remove())
    return clone.innerHTML.trim()
  }
  return cell.innerHTML.trim()
}

function resetTable(shouldEmit = false) {
  if (!paperRef.value) return

  paperRef.value.querySelectorAll('.data-cell, .note-cell').forEach(cell => {
    if (cell.classList.contains('yesno-cell')) {
      cell.querySelectorAll('.yesno-check').forEach(check => {
        check.checked = false
        check.removeAttribute('checked')
      })
    } else {
      cell.innerHTML = cell.classList.contains('note-cell') ? '' : (cell.dataset.originalHtml || '')
    }
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
    delete cell.dataset.ds260PlaceholderHidden
    delete cell.dataset.ds260HiddenHtml
    delete cell.dataset.filled
    delete cell.dataset.filledValue
    delete cell.dataset.submittedValue
  })

  changes.value = {}
  if (shouldEmit) emit('change', {})
}

function fillHeaderData(data) {
  if (!paperRef.value || !data) return
  const header = getDS260HeaderValues(data)
  const values = {
    header_A_customer: header.customer,
    header_A_hcm: header.hcm,
    header_A_id: header.id,
    header_A_mshs: header.mshs
  }

  Object.entries(values).forEach(([cellId, value]) => {
    if (!value) return
    const cell = paperRef.value.querySelector(`[data-cell-id="${cellId}"]`)
    setCellValue(cell, value, 'color-customer', true)
  })
}

function getNonInputLabelCells(row) {
  return Array.from(row?.children || []).filter(cell => {
    if (cell.classList.contains('data-cell') || cell.classList.contains('note-cell')) return false
    if (cell.style.display === 'none') return false
    const text = normalizeLabel(cell.textContent)
    if (!text || /^\d+$/.test(text)) return false
    return true
  })
}

function rowMatchesLabel(row, label) {
  return getNonInputLabelCells(row).some(cell => labelMatches(cell.textContent, label))
}

function getVisibleNonInputCells(row) {
  return Array.from(row?.children || []).filter(cell => {
    if (cell.classList.contains('data-cell') || cell.classList.contains('note-cell')) return false
    if (cell.style.display === 'none') return false
    return normalizeLabel(cell.textContent)
  })
}

function rowMatchesRepeatIndex(row, repeatIndex) {
  const target = String(parseInt(repeatIndex, 10) || '').trim()
  if (!target) return true

  // Ưu tiên dataset (nguồn duy nhất đáng tin sau khi mục CÔNG VIỆC TRƯỚC ĐÂY được sắp xếp lại,
  // vì lúc đó chữ "(N)" hiển thị không còn khớp cellId nữa).
  if (row?.dataset?.ds260RepeatIndex) return row.dataset.ds260RepeatIndex === target

  return getVisibleNonInputCells(row).some(cell => normalizeLabel(cell.textContent) === target)
}

function findAnchorIndex(label) {
  if (!label) return -1
  return getChecklistRows().findIndex(row => rowMatchesLabel(row, label))
}

function getDataCells(row) {
  return Array.from(row?.querySelectorAll('.data-cell') || [])
    .filter(cell => cell.style.display !== 'none')
}

function findDataCellsForMapping(mapping) {
  const rows = getChecklistRows()
  let startIndex = 0
  let stopIndex = rows.length

  if (mapping.after) {
    const anchorIndex = findAnchorIndex(mapping.after)
    if (anchorIndex !== -1) {
      startIndex = anchorIndex + 1
      // Khi anchor là dòng tiêu đề mục thì dừng ở tiêu đề mục kế tiếp. Nhiều mục dùng nhãn giống
      // hệt nhau (City / State/Province / Country/Region / From / To có ở cả CÔNG VIỆC TRƯỚC ĐÂY
      // lẫn CÁC TRƯỜNG ĐÃ HỌC, cùng đánh số (1)(2)); không chặn biên thì khi mục này thiếu khối
      // tương ứng, dữ liệu sẽ tràn xuống ghi đè mục sau.
      if (isFullWidthSectionHeader(rows[anchorIndex])) {
        for (let index = startIndex; index < rows.length; index += 1) {
          if (isFullWidthSectionHeader(rows[index])) {
            stopIndex = index
            break
          }
        }
      }
    }
  }

  let occurrence = 0
  const targetOccurrence = Math.max(1, parseInt(mapping.occurrence || '1', 10) || 1)
  const targetRepeatIndex = Math.max(0, parseInt(mapping.repeatIndex || '0', 10) || 0)
  const targetRepeatOccurrence = Math.max(1, parseInt(mapping.repeatOccurrence || '1', 10) || 1)
  let repeatOccurrence = 0

  for (let index = startIndex; index < stopIndex; index += 1) {
    const row = rows[index]
    if (!rowMatchesLabel(row, mapping.label)) continue
    if (targetRepeatIndex) {
      if (!rowMatchesRepeatIndex(row, targetRepeatIndex)) continue
      repeatOccurrence += 1
      if (repeatOccurrence < targetRepeatOccurrence) continue
      const dataCells = getDataCells(row)
      return dataCells.length ? dataCells : []
    }

    occurrence += 1
    if (occurrence < targetOccurrence) continue

    const dataCells = getDataCells(row)
    if (dataCells.length) return dataCells
  }

  return []
}

function parseDateParts(value) {
  const raw = String(value || '').trim()
  if (!raw) return { day: '', month: '', year: '', full: '' }

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]
  const dateOnly = raw.split('T')[0]
  const parts = dateOnly.split(/[-/]/).map(part => part.trim()).filter(Boolean)
  let day = ''
  let month = ''
  let year = ''

  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else {
      const first = parseInt(parts[0], 10)
      const second = parseInt(parts[1], 10)
      if (first > 12) {
        day = parts[0]
        month = parts[1]
      } else if (second > 12) {
        month = parts[0]
        day = parts[1]
      } else {
        day = parts[0]
        month = parts[1]
      }
      year = parts[2]
    }
  } else if (parts.length === 2) {
    if (parts[0].length === 4) {
      year = parts[0]
      month = parts[1]
    } else {
      month = parts[0]
      year = parts[1]
    }
  } else if (/^\d{4}$/.test(parts[0] || '')) {
    year = parts[0]
  } else {
    const yearMatch = raw.match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2}|21\d{2})(?:\D|$)/)
    if (yearMatch) year = yearMatch[1]
  }

  const monthIndex = parseInt(month, 10)
  const monthName = Number.isFinite(monthIndex) && monthIndex >= 1 && monthIndex <= 12
    ? monthNames[monthIndex - 1]
    : normalizeLabel(month)

  return {
    day: day ? String(parseInt(day, 10) || day).padStart(day.length === 1 ? 2 : day.length, '0') : '',
    month: monthName,
    year,
    full: [day, monthName, year].filter(Boolean).join(' ') || raw
  }
}

function fillDateCells(firstCell, value, colorClass = 'color-customer') {
  if (!firstCell || !value) return false
  const cells = getDataCells(firstCell.closest('tr'))
  const parts = parseDateParts(value)

  if (cells.length >= 3) {
    if (parts.year && !parts.day && !parts.month) {
      return setCellValue(cells[cells.length - 1], parts.year, colorClass, true)
    }
    setCellValue(cells[0], parts.day, colorClass, true)
    setCellValue(cells[1], parts.month, colorClass, true)
    setCellValue(cells[2], parts.year, colorClass, true)
    return true
  }

  if (cells.length === 2) {
    if (parts.year && !parts.day && !parts.month) {
      return setCellValue(cells[1], parts.year, colorClass, true)
    }

    const leftValue = [parts.day, parts.month].filter(Boolean).join(' ')
    setCellValue(cells[0], leftValue || parts.month || parts.day || '', colorClass, true)
    setCellValue(cells[1], parts.year, colorClass, true)
    return true
  }

  return setCellValue(firstCell, parts.full, colorClass, true)
}

function fillDurationCells(firstCell, value, colorClass = 'color-customer') {
  if (!firstCell || !value) return false
  const cells = getDataCells(firstCell.closest('tr'))
  const text = String(value || '').trim().toUpperCase()
  const match = text.match(/(\d+)\s*([A-Z]+)?/)

  if (cells.length >= 2 && match) {
    setCellValue(cells[0], match[1], colorClass, true)
    setCellValue(cells[1], match[2] || '', colorClass, true)
    return true
  }

  return setCellValue(firstCell, text, colorClass, true)
}

function setCellValue(cell, value, colorClass = 'color-customer', force = false) {
  if (!cell) return false
  const text = String(value ?? '').trim()
  if (!text && !force) return false
  delete cell.dataset.ds260PlaceholderHidden
  delete cell.dataset.ds260HiddenHtml

  if (cell.classList.contains('yesno-cell')) {
    fillYesNoCell(cell, text, colorClass)
  } else {
    cell.innerHTML = printableHtml(text)
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
    if (text && colorClass) cell.classList.add(colorClass)
  }

  cell.dataset.filled = 'true'
  cell.dataset.filledValue = text
  return true
}

function fillMapping(mapping) {
  if (!mapping || (!mapping.force && (mapping.val === undefined || mapping.val === null || String(mapping.val).trim() === ''))) {
    return false
  }

  const cells = findDataCellsForMapping(mapping)
  if (!cells.length) return false

  const target = cells[Math.max(0, parseInt(mapping.cellIndex || '0', 10) || 0)] || cells[0]
  if (mapping.type === 'date') return fillDateCells(target, mapping.val)
  if (mapping.type === 'duration') return fillDurationCells(target, mapping.val)
  return setCellValue(target, mapping.val, 'color-customer', !!mapping.force)
}

function autoFillData(data) {
  if (!paperRef.value || !data) return
  const mappings = buildDS260Mappings(data)
  mappings.forEach(fillMapping)
}

function applyChangeToCell(cell, value, colorClass) {
  if (!cell) return

  if (value === '__CLEARED__') {
    if (cell.classList.contains('yesno-cell')) {
      cell.querySelectorAll('.yesno-check').forEach(check => {
        check.checked = false
        check.removeAttribute('checked')
      })
    } else {
      cell.innerHTML = ''
    }
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
    delete cell.dataset.filled
    delete cell.dataset.filledValue
    return
  }

  delete cell.dataset.ds260PlaceholderHidden
  delete cell.dataset.ds260HiddenHtml

  if (cell.classList.contains('yesno-cell')) {
    fillYesNoCell(cell, value, colorClass)
  } else {
    cell.innerHTML = String(value || '')
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    cell.classList.add(colorClass)
    if (colorClass === 'color-filler') cell.classList.add('modified')
  }
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = String(value || '')
}

function applyChangeMap(changeMap, colorClass, shouldKeepInLocalChanges = false) {
  if (!paperRef.value || !changeMap || typeof changeMap !== 'object') return

  Object.entries(changeMap).forEach(([cellId, value]) => {
    const targetCell = getStoredChangeTarget(cellId, colorClass)
    if (!targetCell) {
      // Không tìm thấy ô đích (ví dụ khối lặp "CÔNG VIỆC TRƯỚC ĐÂY" chưa được dựng lại) thì VẪN
      // phải giữ nguyên key trong changes.value: applyStoredChanges() emit('change') ngay sau đó
      // và App.vue ghi đè draft bằng đúng map này, nên bỏ key ở đây là xóa vĩnh viễn dữ liệu
      // người dùng đã lưu.
      if (shouldKeepInLocalChanges) changes.value[cellId] = value
      return
    }

    if (shouldSkipStoredChange(cellId, targetCell, value, colorClass)) {
      delete changes.value[cellId]
      return
    }

    applyChangeToCell(targetCell, value, colorClass)
    if (shouldKeepInLocalChanges) {
      const targetCellId = targetCell.dataset.cellId || cellId
      changes.value[targetCellId] = value
      if (targetCellId !== cellId) delete changes.value[cellId]
    }
  })
}

function applyStoredChanges(data) {
  const fillerChanges = data?._fillerChanges || data?.fillerChanges || data?.filler_changes
  const reviewChanges = data?._reviewChanges || data?.reviewChanges || data?.review_changes

  applyChangeMap(fillerChanges, 'color-filler', props.mode === 'create')
  applyChangeMap(reviewChanges, 'color-reviewer', true)

  if ((props.mode === 'create' && fillerChanges && Object.keys(fillerChanges).length) ||
      (reviewChanges && Object.keys(reviewChanges).length)) {
    emit('change', { ...changes.value })
  }
}

function getPersonId(person) {
  return String(
    person?.id ??
    person?.user_id ??
    person?.userId ??
    person?.reviewer_id ??
    person?.reviewerId ??
    person?.ID ??
    ''
  ).trim()
}

function getPersonName(person) {
  return String(
    person?.name ??
    person?.display_name ??
    person?.displayName ??
    person?.full_name ??
    person?.fullName ??
    person?.username ??
    person?.email ??
    ''
  ).trim()
}

function findReviewerById(id) {
  const targetId = String(id ?? '').trim()
  if (!targetId || !Array.isArray(props.reviewers)) return null
  return props.reviewers.find(reviewer => getPersonId(reviewer) === targetId) || null
}

function getSelectedReviewerInfo(selectElement = null) {
  const reviewerId = String(selectElement?.value || props.selectedReviewer || props.customerData?.reviewerId || props.customerData?.reviewer_id || '').trim()
  const selectedText = selectElement?.selectedOptions?.[0]?.textContent?.trim() || ''
  const reviewer = findReviewerById(reviewerId)
  const reviewerName = getPersonName(reviewer) || (/^--/.test(selectedText) ? '' : selectedText)
  return {
    reviewerId,
    reviewer_id: reviewerId,
    reviewerName,
    reviewer_name: reviewerName
  }
}

function getReviewerNameForDisplay() {
  const directName = String(
    props.customerData?.reviewerName ??
    props.customerData?.reviewer_name ??
    props.customerData?.reviewer_full_name ??
    props.customerData?.reviewerFullName ??
    ''
  ).trim()
  if (directName) return directName

  const reviewerId = String(
    props.customerData?.reviewerId ??
    props.customerData?.reviewer_id ??
    props.selectedReviewer ??
    ''
  ).trim()
  return getPersonName(findReviewerById(reviewerId))
}

function injectHeaderControls() {
  if (!paperRef.value) return
  const fillerCell = paperRef.value.querySelector('#header-dien-don')
  const reviewerCell = paperRef.value.querySelector('#header-kiem-tra')
  const submitCell = paperRef.value.querySelector('#header-submit-cell')

  if (props.logCompare) {
    if (fillerCell) fillerCell.innerHTML = '<span style="font-weight:700;color:#133985;">Check log</span>'
    if (reviewerCell) reviewerCell.innerHTML = '<span style="font-weight:700;color:#133985;">DATA GỐC / ĐÃ SỬA</span>'
    if (submitCell) submitCell.innerHTML = ''
    return
  }

  if (fillerCell) {
    const fillerName = props.mode === 'create'
      ? (props.currentUser?.name || props.customerData?.fillerName || '')
      : (props.customerData?.fillerName || props.customerData?.filler_name || props.currentUser?.name || '')
    fillerCell.innerHTML = fillerName ? `<span style="font-weight:600;color:#1d4ed8;">${escapeHtml(fillerName)}</span>` : ''
  }

  if (reviewerCell) {
    if (props.mode === 'create' && props.reviewers?.length) {
      const select = document.createElement('select')
      select.style.cssText = 'width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;font-family:inherit;background:#fff;outline:none;'

      const defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = '-- Chon nguoi kiem tra --'
      select.appendChild(defaultOption)

      props.reviewers.forEach(reviewer => {
        const option = document.createElement('option')
        option.value = getPersonId(reviewer)
        option.textContent = getPersonName(reviewer) || option.value
        select.appendChild(option)
      })

      select.value = String(props.selectedReviewer || props.customerData?.reviewerId || props.customerData?.reviewer_id || '').trim()
      select.addEventListener('change', event => {
        emit('update:selectedReviewer', event.target.value)
      })

      reviewerCell.innerHTML = ''
      reviewerCell.appendChild(select)
    } else if (props.mode === 'review' || props.mode === 'view') {
      const reviewerName = getReviewerNameForDisplay()
      reviewerCell.innerHTML = reviewerName ? `<span style="font-weight:600;color:#dc2626;">${escapeHtml(reviewerName)}</span>` : ''
    }
  }

  if (!submitCell) return

  submitCell.innerHTML = ''

  if (props.mode === 'create') {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Submit Phieu'
    button.style.cssText = 'padding:6px 14px;background:#6366f1;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;'
    button.addEventListener('click', () => {
      const select = reviewerCell?.querySelector('select')
      emit('submit-form', getSelectedReviewerInfo(select))
    })
    submitCell.appendChild(button)
  } else if (props.mode === 'review') {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Hoan Tat KT'
    button.style.cssText = 'padding:6px 14px;background:#16a34a;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;'
    button.addEventListener('click', () => emit('submit-form', { complete: true }))
    submitCell.appendChild(button)
  }

  if (props.mode === 'review' || props.mode === 'view') {
    const badge = document.createElement('div')
    badge.className = 'correction-count-badge'
    badge.style.cssText = 'margin-top:6px;padding:4px 8px;border:1px solid #bbf7d0;border-radius:6px;font-size:12px;font-weight:700;color:#16a34a;text-align:center;white-space:nowrap;background:#f0fdf4;'
    submitCell.appendChild(badge)
    updateCorrectionCountDisplay()
  }
}


function prepareDS260LogCompareView() {
  if (!paperRef.value) return

  paperRef.value.querySelectorAll('.data-cell, .note-cell').forEach(cell => {
    cell.setAttribute('contenteditable', 'false')
    cell.classList.remove('data-cell-editable')
  })

  paperRef.value.querySelectorAll('select, button, input').forEach(el => {
    if (el.classList.contains('yesno-check')) return
    el.setAttribute('disabled', 'disabled')
  })

  const submitCell = paperRef.value.querySelector('#header-submit-cell')
  if (submitCell) submitCell.innerHTML = ''

  updateCorrectionCountDisplay()
}

function getReviewerCorrectionCount(root = paperRef.value) {
  if (!root) return 0
  const rows = new Set()

  root.querySelectorAll('.note-cell.color-reviewer, .data-cell.color-reviewer').forEach(cell => {
    const value = getCellPrintableValue(cell)
    if (!value || value === '<br>' || value === '__CLEARED__') return
    const row = cell.closest('tr')
    if (row) rows.add(row)
  })

  return rows.size
}

function updateCorrectionCountDisplay() {
  if (!paperRef.value) return
  const badge = paperRef.value.querySelector('.correction-count-badge')
  if (!badge) return

  const count = getReviewerCorrectionCount()
  badge.textContent = `Tong sua: ${count}`
  badge.style.background = count > 0 ? '#fef2f2' : '#f0fdf4'
  badge.style.borderColor = count > 0 ? '#fca5a5' : '#bbf7d0'
  badge.style.color = count > 0 ? '#dc2626' : '#16a34a'
}

function restoreProcessLayoutForPdf(root) {
  if (!root) return

  root.querySelectorAll('tr').forEach(row => {
    row.querySelectorAll('.note-cell').forEach(noteCell => {
      const dataCellId = noteCell.dataset.cellId?.replace(/^note_/, 'data_')
      const dataCell = dataCellId ? row.querySelector(`[data-cell-id="${dataCellId}"]`) : null
      const noteValue = getCellPrintableValue(noteCell)
      if (dataCell && noteValue) applyPrintableValue(dataCell, noteValue, 'color-reviewer')
      noteCell.remove()
    })
  })

  const checklistTable = root.querySelector('table.ds260-main-table') || root.querySelectorAll('table')[2]
  const colgroup = checklistTable?.querySelector('colgroup')
  if (colgroup) {
    const cols = Array.from(colgroup.querySelectorAll('col'))
    if (cols.length > 26) {
      cols.slice(24, 35).forEach(col => col.remove())
      normalizeChecklistColgroup(colgroup, false)
    }
  }

  const headerRow = checklistTable?.querySelector('thead tr') || checklistTable?.querySelector('tr.header')
  if (headerRow) {
    const headers = Array.from(headerRow.children)
    const consultHeader = headers.find(cell => normalizeLabel(cell.textContent) === 'TU VAN')
    if (consultHeader) {
      const next = consultHeader.nextElementSibling
      if (next && normalizeLabel(next.textContent) === 'XU LY') next.remove()
      consultHeader.innerHTML = '<strong>XỬ LÝ</strong>'
    }
  }
}

function applyPrintableValue(cell, value, colorClass) {
  if (!cell) return
  if (cell.classList.contains('yesno-cell')) {
    fillYesNoCell(cell, value, colorClass)
  } else {
    cell.innerHTML = printableHtml(value)
    cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    if (colorClass) cell.classList.add(colorClass)
  }
}

function markPdfIndexCells(root) {
  if (!root) return
  root.querySelectorAll('tr').forEach(row => {
    Array.from(row.children).forEach((cell, index) => {
      const text = normalizeLabel(cell.textContent || '')
      if (index <= 1 && (/^\d+$/.test(text) || /^\(\d+\)$/.test(text))) {
        cell.classList.add('pdf-index-cell')
      }
    })
  })
}


function normalizePassportNumberRowsForPdf(root) {
  if (!root) return

  root.querySelectorAll('tr').forEach(row => {
    const cells = Array.from(row.children).filter(cell => cell.style.display !== 'none')
    const labelCell = cells.find(cell => normalizeLabel(cell.textContent || '') === 'PASSPORT NUMBER')
    if (!labelCell) return

    // Ham nay chi de nan lai dong "Passport Number" cua muc quoc tich khac (dong do co
    // colspan le chuan: 4/13/5). Khoi "ho chieu khac trong 15 nam" da dung bo cuc chuan
    // va co o danh so khoi "(N)"; neu xu ly tiep thi o "(N)" bi coi la mot o gia tri,
    // day so ho chieu sang cot ke ben khi xuat PDF.
    const isRepeatBlockRow = row.dataset?.ds260RepeatSection ||
      cells.some(cell => /^\(\d+\)$/.test(String(cell.textContent || '').trim()))
    if (isRepeatBlockRow) return

    const indexCell = cells.find(cell => {
      const text = normalizeLabel(cell.textContent || '')
      return text === '' || /^\d+$/.test(text) || /^\(\d+\)$/.test(text)
    }) || cells[0]

    const processCells = cells.filter(cell => {
      if (cell === indexCell || cell === labelCell) return false
      if (cell.classList.contains('data-cell') || cell.classList.contains('note-cell')) return true
      const text = normalizeLabel(cell.textContent || '')
      return text && text !== 'NO DIEN' && text !== 'YES DIEN'
    })

    if (!processCells.length) return

    Array.from(row.children).forEach(cell => {
      if (cell !== indexCell && cell !== labelCell && !processCells.includes(cell)) cell.remove()
    })

    indexCell.setAttribute('colspan', '2')
    indexCell.classList.add('pdf-index-cell')
    labelCell.setAttribute('colspan', '11')

    processCells.forEach(cell => {
      cell.setAttribute('colspan', '11')
      cell.style.display = ''
      cell.style.whiteSpace = 'normal'
    })

    row.appendChild(indexCell)
    row.appendChild(labelCell)
    processCells.forEach(cell => row.appendChild(cell))
  })
}

function preparePdfClone() {
  const source = paperRef.value
  const clone = source.cloneNode(true)
  clone.classList.add('pdf-export-paper')
  markPdfIndexCells(clone)

  clone.querySelectorAll('select').forEach(select => {
    const span = document.createElement('span')
    span.textContent = select.selectedOptions?.[0]?.textContent || ''
    select.replaceWith(span)
  })

  clone.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'))
  clone.querySelectorAll('button').forEach(button => button.remove())

  // Review/view mode already has 2 process columns after initInteractiveTable():
  // TU VAN (reviewer notes) + XU LY (handler data).
  // Do not collapse note-cell into data-cell here, otherwise the exported PDF loses
  // the reviewer column and only shows XU LY.
  if (!(props.mode === 'review' || props.mode === 'view')) {
    restoreProcessLayoutForPdf(clone)
  }
  normalizePassportNumberRowsForPdf(clone)

  const style = document.createElement('style')
  style.textContent = `
    .pdf-export-paper,
    .pdf-export-paper * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-export-paper {
      background: #fff !important;
      color: #000 !important;
      font-family: "Times New Roman", Times, serif !important;
      font-size: 17px !important;
    }
    .pdf-export-paper table {
      width: 100% !important;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      table-layout: fixed !important;
      margin: 0 0 10px 0 !important;
    }
    .pdf-export-paper td,
    .pdf-export-paper th {
      border: 1px solid #000 !important;
      padding: 4px 6px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      font-size: inherit !important;
      overflow-wrap: anywhere !important;
    }
    .pdf-export-paper .pdf-index-cell {
      white-space: nowrap !important;
      overflow-wrap: normal !important;
      word-break: keep-all !important;
      text-align: center !important;
      padding-left: 2px !important;
      padding-right: 2px !important;
    }
    .pdf-export-paper th,
    .pdf-export-paper strong,
    .pdf-export-paper b {
      font-weight: 700 !important;
    }
    .pdf-export-paper img {
      max-width: 100% !important;
      height: auto !important;
    }
    .pdf-export-paper .color-customer {
      color: #92400e !important;
      font-weight: 700 !important;
    }
    .pdf-export-paper .color-filler {
      color: #1d4ed8 !important;
      font-weight: 700 !important;
    }
    .pdf-export-paper .color-reviewer {
      color: #dc2626 !important;
      font-weight: 700 !important;
    }
    .pdf-export-paper .yesno-label {
      display: inline-flex !important;
      align-items: center !important;
      gap: 3px !important;
      margin-right: 8px !important;
      white-space: nowrap !important;
    }
    .pdf-export-paper .yesno-check {
      width: 13px !important;
      height: 13px !important;
      margin: 0 3px 0 0 !important;
      vertical-align: middle !important;
      accent-color: #92400e !important;
    }
    .pdf-export-paper button {
      display: none !important;
    }
  `
  clone.prepend(style)
  // Chữ ký điện tử vẽ trên canvas không đi theo cloneNode -> dựng lại từ ảnh đã lưu.
  appendCommentsToClone(clone, props.comments)
  appendSignatureBlockToClone(clone, props.signatures)

  return clone
}

function safePdfName(value) {
  return String(value || 'DS260')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'DS260'
}

async function exportPdf() {
  if (!paperRef.value) return false

  try {
    const baseName = safePdfName(props.customerData?.fullName || props.customerData?.customerName || 'DS260')
    const clone = preparePdfClone()

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:900px;border:none;opacity:0;pointer-events:none;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <title>${baseName}_phieu_kiem_tra_ds260</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 17px;
      line-height: 1.3;
      color: #111;
      background: #fff;
      padding: 10mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
      margin: 0 0 10px 0;
      page-break-inside: auto;
    }
    td, th {
      border: 1px solid #000;
      padding: 4px 6px;
      vertical-align: middle;
      line-height: 1.25;
      font-size: inherit;
      overflow-wrap: anywhere;
    }
    th { text-align: center; }
    th, strong, b { font-weight: 700; }
    p { margin: 0; }
    tr { page-break-inside: auto; }
    thead { display: table-row-group; }
  </style>
</head>
<body></body>
</html>`)
    iframeDoc.close()
    iframeDoc.body.appendChild(clone)

    await new Promise(resolve => setTimeout(resolve, 300))

    const originalTitle = document.title
    document.title = `${baseName}_phieu_kiem_tra_ds260`
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    document.title = originalTitle
    setTimeout(() => iframe.remove(), 1000)
    return true
  } catch (error) {
    console.error('DS-260 export PDF failed:', error)
    return false
  }
}
</script>
