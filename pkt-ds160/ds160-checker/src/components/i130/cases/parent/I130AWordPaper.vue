<template>
  <div class="word-paper-container">
    <div ref="paperRef" v-html="rawHtml"></div>
  </div>
</template>

<script setup>
import { clearCellContent, recordClearedChange } from '../../../../lib/cell-clear.js'
import { buildAuditSnapshot } from '../../../../lib/audit-snapshot.js'
import { ref, onMounted, watch, nextTick } from 'vue'
import { appendSignatureBlockToClone } from '../../../../lib/signatures.js'
import { appendCommentsToClone } from '../../../../lib/pdf-comments.js'
import { buildI130AMappings } from '../../../../forms/i130/cases/parent/i130a-mappings.js'
import { renderI130ADynamicSections } from '../../../../forms/i130/cases/parent/i130a-dynamic-sections.js'
import {
  SPOUSE_ADDRESS_OPTIONS,
  K1_SELECT_ONE,
  K1_VISA_CLASS,
  K1_SPECIFY_FIANCE,
  K1_SPECIFY_OPTIONS,
  K1_DEFAULT_SPECIFY,
  K1_PAYER_OPTIONS,
  K1_DEFAULT_PAYER,
  CHILD_RELATIONSHIP_QUESTION_LABEL,
  CHILD_RELATIONSHIP_OPTIONS,
  PARENT_RELATIONSHIP_OPTIONS,
  SIBLING_RELATIONSHIP_OPTIONS,
  SIBLING_ADOPTION_QUESTION_LABEL,
  normalizeI130ACaseText,
  safeIsAffirmativeValue,
  isChildPetitionCase,
  isParentPetitionCase,
  isSiblingPetitionCase,
  getChildRelationshipDescriptionValue,
  getParentRelationshipDetailValue,
  getSiblingRelationshipValue,
  getSiblingAdoptionValue,
  normalizeChildRelationshipOption,
  normalizeParentRelationshipOptions,
  renderParentRelationshipValue,
  normalizeSiblingRelationshipOptions,
  renderSiblingRelationshipValue,
  getCellPrintableValue,
  safePdfName,
  normalizeChecklistColgroup,
  normalizeText,
  shouldRenderLowercaseEmail,
  normalizeEmailDisplayValue,
  normalizeK1SpecifyValue,
  getK1SpecifySelectedValue,
  applyK1SpecifyColor,
  normalizeK1PayerValue,
  getK1PayerDefaultValue,
  getK1PayerSelectedValue,
  applyK1PayerColor,
  isCompanionTravelQuestion,
  isCompanionGroupQuestion,
  getCheckedYesNoValue,
  syncCompanionDetailRows,
  getI130ARowLabel,
  isLawfulPermanentResidentStatus,
  shouldLiveAtCurrentMailingAddressFromRenderedRows,
  escapeHtml,
  plainTextToCellHtml,
  setCaretToEnd,
  normalizeSpouseAddressOptionValue,
  getSpouseAddressOptionValue,
  isSpouseAddressOptionSource,
  syncSpouseAddressOptionChecks,
  clearSpouseAddressOptionCell,
  stripHtml,
  getAllSocialMediaValue,
  inferSocialMediaProvider,
  getSocialMediaProvider,
  getSocialMediaAccounts,
  isAffirmativeValue,
  splitPersonName,
  normalizeRelationship,
  parseCompanionLine,
  fillYesNoCell,
  fillImmigrantStatusCell,
  i130aAppendixEscapeHtml,
  i130aAppendixNormalize,
  i130aAppendixDisplayValue,
  i130aAppendixFirstValue,
  i130aAppendixPick,
  i130aAppendixSplitName,
  i130aAppendixSplitParentName,
  i130aAppendixFormatDate,
  formatI130DateMMDDYYYY,
  i130aAppendixIsLocalAddressPart,
  i130aAppendixCountryOnly,
  i130aAppendixCityOnly,
  i130aAppendixIsBaoLanhVoChongCase,
  i130aAppendixParseSortDate,
  i130aAppendixGetBeneficiaryData,
  i130aAppendixGetParent,
  i130aAppendixGetAddressList,
  i130aAppendixGetJobList,
  normalizeI130ARelationshipText,
  resolveI130APetitionSectionTitle
} from '../../../../forms/i130/shared/i130a-word-paper-helpers.js'

const props = defineProps({
  mode: String,
  formType: String,
  customerData: Object,
  currentUser: Object,
  reviewers: Array,
  selectedReviewer: [String, Number],
  signatures: { type: Object, default: null },
  // Comment theo dòng của phiếu đã kiểm tra, chỉ dùng khi xuất PDF.
  comments: { type: Array, default: () => [] }
})

const emit = defineEmits(['change', 'submit-form', 'update:selectedReviewer'])

const paperRef = ref(null)
const rawHtml = ref('')
const changes = ref({})











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
// I-130A checker is intentionally isolated from DS-160.
// It always loads the I-130A template, regardless of the selected DS-160 form file.
watch(() => props.formType, () => { loadFormHtml() })
watch(() => props.customerData, (d) => {
  if (d) { 
    nextTick(() => {
      convertYesNoCells()
      convertImmigrantStatusCells()
      convertSpouseAddressOptionCells()
      syncRelationshipQuestionRow(d)
      autoFillData(d)
      convertRelationshipQuestionCells(d)
      convertSiblingRelationshipCells(d)
      injectHeaderControls()
      if (props.mode === 'review' || props.mode === 'view') copyDataToNoteForReviewer()
    }) 
  }
  else { nextTick(() => resetTable(true)) }
})
watch([() => props.selectedReviewer, () => props.reviewers, () => props.currentUser], () => {
  nextTick(() => injectHeaderControls())
})


function centerI130ASectionHeaders(root = paperRef.value) {
  if (!root) return
  root.querySelectorAll('td[colspan="26"]').forEach(td => {
    td.style.textAlign = 'center'
    td.style.verticalAlign = 'middle'
  })
}

async function loadFormHtml() {
  try {
    const formFileName = 'i130a'
    const res = await fetch(`/forms/${formFileName}.html`)
    if (!res.ok) {
      rawHtml.value = `<div style="padding:40px;text-align:center;color:#94a3b8;">
        Không tìm thấy mẫu phiếu: <strong>i130a.html</strong><br>
        Hãy đặt file HTML vào thư mục <code>public/forms/</code>
      </div>`
      return
    }
    rawHtml.value = await res.text()
    await nextTick()
    try {
      initInteractiveTable()
      centerI130ASectionHeaders()
      convertYesNoCells()
      convertImmigrantStatusCells()
      convertSpouseAddressOptionCells()
      if (props.customerData) {
        syncRelationshipQuestionRow(props.customerData)
        autoFillData(props.customerData)
        convertRelationshipQuestionCells(props.customerData)
        convertSiblingRelationshipCells(props.customerData)
        injectHeaderControls()
        if (props.mode === 'review' || props.mode === 'view') copyDataToNoteForReviewer()
      } else {
        syncRelationshipQuestionRow({})
        convertSiblingRelationshipCells({})
        injectHeaderControls()
      }
    } catch (initError) {
      // The HTML template loaded successfully; keep it visible and log the real processing error.
      console.error('Loi xu ly form I-130A sau khi tai HTML:', initError)
      injectHeaderControls()
    }
  } catch (e) {
    console.error('Lỗi tải form:', e)
    rawHtml.value = '<div style="color:red;padding:40px;">Lỗi tải form!</div>'
  }
}













function findChildRelationshipRow() {
  if (!paperRef.value) return null
  const normalizedTarget = CHILD_RELATIONSHIP_QUESTION_LABEL.toUpperCase()
  return Array.from(paperRef.value.querySelectorAll('tr')).find(row => {
    const cells = Array.from(row.children)
    return cells.some(cell => String(cell.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase() === normalizedTarget)
  }) || null
}

function syncRelationshipQuestionRow(data = props.customerData || {}) {
  const row = findChildRelationshipRow()
  if (!row) return
  row.style.display = (isChildPetitionCase(data) || isParentPetitionCase(data)) ? '' : 'none'
}



function convertRelationshipQuestionCells(data = props.customerData || {}) {
  const row = findChildRelationshipRow()
  if (!row) return
  syncRelationshipQuestionRow(data)
  if (isParentPetitionCase(data)) {
    convertParentRelationshipCheckboxCells(data)
    return
  }
  if (!isChildPetitionCase(data)) return

  const labelCell = Array.from(row.children).find(cell => String(cell.textContent || '').includes(CHILD_RELATIONSHIP_QUESTION_LABEL))
  let dataCell = labelCell?.nextElementSibling
  while (dataCell && !dataCell.classList.contains('data-cell')) dataCell = dataCell.nextElementSibling
  if (!dataCell) return

  const currentValue = normalizeChildRelationshipOption(
    getChildRelationshipDescriptionValue(data) ||
    dataCell.dataset.filledValue ||
    dataCell.textContent ||
    ''
  )

  if (props.mode !== 'create') {
    if (currentValue) {
      dataCell.innerHTML = normalizeText(currentValue)
      dataCell.dataset.filled = 'true'
      dataCell.dataset.filledValue = normalizeText(currentValue)
      dataCell.classList.add('color-customer')
    }
    return
  }

  dataCell.setAttribute('contenteditable', 'false')
  dataCell.dataset.childRelationshipSelect = 'true'
  dataCell.classList.add('child-relationship-select-cell')

  const select = document.createElement('select')
  select.className = 'child-relationship-select'
  select.style.width = '100%'
  select.style.fontFamily = 'inherit'
  select.style.fontSize = 'inherit'
  select.style.fontWeight = '700'
  select.style.color = '#9a4a16'
  select.style.border = '1px solid #cbd5e1'
  select.style.borderRadius = '4px'
  select.style.padding = '3px 6px'
  select.style.background = '#fff'

  CHILD_RELATIONSHIP_OPTIONS.forEach(optionText => {
    const option = document.createElement('option')
    option.value = optionText
    option.textContent = optionText || '-- Chọn quan hệ --'
    select.appendChild(option)
  })

  select.value = CHILD_RELATIONSHIP_OPTIONS.includes(currentValue) ? currentValue : ''
  dataCell.innerHTML = ''
  dataCell.appendChild(select)
  if (select.value) {
    dataCell.dataset.filled = 'true'
    dataCell.dataset.filledValue = select.value
    dataCell.classList.add('color-filler')
  }

  select.addEventListener('change', () => {
    const selected = select.value
    dataCell.dataset.filledValue = selected
    dataCell.classList.remove('color-customer', 'color-reviewer')
    if (selected) {
      dataCell.dataset.filled = 'true'
      dataCell.classList.add('color-filler')
      changes.value[dataCell.dataset.cellId] = selected
    } else {
      delete dataCell.dataset.filled
      dataCell.classList.remove('color-filler')
      delete changes.value[dataCell.dataset.cellId]
    }
    emit('change', { ...changes.value })
  })
}



function convertParentRelationshipCheckboxCells(data = props.customerData || {}) {
  const row = findChildRelationshipRow()
  if (!row) return

  const labelCell = Array.from(row.children).find(cell => String(cell.textContent || '').includes(CHILD_RELATIONSHIP_QUESTION_LABEL))
  let dataCell = labelCell?.nextElementSibling
  while (dataCell && !dataCell.classList.contains('data-cell')) dataCell = dataCell.nextElementSibling
  if (!dataCell) return

  const selectedOptions = normalizeParentRelationshipOptions(
    getParentRelationshipDetailValue(data) ||
    dataCell.dataset.filledValue ||
    dataCell.textContent ||
    ''
  )

  if (props.mode !== 'create') {
    const value = renderParentRelationshipValue(selectedOptions)
    if (value) {
      dataCell.innerHTML = normalizeText(value)
      dataCell.dataset.filled = 'true'
      dataCell.dataset.filledValue = normalizeText(value)
      dataCell.classList.add('color-customer')
    }
    return
  }

  dataCell.setAttribute('contenteditable', 'false')
  dataCell.dataset.parentRelationshipCheckbox = 'true'
  dataCell.classList.add('parent-relationship-checkbox-cell')
  dataCell.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.gap = '16px'
  wrapper.style.alignItems = 'center'
  wrapper.style.flexWrap = 'wrap'

  const updateValue = () => {
    const checked = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value)
    const value = renderParentRelationshipValue(checked)
    dataCell.dataset.filledValue = value
    dataCell.classList.remove('color-customer', 'color-reviewer')
    if (value) {
      dataCell.dataset.filled = 'true'
      dataCell.classList.add('color-filler')
      changes.value[dataCell.dataset.cellId] = value
    } else {
      delete dataCell.dataset.filled
      dataCell.classList.remove('color-filler')
      delete changes.value[dataCell.dataset.cellId]
    }
    emit('change', { ...changes.value })
  }

  PARENT_RELATIONSHIP_OPTIONS.forEach(optionText => {
    const label = document.createElement('label')
    label.style.display = 'inline-flex'
    label.style.alignItems = 'center'
    label.style.gap = '5px'
    label.style.fontWeight = '700'
    label.style.color = '#9a4a16'
    label.style.cursor = 'pointer'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = optionText
    checkbox.checked = selectedOptions.includes(optionText)
    checkbox.addEventListener('change', updateValue)

    const text = document.createElement('span')
    text.textContent = optionText

    label.appendChild(checkbox)
    label.appendChild(text)
    wrapper.appendChild(label)
  })

  dataCell.appendChild(wrapper)
  if (selectedOptions.length > 0) {
    dataCell.dataset.filled = 'true'
    dataCell.dataset.filledValue = renderParentRelationshipValue(selectedOptions)
    dataCell.classList.add('color-filler')
  }
}


function findQuestionRowByExactLabel(labelText) {
  if (!paperRef.value) return null
  const normalizedTarget = String(labelText || '').replace(/\s+/g, ' ').trim().toUpperCase()
  return Array.from(paperRef.value.querySelectorAll('tr')).find(row => {
    const cells = Array.from(row.children)
    return cells.some(cell => String(cell.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase() === normalizedTarget)
  }) || null
}

function findPetitionRelationshipRow() {
  return findQuestionRowByExactLabel('For whom are you filing this petition?')
}



function findOrCreateSiblingAdoptionRow(afterRow, show) {
  if (!paperRef.value || !afterRow) return null
  let row = findQuestionRowByExactLabel(SIBLING_ADOPTION_QUESTION_LABEL)
  if (!row && show) {
    row = document.createElement('tr')
    row.className = afterRow.classList.contains('odd') ? 'even sibling-adoption-question-row' : 'odd sibling-adoption-question-row'

    const noCell = document.createElement('td')
    noCell.setAttribute('colspan', '2')
    noCell.innerHTML = '<strong></strong>'

    const labelCell = document.createElement('td')
    labelCell.setAttribute('colspan', '11')
    labelCell.textContent = SIBLING_ADOPTION_QUESTION_LABEL

    const dataCell = document.createElement('td')
    dataCell.setAttribute('colspan', '13')
    dataCell.className = 'data-cell sibling-adoption-data-cell'
    dataCell.dataset.cellId = `data_sibling_adoption_${Date.now()}`
    dataCell.dataset.originalHtml = ''
    dataCell.textContent = ''

    row.appendChild(noCell)
    row.appendChild(labelCell)
    row.appendChild(dataCell)
    afterRow.insertAdjacentElement('afterend', row)
  }
  if (row) row.style.display = show ? '' : 'none'
  return row
}

function convertSiblingRelationshipCells(data = props.customerData || {}) {
  const isSibling = isSiblingPetitionCase(data)
  const petitionRow = findPetitionRelationshipRow()
  if (!petitionRow) return

  const labelCell = Array.from(petitionRow.children).find(cell => String(cell.textContent || '').includes('For whom are you filing this petition?'))
  let petitionDataCell = labelCell?.nextElementSibling
  while (petitionDataCell && !petitionDataCell.classList.contains('data-cell')) petitionDataCell = petitionDataCell.nextElementSibling

  if (!isSibling) {
    const adoptionRow = findOrCreateSiblingAdoptionRow(petitionRow, false)
    if (adoptionRow) adoptionRow.style.display = 'none'
    return
  }

  const selectedOptions = normalizeSiblingRelationshipOptions(
    getSiblingRelationshipValue(data) ||
    petitionDataCell?.dataset.filledValue ||
    petitionDataCell?.textContent ||
    ''
  )

  if (petitionDataCell) {
    if (props.mode !== 'create') {
      const value = renderSiblingRelationshipValue(selectedOptions) || 'SIBLING'
      petitionDataCell.innerHTML = normalizeText(value)
      petitionDataCell.dataset.filled = 'true'
      petitionDataCell.dataset.filledValue = normalizeText(value)
      petitionDataCell.classList.add('color-customer')
    } else {
      petitionDataCell.setAttribute('contenteditable', 'false')
      petitionDataCell.dataset.siblingRelationshipCheckbox = 'true'
      petitionDataCell.classList.add('sibling-relationship-checkbox-cell')
      petitionDataCell.innerHTML = ''

      const wrapper = document.createElement('div')
      wrapper.style.display = 'flex'
      wrapper.style.gap = '16px'
      wrapper.style.alignItems = 'center'
      wrapper.style.flexWrap = 'wrap'

      const updateValue = () => {
        const checked = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value)
        const value = renderSiblingRelationshipValue(checked)
        petitionDataCell.dataset.filledValue = value
        petitionDataCell.classList.remove('color-customer', 'color-reviewer')
        if (value) {
          petitionDataCell.dataset.filled = 'true'
          petitionDataCell.classList.add('color-filler')
          changes.value[petitionDataCell.dataset.cellId] = value
        } else {
          delete petitionDataCell.dataset.filled
          petitionDataCell.classList.remove('color-filler')
          delete changes.value[petitionDataCell.dataset.cellId]
        }
        emit('change', { ...changes.value })
      }

      SIBLING_RELATIONSHIP_OPTIONS.forEach(optionText => {
        const label = document.createElement('label')
        label.style.display = 'inline-flex'
        label.style.alignItems = 'center'
        label.style.gap = '5px'
        label.style.fontWeight = '700'
        label.style.color = '#9a4a16'
        label.style.cursor = 'pointer'

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.value = optionText
        checkbox.checked = selectedOptions.includes(optionText)
        checkbox.addEventListener('change', updateValue)

        const text = document.createElement('span')
        text.textContent = optionText

        label.appendChild(checkbox)
        label.appendChild(text)
        wrapper.appendChild(label)
      })

      petitionDataCell.appendChild(wrapper)
      if (selectedOptions.length > 0) {
        petitionDataCell.dataset.filled = 'true'
        petitionDataCell.dataset.filledValue = renderSiblingRelationshipValue(selectedOptions)
        petitionDataCell.classList.add('color-filler')
      }
    }
  }

  const adoptionRow = findOrCreateSiblingAdoptionRow(petitionRow, true)
  if (!adoptionRow) return
  const adoptionLabelCell = Array.from(adoptionRow.children).find(cell => String(cell.textContent || '').includes(SIBLING_ADOPTION_QUESTION_LABEL))
  let adoptionDataCell = adoptionLabelCell?.nextElementSibling
  while (adoptionDataCell && !adoptionDataCell.classList.contains('data-cell')) adoptionDataCell = adoptionDataCell.nextElementSibling
  if (!adoptionDataCell) return

  const current = getSiblingAdoptionValue(data) || adoptionDataCell.dataset.filledValue || adoptionDataCell.textContent || ''
  const selected = safeIsAffirmativeValue(current) ? 'YES' : (String(current || '').trim() ? 'NO' : '')

  if (props.mode !== 'create') {
    if (selected) {
      adoptionDataCell.innerHTML = normalizeText(selected)
      adoptionDataCell.dataset.filled = 'true'
      adoptionDataCell.dataset.filledValue = normalizeText(selected)
      adoptionDataCell.classList.add('color-customer')
    }
    return
  }

  adoptionDataCell.setAttribute('contenteditable', 'false')
  adoptionDataCell.dataset.siblingAdoptionCheckbox = 'true'
  adoptionDataCell.classList.add('sibling-adoption-checkbox-cell')
  adoptionDataCell.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.gap = '16px'
  wrapper.style.alignItems = 'center'
  wrapper.style.flexWrap = 'wrap'

  const updateValue = (selectedValue) => {
    Array.from(wrapper.querySelectorAll('input[type="checkbox"]')).forEach(input => {
      input.checked = input.value === selectedValue
    })
    adoptionDataCell.dataset.filledValue = selectedValue
    adoptionDataCell.classList.remove('color-customer', 'color-reviewer')
    if (selectedValue) {
      adoptionDataCell.dataset.filled = 'true'
      adoptionDataCell.classList.add('color-filler')
      changes.value[adoptionDataCell.dataset.cellId] = selectedValue
    } else {
      delete adoptionDataCell.dataset.filled
      adoptionDataCell.classList.remove('color-filler')
      delete changes.value[adoptionDataCell.dataset.cellId]
    }
    emit('change', { ...changes.value })
  }

  ;['YES', 'NO'].forEach(optionText => {
    const label = document.createElement('label')
    label.style.display = 'inline-flex'
    label.style.alignItems = 'center'
    label.style.gap = '5px'
    label.style.fontWeight = '700'
    label.style.color = '#9a4a16'
    label.style.cursor = 'pointer'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = optionText
    checkbox.checked = selected === optionText
    checkbox.addEventListener('change', () => updateValue(checkbox.checked ? optionText : ''))

    const text = document.createElement('span')
    text.textContent = optionText

    label.appendChild(checkbox)
    label.appendChild(text)
    wrapper.appendChild(label)
  })

  adoptionDataCell.appendChild(wrapper)
  if (selected) {
    adoptionDataCell.dataset.filled = 'true'
    adoptionDataCell.dataset.filledValue = selected
    adoptionDataCell.classList.add('color-filler')
  }
}

function injectHeaderControls() {
  if (!paperRef.value) return
  const dienDonCell = paperRef.value.querySelector('#header-dien-don')
  const kiemTraCell = paperRef.value.querySelector('#header-kiem-tra')
  const submitCell = paperRef.value.querySelector('#header-submit-cell')
  if (!dienDonCell && !kiemTraCell) return

  const normalizeId = (value) => String(value ?? '').trim()

  const getReviewerId = (reviewer) => normalizeId(
    reviewer?.id ??
    reviewer?.user_id ??
    reviewer?.userId ??
    reviewer?.reviewer_id ??
    reviewer?.reviewerId ??
    reviewer?.ID
  )

  const getReviewerName = (reviewer) => String(
    reviewer?.name ??
    reviewer?.display_name ??
    reviewer?.displayName ??
    reviewer?.full_name ??
    reviewer?.fullName ??
    reviewer?.username ??
    reviewer?.user_login ??
    reviewer?.email ??
    ''
  ).trim()

  const findReviewerById = (id) => {
    const targetId = normalizeId(id)
    if (!targetId || !Array.isArray(props.reviewers)) return null
    return props.reviewers.find(r => getReviewerId(r) === targetId) || null
  }

  const resolveSelectedReviewer = () => {
    const select = kiemTraCell?.querySelector('select')
    const selectedId = normalizeId(select?.value || props.selectedReviewer || props.customerData?.reviewerId || props.customerData?.reviewer_id || '')
    const selectedOptionName = select?.selectedOptions?.[0]?.textContent?.trim() || ''
    const selectedReviewer = findReviewerById(selectedId)
    const reviewerName = getReviewerName(selectedReviewer) || (/^--/.test(selectedOptionName) ? '' : selectedOptionName)

    return {
      reviewerId: selectedId,
      reviewer_id: selectedId,
      reviewerName,
      reviewer_name: reviewerName
    }
  }

  const resolveReviewerNameForDisplay = () => {
    const directName = String(
      props.customerData?.reviewerName ??
      props.customerData?.reviewer_name ??
      props.customerData?.reviewer_full_name ??
      props.customerData?.reviewerFullName ??
      props.customerData?.checkerName ??
      props.customerData?.checker_name ??
      props.customerData?.employee_b_name ??
      props.customerData?.employeeBName ??
      ''
    ).trim()

    if (directName) return directName

    const reviewerId = normalizeId(
      props.customerData?.reviewerId ??
      props.customerData?.reviewer_id ??
      props.customerData?.checkerId ??
      props.customerData?.checker_id ??
      props.customerData?.employee_b_id ??
      props.customerData?.employeeBId ??
      props.selectedReviewer ??
      ''
    )

    const reviewer = findReviewerById(reviewerId)
    return getReviewerName(reviewer)
  }

  // ── Ô "Điền đơn": hiển thị tên người điền
  if (dienDonCell) {
    const fillerName = props.mode === 'create'
      ? (props.currentUser?.name || props.customerData?.fillerName || '')
      : (props.customerData?.fillerName || props.customerData?.filler_name || props.customerData?.employee_a_name || props.currentUser?.name || '')
    dienDonCell.innerHTML = fillerName
      ? `<span style="font-weight:600;color:#1d4ed8;">${fillerName}</span>`
      : ''
  }

  // ── Ô "Kiểm tra": dropdown chọn reviewer (filler mode) hoặc tên reviewer (review/view mode)
  if (kiemTraCell) {
    if (props.mode === 'create' && props.reviewers?.length) {
      if (!kiemTraCell.querySelector('select')) {
        const sel = document.createElement('select')
        sel.style.cssText = 'width:100%;padding:4px 6px;border:1px solid #c7d2fe;border-radius:4px;font-size:12px;font-family:inherit;background:#fff;outline:none;'
        const defaultOpt = document.createElement('option')
        defaultOpt.value = ''
        defaultOpt.textContent = '-- Chọn người kiểm tra --'
        sel.appendChild(defaultOpt)
        props.reviewers.forEach(r => {
          const opt = document.createElement('option')
          opt.value = getReviewerId(r)
          opt.textContent = getReviewerName(r) || opt.value
          sel.appendChild(opt)
        })
        sel.value = normalizeId(props.selectedReviewer || props.customerData?.reviewerId || props.customerData?.reviewer_id || '')
        sel.addEventListener('change', (e) => {
          emit('update:selectedReviewer', e.target.value)
        })
        kiemTraCell.innerHTML = ''
        kiemTraCell.appendChild(sel)
      } else {
        kiemTraCell.querySelector('select').value = normalizeId(props.selectedReviewer || props.customerData?.reviewerId || props.customerData?.reviewer_id || '')
      }
    } else if (props.mode === 'review' || props.mode === 'view') {
      const reviewerName = resolveReviewerNameForDisplay()
      kiemTraCell.innerHTML = reviewerName
        ? `<span style="font-weight:600;color:#dc2626;">${reviewerName}</span>`
        : ''
    }
  }

  // ── Ô Submit: nút Submit (filler) hoặc Hoàn Tất (reviewer)
  if (submitCell) {
    if (props.mode === 'create' && !submitCell.querySelector('button')) {
      const btn = document.createElement('button')
      btn.textContent = '✅ Submit Phiếu'
      btn.style.cssText = 'padding:6px 14px;background:#6366f1;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;'
      btn.addEventListener('mouseenter', () => { btn.style.background = '#818cf8' })
      btn.addEventListener('mouseleave', () => { btn.style.background = '#6366f1' })
      btn.addEventListener('click', () => {
        const reviewer = resolveSelectedReviewer()
        emit('submit-form', reviewer)
      })
      submitCell.innerHTML = ''
      submitCell.appendChild(btn)
    } else if (props.mode === 'review' && !submitCell.querySelector('button')) {
      const btn = document.createElement('button')
      btn.textContent = '✅ Hoàn Tất KT'
      btn.style.cssText = 'padding:6px 14px;background:#16a34a;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;width:100%;'
      btn.addEventListener('mouseenter', () => { btn.style.background = '#15803d' })
      btn.addEventListener('mouseleave', () => { btn.style.background = '#16a34a' })
      btn.addEventListener('click', () => emit('submit-form', { complete: true }))
      submitCell.innerHTML = ''
      submitCell.appendChild(btn)
    }

    // ── Hiển thị tổng số mục đã sửa (review / view mode)
    if (props.mode === 'review' || props.mode === 'view') {
      if (!submitCell.querySelector('.correction-count-badge')) {
        const badge = document.createElement('div')
        badge.className = 'correction-count-badge'
        badge.style.cssText = 'margin-top:6px;padding:4px 8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;font-size:12px;font-weight:700;color:#dc2626;text-align:center;white-space:nowrap;'
        badge.textContent = 'Tổng sửa: 0'
        submitCell.appendChild(badge)
      }
      updateCorrectionCountDisplay()
    }
  }
}

function getReviewerCorrectionCount() {
  if (!paperRef.value) return 0
  const changedRows = new Set()

  const hasReviewerValue = (cell) => {
    const val = getCellPrintableValue(cell)
    return cell?.classList?.contains('color-reviewer') && val && val !== '<br>' && val !== '__CLEARED__'
  }

  // Chỉ đếm ô thật sự do tư vấn sửa, tính theo dòng (nhiều ô trên cùng 1 dòng chỉ tính 1 lỗi).
  paperRef.value.querySelectorAll('.note-cell, .data-cell.color-reviewer').forEach(cell => {
    if (!hasReviewerValue(cell)) return
    const row = cell.closest('tr')
    if (row) {
      changedRows.add(row)
    }
  })

  return changedRows.size
}

function updateCorrectionCountDisplay() {
  if (!paperRef.value) return
  const badge = paperRef.value.querySelector('.correction-count-badge')
  if (!badge) return
  const count = getReviewerCorrectionCount()
  badge.textContent = `Tổng sửa: ${count}`
  badge.style.background = count > 0 ? '#fef2f2' : '#f0fdf4'
  badge.style.borderColor = count > 0 ? '#fca5a5' : '#bbf7d0'
  badge.style.color = count > 0 ? '#dc2626' : '#16a34a'
}




function preparePdfClone() {
  const source = paperRef.value
  const clone = source.cloneNode(true)
  clone.classList.add('pdf-export-paper')

  // Lấy đúng chiều rộng đang hiển thị của phiếu để PDF giữ bố cục giống màn hình.
  const sourceRect = source.getBoundingClientRect()
  const sourceWidth = Math.ceil(source.scrollWidth || source.offsetWidth || sourceRect.width || 1500)

  clone.style.width = `${sourceWidth}px`
  clone.style.minWidth = `${sourceWidth}px`
  clone.style.maxWidth = 'none'
  clone.style.background = '#ffffff'
  clone.style.margin = '0'
  clone.style.padding = '0'
  clone.style.transform = 'none'
  clone.style.boxSizing = 'border-box'
  clone.style.overflow = 'visible'

  // CSS riêng cho bản export: ép lại table/border/font để giống phiếu kiểm tra trên màn hình.
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
      max-width: none !important;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      table-layout: fixed !important;
      margin: 0 0 10px 0 !important;
      background: #fff !important;
    }
    .pdf-export-paper td,
    .pdf-export-paper th {
      border: 1px solid #000 !important;
      padding: 4px 6px !important;
      vertical-align: middle !important;
      background-clip: padding-box !important;
      line-height: 1.25 !important;
      font-size: inherit !important;
    }
    .pdf-export-paper th,
    .pdf-export-paper strong {
      font-weight: 700 !important;
    }
    .pdf-export-paper img {
      max-width: 100% !important;
      height: auto !important;
    }
    .pdf-export-paper .color-customer {
      color: #9a3b0c !important;
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
      accent-color: #9a3b0c !important;
    }
    .pdf-export-paper .spouse-address-option-label {
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin: 1px 0 !important;
      line-height: 1.25 !important;
      font-weight: 700 !important;
      white-space: nowrap !important;
    }
    .pdf-export-paper .spouse-address-option-check {
      width: 13px !important;
      height: 13px !important;
      margin: 0 4px 0 0 !important;
      vertical-align: middle !important;
      accent-color: #9a3b0c !important;
    }
    .pdf-export-paper .trip-add-btn,
    .pdf-export-paper button {
      display: none !important;
    }
    .pdf-export-paper .correction-count-badge {
      display: block !important;
      margin: 4px auto !important;
      padding: 6px 10px !important;
      border-radius: 6px !important;
      font-size: 17px !important;
      font-weight: 700 !important;
      text-align: center !important;
      white-space: nowrap !important;
      font-family: "Times New Roman", Times, serif !important;
    }
  `
  clone.prepend(style)

  clone.querySelectorAll('[contenteditable]').forEach(el => {
    el.removeAttribute('contenteditable')
  })

  // Không đưa nút thao tác vào PDF, nhưng vẫn giữ nguyên ô/bố cục bảng.
  clone.querySelectorAll('button').forEach(button => button.remove())
  const submitCell = clone.querySelector('#header-submit-cell')
  if (submitCell) {
    // Giữ badge tổng sửa trong PDF, chỉ xóa các phần tử khác (button đã xóa ở trên)
    const badge = submitCell.querySelector('.correction-count-badge')
    if (badge) {
      // Tính lại count trước khi export (dùng count từ DOM gốc)
      const count = getReviewerCorrectionCount()
      badge.textContent = `Tổng sửa: ${count}`
      badge.style.cssText = [
        'margin:4px auto',
        'padding:6px 10px',
        `background:${count > 0 ? '#fef2f2' : '#f0fdf4'}`,
        `border:2px solid ${count > 0 ? '#f87171' : '#86efac'}`,
        'border-radius:6px',
        'font-size:17px',
        'font-weight:700',
        `color:${count > 0 ? '#dc2626' : '#16a34a'}`,
        'text-align:center',
        'white-space:nowrap',
        'font-family:"Times New Roman", Times, serif'
      ].join(';')
      submitCell.innerHTML = ''
      submitCell.appendChild(badge)
    } else {
      // Nếu không có badge (mode create), tạo mới với count
      const count = getReviewerCorrectionCount()
      if (count > 0) {
        const newBadge = document.createElement('div')
        newBadge.className = 'correction-count-badge'
        newBadge.textContent = `Tổng sửa: ${count}`
        newBadge.style.cssText = [
          'margin:4px auto',
          'padding:6px 10px',
          'background:#fef2f2',
          'border:2px solid #f87171',
          'border-radius:6px',
          'font-size:13px',
          'font-weight:700',
          'color:#dc2626',
          'text-align:center',
          'white-space:nowrap',
          'font-family:"Times New Roman", Times, serif'
        ].join(';')
        submitCell.innerHTML = ''
        submitCell.appendChild(newBadge)
      } else {
        submitCell.innerHTML = ''
      }
    }
  }

  // Dropdown: trên PDF cần hiển thị đúng text + đúng màu theo nguồn dữ liệu.
  clone.querySelectorAll('select').forEach(select => {
    const selected = select.options[select.selectedIndex]?.textContent || ''
    const parentCell = select.closest('td')
    const span = document.createElement('span')
    span.textContent = selected.replace(/^--.*--$/, '')
    span.style.fontWeight = '700'
    span.style.fontFamily = 'inherit'

    if (parentCell?.classList.contains('color-filler')) {
      span.style.color = '#1d4ed8'
    } else if (parentCell?.classList.contains('color-reviewer')) {
      span.style.color = '#dc2626'
    } else if (parentCell?.classList.contains('color-customer')) {
      span.style.color = '#9a3b0c'
    }

    select.replaceWith(span)
  })

  // Cột TƯ VẤN: nếu reviewer không chọn YES/NO thì không in nhóm checkbox trống ra PDF.
  clone.querySelectorAll('.note-cell.yesno-cell').forEach(cell => {
    const hasChecked = cell.querySelector('.yesno-check:checked')
    if (!hasChecked) {
      cell.innerHTML = ''
      cell.classList.remove('yesno-cell')
    }
  })
  clone.querySelectorAll('.note-cell.immigrant-status-cell').forEach(cell => {
    const hasChecked = cell.querySelector('.immigrant-status-check:checked')
    if (!hasChecked) {
      cell.innerHTML = ''
      cell.classList.remove('immigrant-status-cell')
    }
  })
  clone.querySelectorAll('.note-cell.spouse-address-option-cell').forEach(cell => {
    const hasChecked = cell.querySelector('.spouse-address-option-check:checked')
    if (!hasChecked) {
      cell.innerHTML = ''
      cell.classList.remove('spouse-address-option-cell')
    }
  })

  // Giữ nguyên checkbox HTML như giao diện. Chỉ đồng bộ trạng thái checked/disabled.
  clone.querySelectorAll('.yesno-check, .spouse-address-option-check, .immigrant-status-check').forEach(chk => {
    if (chk.checked) chk.setAttribute('checked', 'checked')
    else chk.removeAttribute('checked')
    chk.setAttribute('disabled', 'disabled')
  })

  // Copy một số computed style quan trọng để html2canvas không bị rơi CSS khi clone.
  clone.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el)
    if (!el.style.fontFamily) el.style.fontFamily = style.fontFamily
    if (!el.style.fontSize) el.style.fontSize = style.fontSize
    if (!el.style.fontWeight) el.style.fontWeight = style.fontWeight
    if (!el.style.lineHeight) el.style.lineHeight = style.lineHeight
    if (!el.style.textAlign) el.style.textAlign = style.textAlign
    if (!el.style.verticalAlign) el.style.verticalAlign = style.verticalAlign
    if (!el.style.borderColor) el.style.borderColor = style.borderColor
  })

  // Chữ ký điện tử vẽ trên canvas không đi theo cloneNode -> dựng lại từ ảnh đã lưu.
  appendCommentsToClone(clone, props.comments)
  appendSignatureBlockToClone(clone, props.signatures)

  return clone
}



async function exportPdf() {
  if (!paperRef.value) return false

  try {
    const baseName = safePdfName(props.customerData?.fullName || props.customerData?.customerName || 'DS160')

    // 1. Tạo bản clone sạch của phiếu (tái sử dụng preparePdfClone đã có)
    const clone = preparePdfClone()

    // Gỡ chiều rộng pixel cố định (do preparePdfClone gán cho html2canvas)
    // để trình duyệt tự co giãn bảng vừa khít trang A4, không bị thu nhỏ chữ.
    clone.style.width = '100%'
    clone.style.minWidth = '0'
    clone.style.maxWidth = '100%'

    // 2. Tạo iframe ẩn để in RIÊNG phiếu, không ảnh hưởng trang chính
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:900px;border:none;opacity:0;pointer-events:none;'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <title>${baseName}_phieu_kiem_tra</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0; padding: 0;
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
      background: #fff;
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
    th, strong, b { font-weight: 700; }
    th { text-align: center; }
    td[colspan="26"], td[colspan="24"], .appendix-section-row td {
      text-align: center !important;
      vertical-align: middle !important;
    }
    img { max-width: 100%; height: auto; display: block; }
    tr { page-break-inside: auto; }
    p { margin: 0; }
    ul { margin: 0; padding-left: 14px; }
    li p { margin: 0; }

    .color-customer { color: #9a3b0c !important; font-weight: 700 !important; }
    .color-filler { color: #1d4ed8 !important; font-weight: 700 !important; }
    .color-reviewer { color: #dc2626 !important; font-weight: 700 !important; }

    .yesno-label {
      display: inline-flex; align-items: center; gap: 3px;
      margin-right: 8px; white-space: nowrap;
    }
    .yesno-check, .spouse-address-option-check, .immigrant-status-check {
      width: 13px; height: 13px; margin: 0 3px 0 0; vertical-align: middle;
      accent-color: #9a3b0c;
    }
    .spouse-address-option-label {
      display: flex; align-items: center; gap: 4px;
      margin: 1px 0; line-height: 1.25; font-weight: 700; white-space: nowrap;
    }

    .correction-count-badge {
      display: block; margin: 4px auto; padding: 6px 10px;
      border-radius: 6px; font-size: 17px; font-weight: 700;
      text-align: center; white-space: nowrap;
      font-family: "Times New Roman", Times, serif;
    }

    .trip-add-btn, .education-add-btn, .employment-add-btn, .social-media-add-btn, button {
      display: none !important;
    }

    .diff-old { text-decoration: line-through; color: #94a3b8; }

    /* Không lặp lại tiêu đề bảng trên các trang sau */
    thead { display: table-row-group; }
  </style>
</head>
<body></body>
</html>`)
    iframeDoc.close()

    // 3. Chèn clone vào body của iframe
    iframeDoc.body.appendChild(clone)

    // 4. Đợi iframe render xong
    await new Promise(resolve => setTimeout(resolve, 300))

    // 5. Đổi tên trang chính tạm thời để Chrome dùng làm tên file PDF
    const originalTitle = document.title
    document.title = `${baseName}_phieu_kiem_tra`

    // 6. Gọi lệnh in trên iframe (chỉ in nội dung phiếu)
    iframe.contentWindow.focus()
    iframe.contentWindow.print()

    // 7. Phục hồi tên trang và dọn dẹp iframe
    document.title = originalTitle
    setTimeout(() => iframe.remove(), 1000)

    return true
  } catch (error) {
    console.error('Export PDF failed:', error)
    return false
  }
}



function initInteractiveTable() {
  if (!paperRef.value) return
  if (!paperRef.value.dataset.plainPasteBound) {
    paperRef.value.addEventListener('paste', handlePlainTextPaste)
    paperRef.value.dataset.plainPasteBound = 'true'
  }

  const tables = paperRef.value.querySelectorAll('table')
  if (tables.length < 3) return

  const checklistTable = tables[2]
  const thead = checklistTable.querySelector('thead')
  if (thead) {
    const ths = thead.querySelectorAll('th')
    ths.forEach(th => {
      const text = th.textContent.trim().toUpperCase()
      if (text === 'NOTE') {
        th.style.display = 'none'
      }
      if (text === 'XỬ LÝ' && (props.mode === 'review' || props.mode === 'view')) {
        th.innerHTML = '<strong>XỬ LÝ</strong>'
        const th2 = th.cloneNode(true)
        th2.innerHTML = '<strong>TƯ VẤN</strong>'
        th.parentNode.insertBefore(th2, th.nextSibling)
      }
    })
  }

  // Chỉnh lại colgroup: # 3%, HẠNG MỤC 47%, XỬ LÝ 28%, TƯ VẤN 22%
  // để phần XỬ LÝ/TƯ VẤN rộng hơn khi xuất PDF và khi xem trên màn hình.
  const colgroups = checklistTable.querySelectorAll('colgroup')
  if (colgroups.length > 0) {
    const colgroup = colgroups[0]
    const cols = colgroup.querySelectorAll('col')
    if (cols.length >= 26) {
      if (props.mode === 'review' || props.mode === 'view') {
        const refNode = cols[24]
        for (let i = 13; i < 24; i++) {
          const cloneCol = cols[i].cloneNode()
          colgroup.insertBefore(cloneCol, refNode)
        }
        normalizeChecklistColgroup(colgroup, true)
      } else {
        normalizeChecklistColgroup(colgroup, false)
      }
    }
  }

  const tbody = checklistTable.querySelector('tbody')
  if (!tbody) return

  const beneficiaryHeaders = [
    'VỢ CHỒNG',
    'NGƯỜI ĐƯỢC BẢO LÃNH',
    'SĐT + EMAIL NGƯỜI ĐƯỢC BẢO LÃNH',
    'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ',
    'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ',
    'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)',
    'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT',
    'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH',
    'THÔNG TIN NHẬP CƯ',
    'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH',
    'THỦ TỤC DI TRÚ',
    'VIỆC LÀM HIỆN TẠI',
    'THÔNG TIN GIA ĐÌNH NGƯỜI ĐƯỢC BẢO LÃNH',
    'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH',
    'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH',
    'THÔNG TIN CON',
    'ĐỊA ĐIỂM NỘP HỒ SƠ'
  ];

  const petitionerHeaders = [
    'PHẦN THÔNG TIN I-130',
    'TÊN NGƯỜI BẢO LÃNH',
    'SĐT + EMAIL',
    'ĐỊA CHỈ NHẬN THƯ',
    'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA',
    'MÔ TẢ BẢN THÂN',
    'VIỆC LÀM TRONG 5 NĂM QUA (NẾU THẤT NGHIỆP THÌ CHỈ CẦN GHI UNEMPLOYED Ở Ô NAME OF THE EMPLOYER)',
    'THÔNG TIN CƯ TRÚ',
    'THÔNG TIN CHO THƯỜNG TRÚ NHÂN',
    'THÔNG TIN CHO CÔNG DÂN MỸ',
    'THÔNG TIN GIA ĐÌNH',
    'CUỘC HÔN NHÂN HIỆN TẠI',
    'CUỘC HÔN NHÂN CŨ',
    'THÔNG TIN CHA',
    'THÔNG TIN MẸ',
    'THÔNG TIN THÊM',
  ];

  const allI130ASectionHeaders = [...beneficiaryHeaders, ...petitionerHeaders]
  const normalizeI130AHeaderText = (value) => normalizeText(String(value || '')).replace(/\s+/g, ' ').trim()
  const allI130ASectionHeaderSet = new Set(allI130ASectionHeaders.map(normalizeI130AHeaderText))
  const isI130ASectionTitle = (value) => allI130ASectionHeaderSet.has(normalizeI130AHeaderText(value))

  const centerAllI130ASectionRows = () => {
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const cells = Array.from(row.children).filter(cell => cell.tagName === 'TD' || cell.tagName === 'TH')
      if (!cells.length) return

      const fullSpanCell = cells.find(cell => {
        const colspan = parseInt(cell.getAttribute('colspan')) || 1
        return colspan >= 24 && isI130ASectionTitle(cell.textContent)
      })

      let sectionText = ''
      if (fullSpanCell) {
        sectionText = fullSpanCell.textContent.trim()
      } else {
        const matchedCell = cells.find(cell => isI130ASectionTitle(cell.textContent.trim()))
        if (!matchedCell) return
        sectionText = matchedCell.textContent.trim()
      }

      row.innerHTML = `<td colspan="26" style="text-align:center !important;vertical-align:middle !important;"><strong>${sectionText}</strong></td>`
    })
  }

  centerAllI130ASectionRows()

  // Reorder sections if it is a combined final form
  if (props.formType === 'i130a-final') {
    const rawRows = Array.from(tbody.querySelectorAll('tr'))
    const sections = []
    let currentSection = null

    rawRows.forEach(row => {
      const td26 = row.querySelector('td[colspan="26"]')
      if (td26) {
        const headerText = td26.textContent.trim()
        let type = 'other'
        if (beneficiaryHeaders.includes(headerText)) {
          type = 'beneficiary'
        } else if (petitionerHeaders.includes(headerText)) {
          type = 'petitioner'
        }
        currentSection = {
          name: headerText,
          type: type,
          rows: [row]
        }
        sections.push(currentSection)
      } else {
        if (currentSection) {
          currentSection.rows.push(row)
        } else {
          currentSection = {
            name: '',
            type: 'other',
            rows: [row]
          }
          sections.push(currentSection)
        }
      }
    })

    const petitionerSecs = sections.filter(s => s.type === 'petitioner')
    const beneficiarySecs = sections.filter(s => s.type === 'beneficiary')
    const otherSecs = sections.filter(s => s.type === 'other')
    const sortedSecs = [...petitionerSecs, ...beneficiarySecs, ...otherSecs]

    tbody.innerHTML = ''
    sortedSecs.forEach(sec => {
      sec.rows.forEach(r => {
        tbody.appendChild(r)
      })
    })
  }

  const rows = tbody.querySelectorAll('tr')
  let rowspans = new Array(26).fill(0)
  let cellId = 0
  let currentSectionVisible = true

  rows.forEach(row => {
    // Check if this row is a section header
    const td26 = row.querySelector('td[colspan="26"]')
    if (td26) {
      td26.style.textAlign = 'center'
      td26.style.verticalAlign = 'middle'
      const headerText = td26.textContent.trim()
      if (props.formType === 'i130a-nbl') {
        currentSectionVisible = !beneficiaryHeaders.includes(headerText)
      } else if (props.formType === 'i130a-ndbl') {
        currentSectionVisible = !petitionerHeaders.includes(headerText)
      } else {
        currentSectionVisible = true
      }
    }

    if (!currentSectionVisible) {
      row.style.display = 'none'
    }

    let colIdx = 0
    let dataCellsToClone = []

    Array.from(row.children).forEach(td => {
      while (colIdx < 26 && rowspans[colIdx] > 0) { rowspans[colIdx]--; colIdx++ }

      const colspan = parseInt(td.getAttribute('colspan')) || 1
      const rowspan = parseInt(td.getAttribute('rowspan')) || 1
      // Luôn luôn ẩn cột NOTE cũ (từ cột 24 trở đi)
      if (colIdx + colspan > 24) {
        const newColspan = 24 - colIdx
        if (newColspan <= 0) {
          td.style.display = 'none'
        } else {
          td.setAttribute('colspan', newColspan)
        }
      }

      const isData = colIdx >= 13 && colIdx < 24 && currentSectionVisible

      if (isData) {
        td.classList.add('data-cell')
        td.dataset.cellId = 'data_' + cellId
        td.dataset.originalHtml = td.innerHTML

        if (props.mode === 'create') {
          td.setAttribute('contenteditable', 'true')
          td.addEventListener('focus', function () {
            if (this.innerHTML === this.dataset.originalHtml && !this.dataset.filled) {
              this.innerHTML = ''
            }
          })

          td.addEventListener('blur', function () {
            const val = getEditableCellValue(this)
            if (!val || val === '<br>') {
              this.innerHTML = this.dataset.originalHtml
              clearHeightSplitCell(this)
              this.classList.remove('color-filler', 'color-customer')
              // Nếu ô này đã được autoFill từ data khách hàng mà filler xóa
              // → lưu marker __CLEARED__ để khi reviewer mở phiếu sẽ không hiện data cũ
              if (this.dataset.filled) {
                changes.value[this.dataset.cellId] = '__CLEARED__'
              } else {
                delete changes.value[this.dataset.cellId]
              }
            } else {
              if (this.dataset.filled && val === this.dataset.filledValue) {
                this.classList.remove('color-filler')
                this.classList.add('color-customer')
                delete changes.value[this.dataset.cellId]
              } else {
                this.classList.remove('color-customer')
                this.classList.add('color-filler')
                const heightVal = isHeightValueCell(this) ? fillHeightSplitCell(this, val, 'color-filler') : ''
                changes.value[this.dataset.cellId] = heightVal || val
              }
            }
            emit('change', { ...changes.value })
          })
        } else if (props.mode === 'review' || props.mode === 'view') {
          td.setAttribute('contenteditable', 'false')
          td.classList.remove('data-cell-editable')
          dataCellsToClone.push(td)
        }
      }

      for (let i = 0; i < colspan; i++) {
        if (colIdx + i < 26) rowspans[colIdx + i] = rowspan - 1
      }
      colIdx += colspan
      cellId++
    })
    while (colIdx < 26) { if (rowspans[colIdx] > 0) rowspans[colIdx]--; colIdx++ }

    if ((props.mode === 'review' || props.mode === 'view') && dataCellsToClone.length > 0) {
      const lastDataCell = dataCellsToClone[dataCellsToClone.length - 1]
      let insertRef = lastDataCell.nextSibling
      
      dataCellsToClone.forEach(td => {
        const reviewCell = td.cloneNode(true)
        reviewCell.classList.remove('data-cell')
        reviewCell.classList.add('note-cell')
        reviewCell.dataset.cellId = td.dataset.cellId.replace('data_', 'note_')
        reviewCell.dataset.submittedValue = td.innerHTML.trim()
        reviewCell.dataset.originalHtml = ''
        reviewCell.innerHTML = ''
        // view mode: không cho sửa; review mode: cho sửa
        reviewCell.setAttribute('contenteditable', props.mode === 'view' ? 'false' : 'true')
        reviewCell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
        
        row.insertBefore(reviewCell, insertRef)
        
        if (props.mode === 'review') {
          reviewCell.addEventListener('input', function() {
            const val = getEditableCellValue(this)
            if (val === '' || val === '<br>') {
              this.classList.remove('color-reviewer')
              delete changes.value[this.dataset.cellId]
            } else {
              this.classList.remove('color-customer', 'color-filler')
              this.classList.add('color-reviewer')
              changes.value[this.dataset.cellId] = val
            }
            emit('change', { ...changes.value })
            updateCorrectionCountDisplay()
          })
        }
      })
    }
  })
}

// ── CONVERT YES/NO CELLS TO CHECKBOXES ──
function convertYesNoCells() {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('.data-cell').forEach(td => {
    const rawText = (td.dataset.originalHtml || td.innerHTML).replace(/<[^>]*>/g, '').replace(/\s+/g, '').toUpperCase()
    if (rawText !== 'YES/NO') return
    if (td.classList.contains('yesno-cell')) return

    // Đánh dấu cell này là yesno-cell
    td.classList.add('yesno-cell')
    td.setAttribute('contenteditable', 'false')
    td.dataset.yesno = 'true'

    // Tạo 2 checkbox
    const isReadOnly = props.mode !== 'create';
    td.innerHTML = `
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="YES" ${isReadOnly ? 'disabled' : ''}>
        <span>YES</span>
      </label>
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="NO" ${isReadOnly ? 'disabled' : ''}>
        <span>NO</span>
      </label>
    `;

    if (!isReadOnly) {
      const checks = td.querySelectorAll('.yesno-check');
      checks.forEach(chk => {
        chk.addEventListener('change', function () {
          // Uncheck the other
          checks.forEach(c => { if (c !== this) c.checked = false; });
          const val = this.checked ? this.dataset.val : ''

          // ── Toggle companion detail rows if this is question 11/12 ──
          const rowText = Array.from(td.closest('tr')?.querySelectorAll('td') || []).map(t => t.textContent).join(' ')
          if (isCompanionTravelQuestion(rowText) || isCompanionGroupQuestion(rowText) || td.dataset.toggleRows === 'companion') {
            syncCompanionDetailRows(td.closest('table'))
          }

          // Apply color class
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
          if (val) {
            if (props.mode === 'review') {
              td.classList.add('color-reviewer')
              // Also update note-cell if exists
              const noteCellId = td.dataset.cellId?.replace('data_', 'note_')
              if (noteCellId) {
                const noteCell = paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`)
                if (noteCell) {
                  noteCell.innerHTML = val
                  noteCell.classList.add('color-reviewer')
                }
              }
              changes.value[td.dataset.cellId] = val
              updateCorrectionCountDisplay()
            } else {
              // filler mode: compare with filled value
              if (td.dataset.filled === 'true' && val === td.dataset.filledValue) {
                td.classList.add('color-customer')
                delete changes.value[td.dataset.cellId]
              } else {
                td.classList.add('color-filler')
                changes.value[td.dataset.cellId] = val
              }
            }
          } else {
            // Bỏ chọn một ô vốn đã có data khách hàng là thao tác XÓA, không phải
            // "không có thay đổi": phải ghi marker __CLEARED__, nếu không thì mở lại
            // phiếu là autofill đổ data cũ về và thao tác xóa mất trắng.
            recordClearedChange(changes.value, td)
          }
          emit('change', { ...changes.value })
          updateCorrectionCountDisplay()
        })
      })
    }
  })

  // ── Convert matching note-cells (Tư vấn) to checkboxes ──
  if (props.mode === 'review' || props.mode === 'view') {
    paperRef.value.querySelectorAll('.data-cell.yesno-cell').forEach(dataCell => {
      const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
      if (!noteCellId) return
      const noteCell = paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
      if (!noteCell || noteCell.classList.contains('yesno-cell')) return

      noteCell.classList.add('yesno-cell')
      noteCell.setAttribute('contenteditable', 'false')
      noteCell.dataset.yesno = 'true'

      const isReadOnly = props.mode === 'view';
      noteCell.innerHTML = `
        <label class="yesno-label">
          <input type="checkbox" class="yesno-check" data-val="YES" ${isReadOnly ? 'disabled' : ''}>
          <span>YES</span>
        </label>
        <label class="yesno-label">
          <input type="checkbox" class="yesno-check" data-val="NO" ${isReadOnly ? 'disabled' : ''}>
          <span>NO</span>
        </label>
      `;

      if (!isReadOnly && props.mode === 'review') {
        const checks = noteCell.querySelectorAll('.yesno-check');
        checks.forEach(chk => {
          chk.addEventListener('change', function () {
            checks.forEach(c => { if (c !== this) c.checked = false })
            const v = this.checked ? this.dataset.val : ''
            noteCell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
            if (v) {
              noteCell.classList.add('color-reviewer')
              changes.value[noteCell.dataset.cellId] = v
            } else {
              delete changes.value[noteCell.dataset.cellId]
            }
            const rowText = Array.from(noteCell.closest('tr')?.querySelectorAll('td') || []).map(t => t.textContent).join(' ')
            if (isCompanionTravelQuestion(rowText) || isCompanionGroupQuestion(rowText)) {
              syncCompanionDetailRows(noteCell.closest('table'))
            }
            emit('change', { ...changes.value })
            updateCorrectionCountDisplay()
          })
        })
      }
    })
  }

  syncAllCompanionDetailRows()
}

// ── CONVERT NONIMMIGRANT/IMMIGRANT CELLS TO CHECKBOXES ──
function convertImmigrantStatusCells() {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('.data-cell').forEach(td => {
    const rawText = (td.dataset.originalHtml || td.innerHTML).replace(/<[^>]*>/g, '').replace(/\s+/g, '').toUpperCase()
    if (rawText !== 'NONIMMIGRANT/IMMIGRANT') return
    if (td.classList.contains('immigrant-status-cell')) return

    td.classList.add('immigrant-status-cell')
    td.setAttribute('contenteditable', 'false')
    td.dataset.immigrantStatus = 'true'

    const isReadOnly = props.mode !== 'create';
    td.innerHTML = `
      <label class="yesno-label">
        <input type="checkbox" class="immigrant-status-check yesno-check" data-val="NONIMMIGRANT" ${isReadOnly ? 'disabled' : ''}>
        <span>NONIMMIGRANT</span>
      </label>
      <label class="yesno-label">
        <input type="checkbox" class="immigrant-status-check yesno-check" data-val="IMMIGRANT" ${isReadOnly ? 'disabled' : ''}>
        <span>IMMIGRANT</span>
      </label>
    `;

    if (!isReadOnly) {
      const checks = td.querySelectorAll('.immigrant-status-check');
      checks.forEach(chk => {
        chk.addEventListener('change', function () {
          checks.forEach(c => { if (c !== this) c.checked = false })
          const val = this.checked ? this.dataset.val : ''

          td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
          if (val) {
            if (props.mode === 'review') {
              td.classList.add('color-reviewer')
              const noteCellId = td.dataset.cellId?.replace('data_', 'note_')
              if (noteCellId) {
                const noteCell = paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`)
                if (noteCell) {
                  noteCell.innerHTML = val
                  noteCell.classList.add('color-reviewer')
                }
              }
              changes.value[td.dataset.cellId] = val
              updateCorrectionCountDisplay()
            } else {
              if (td.dataset.filled === 'true' && val === td.dataset.filledValue) {
                td.classList.add('color-customer')
                delete changes.value[td.dataset.cellId]
              } else {
                td.classList.add('color-filler')
                changes.value[td.dataset.cellId] = val
              }
            }
          } else {
            // Bỏ chọn một ô vốn đã có data khách hàng là thao tác XÓA, không phải
            // "không có thay đổi": phải ghi marker __CLEARED__, nếu không thì mở lại
            // phiếu là autofill đổ data cũ về và thao tác xóa mất trắng.
            recordClearedChange(changes.value, td)
          }
          emit('change', { ...changes.value })
          updateCorrectionCountDisplay()
        })
      })
    }
  })

  // Convert matching note-cells (Tư vấn) to checkboxes
  if (props.mode === 'review' || props.mode === 'view') {
    paperRef.value.querySelectorAll('.data-cell.immigrant-status-cell').forEach(dataCell => {
      const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
      if (!noteCellId) return
      const noteCell = paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
      if (!noteCell || noteCell.classList.contains('immigrant-status-cell')) return

      noteCell.classList.add('immigrant-status-cell')
      noteCell.setAttribute('contenteditable', 'false')
      noteCell.dataset.immigrantStatus = 'true'

      const isReadOnly = props.mode === 'view';
      noteCell.innerHTML = `
        <label class="yesno-label">
          <input type="checkbox" class="immigrant-status-check yesno-check" data-val="NONIMMIGRANT" ${isReadOnly ? 'disabled' : ''}>
          <span>NONIMMIGRANT</span>
        </label>
        <label class="yesno-label">
          <input type="checkbox" class="immigrant-status-check yesno-check" data-val="IMMIGRANT" ${isReadOnly ? 'disabled' : ''}>
          <span>IMMIGRANT</span>
        </label>
      `;

      if (!isReadOnly && props.mode === 'review') {
        const checks = noteCell.querySelectorAll('.immigrant-status-check');
        checks.forEach(chk => {
          chk.addEventListener('change', function () {
            checks.forEach(c => { if (c !== this) c.checked = false })
            const v = this.checked ? this.dataset.val : ''
            noteCell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
            if (v) {
              noteCell.classList.add('color-reviewer')
              changes.value[noteCell.dataset.cellId] = v
            } else {
              delete changes.value[noteCell.dataset.cellId]
            }
            emit('change', { ...changes.value })
            updateCorrectionCountDisplay()
          })
        })
      }
    })
  }
}



// Helper: Chuẩn hóa text (viết hoa, không dấu) theo yêu cầu



function getK1SpecifyCells() {
  const result = { dataCell: null, noteCell: null }
  if (!paperRef.value) return result

  const rows = Array.from(paperRef.value.querySelectorAll('tbody tr'))
  for (const row of rows) {
    const labelCell = Array.from(row.querySelectorAll('td')).find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return normalizeText(td.textContent || '').trim().startsWith('SPECIFY')
    })

    if (!labelCell) continue

    let dataCell = labelCell.nextElementSibling
    while (dataCell && !dataCell.classList.contains('data-cell')) {
      dataCell = dataCell.nextElementSibling
    }

    if (dataCell) {
      result.dataCell = dataCell
      const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
      result.noteCell = noteCellId
        ? paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
        : null
      return result
    }
  }

  return result
}

function getK1SpecifyCell() {
  return getK1SpecifyCells().dataCell
}




function renderK1SpecifySelect(cell, selectedValue = K1_DEFAULT_SPECIFY, options = {}) {
  if (!cell) return

  const selected = normalizeK1SpecifyValue(selectedValue)
  const role = options.role || (cell.classList.contains('note-cell') ? 'note' : 'data')
  const isNoteCell = role === 'note'
  const isEditable = (props.mode === 'create' && !isNoteCell) || (props.mode === 'review' && isNoteCell)
  const sourceClass = isNoteCell ? 'color-reviewer' : 'color-filler'

  cell.classList.add('k1-specify-cell')
  cell.dataset.optionType = 'k1-specify'
  cell.setAttribute('contenteditable', 'false')

  if (!isEditable) {
    cell.innerHTML = selected === K1_SELECT_ONE ? '' : selected
    applyK1SpecifyColor(cell, selected, selected === K1_SELECT_ONE ? '' : sourceClass)
    return
  }

  cell.innerHTML = ''

  const select = document.createElement('select')
  select.value = selected
  select.style.cssText = [
    'width:100%',
    'padding:4px 6px',
    'border:1px solid #cbd5e1',
    'border-radius:4px',
    'font-size:12px',
    'font-family:inherit',
    'background:#fff',
    'outline:none',
    'font-weight:700',
    `color:${isNoteCell ? '#dc2626' : '#1d4ed8'}`
  ].join(';')

  K1_SPECIFY_OPTIONS.forEach(optionText => {
    const opt = document.createElement('option')
    opt.value = optionText
    opt.textContent = optionText
    select.appendChild(opt)
  })

  select.value = selected
  cell.appendChild(select)
  applyK1SpecifyColor(cell, selected, selected === K1_SELECT_ONE ? '' : sourceClass)

  select.addEventListener('change', () => {
    const val = normalizeK1SpecifyValue(select.value)
    applyK1SpecifyColor(cell, val, val === K1_SELECT_ONE ? '' : sourceClass)

    if (cell.dataset.cellId) {
      if (val === K1_SELECT_ONE) {
        delete changes.value[cell.dataset.cellId]
      } else {
        changes.value[cell.dataset.cellId] = val
      }
    }

    emit('change', { ...changes.value })
  })
}

function renderK1SpecifyControls(fillerChanges = null, reviewChanges = null) {
  const { dataCell, noteCell } = getK1SpecifyCells()
  if (!dataCell) return

  const dataCellId = dataCell.dataset.cellId
  const noteCellId = noteCell?.dataset.cellId

  const dataValue = dataCellId && fillerChanges?.[dataCellId] !== undefined
    ? fillerChanges[dataCellId]
    : getK1SpecifySelectedValue(dataCell)

  renderK1SpecifySelect(dataCell, dataValue, { role: 'data' })

  if (noteCell && (props.mode === 'review' || props.mode === 'view')) {
    const noteValue = noteCellId && reviewChanges?.[noteCellId] !== undefined
      ? reviewChanges[noteCellId]
      : getK1SpecifySelectedValue(noteCell)

    renderK1SpecifySelect(noteCell, noteValue, { role: 'note' })

    if (props.mode === 'review' && noteCellId && reviewChanges?.[noteCellId] !== undefined) {
      changes.value[noteCellId] = normalizeK1SpecifyValue(reviewChanges[noteCellId])
    }
  }
}

function getK1PayerCells() {
  const result = { dataCell: null, noteCell: null }
  if (!paperRef.value) return result

  const rows = Array.from(paperRef.value.querySelectorAll('tbody tr'))
  for (const row of rows) {
    const labelCell = Array.from(row.querySelectorAll('td')).find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return normalizeText(td.textContent || '').trim().startsWith('PERSON/ENTITY PAYING FOR YOUR TRIP')
    })

    if (!labelCell) continue

    let dataCell = labelCell.nextElementSibling
    while (dataCell && !dataCell.classList.contains('data-cell')) {
      dataCell = dataCell.nextElementSibling
    }

    if (dataCell) {
      result.dataCell = dataCell
      const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
      result.noteCell = noteCellId
        ? paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
        : null
      return result
    }
  }

  return result
}





function renderK1PayerSelect(cell, selectedValue = K1_DEFAULT_PAYER, options = {}) {
  if (!cell) return

  const selected = normalizeK1PayerValue(selectedValue)
  const role = options.role || (cell.classList.contains('note-cell') ? 'note' : 'data')
  const isNoteCell = role === 'note'
  const isEditable = (props.mode === 'create' && !isNoteCell) || (props.mode === 'review' && isNoteCell)
  const sourceClass = isNoteCell ? 'color-reviewer' : 'color-filler'

  cell.classList.add('k1-payer-cell')
  cell.dataset.optionType = 'k1-payer'
  cell.setAttribute('contenteditable', 'false')

  if (!isEditable) {
    cell.innerHTML = selected === K1_SELECT_ONE ? '' : selected
    applyK1PayerColor(cell, selected, selected === K1_SELECT_ONE ? '' : sourceClass)
    return
  }

  cell.innerHTML = ''

  const select = document.createElement('select')
  select.value = selected
  select.style.cssText = [
    'width:100%',
    'padding:4px 6px',
    'border:1px solid #cbd5e1',
    'border-radius:4px',
    'font-size:12px',
    'font-family:inherit',
    'background:#fff',
    'outline:none',
    'font-weight:700',
    `color:${isNoteCell ? '#dc2626' : '#1d4ed8'}`
  ].join(';')

  K1_PAYER_OPTIONS.forEach(optionText => {
    const opt = document.createElement('option')
    opt.value = optionText
    opt.textContent = optionText === K1_SELECT_ONE ? '-SELECT ONE-' : optionText
    select.appendChild(opt)
  })

  select.value = selected
  cell.appendChild(select)
  applyK1PayerColor(cell, selected, selected === K1_SELECT_ONE ? '' : sourceClass)

  select.addEventListener('change', () => {
    const val = normalizeK1PayerValue(select.value)
    applyK1PayerColor(cell, val, val === K1_SELECT_ONE ? '' : sourceClass)

    if (cell.dataset.cellId) {
      if (val === K1_SELECT_ONE) {
        delete changes.value[cell.dataset.cellId]
      } else {
        changes.value[cell.dataset.cellId] = val
      }
    }

    emit('change', { ...changes.value })
  })
}

function renderK1PayerControls(defaultValue = K1_DEFAULT_PAYER, fillerChanges = null, reviewChanges = null) {
  const { dataCell, noteCell } = getK1PayerCells()
  if (!dataCell) return

  const dataCellId = dataCell.dataset.cellId
  const noteCellId = noteCell?.dataset.cellId

  const dataValue = dataCellId && fillerChanges?.[dataCellId] !== undefined
    ? fillerChanges[dataCellId]
    : defaultValue

  renderK1PayerSelect(dataCell, dataValue, { role: 'data' })

  if (noteCell && (props.mode === 'review' || props.mode === 'view')) {
    const noteValue = noteCellId && reviewChanges?.[noteCellId] !== undefined
      ? reviewChanges[noteCellId]
      : getK1PayerSelectedValue(noteCell)

    renderK1PayerSelect(noteCell, noteValue, { role: 'note' })

    if (props.mode === 'review' && noteCellId && reviewChanges?.[noteCellId] !== undefined) {
      changes.value[noteCellId] = normalizeK1PayerValue(reviewChanges[noteCellId])
    }
  }
}






function syncAllCompanionDetailRows() {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('table').forEach(table => syncCompanionDetailRows(table))
}


function getI130ASectionHeadingRow(title) {
  if (!paperRef.value) return null
  const target = normalizeI130ACaseText(title)
  const rows = Array.from(paperRef.value.querySelectorAll('tr'))
  return rows.find(row => {
    return Array.from(row.children).some(cell => {
      const colspan = parseInt(cell.getAttribute('colspan') || cell.colSpan || '0', 10)
      return colspan >= 24 && normalizeI130ACaseText(cell.textContent || '').includes(target)
    })
  }) || null
}

function getI130ASectionRows(title) {
  const heading = getI130ASectionHeadingRow(title)
  if (!heading) return []

  const sectionRows = []
  let row = heading.nextElementSibling
  while (row) {
    const isNextHeading = Array.from(row.children).some(cell => {
      const colspan = parseInt(cell.getAttribute('colspan') || cell.colSpan || '0', 10)
      return colspan >= 24
    })
    if (isNextHeading) break
    sectionRows.push(row)
    row = row.nextElementSibling
  }

  return sectionRows
}



function setI130ASectionHiddenByRule(title, shouldHide, ruleName) {
  const heading = getI130ASectionHeadingRow(title)
  if (!heading) return

  const rows = [heading, ...getI130ASectionRows(title)]
  const marker = `hiddenBy${ruleName}`
  const previousDisplayKey = `${marker}PreviousDisplay`

  rows.forEach(row => {
    if (shouldHide) {
      if (row.dataset[marker] !== 'true') {
        row.dataset[previousDisplayKey] = row.style.display || ''
      }
      row.dataset[marker] = 'true'
      row.style.display = 'none'
      return
    }

    if (row.dataset[marker] === 'true') {
      row.style.display = row.dataset[previousDisplayKey] || ''
      delete row.dataset[marker]
      delete row.dataset[previousDisplayKey]
    }
  })
}


function getRenderedPetitionerImmigrationStatus() {
  if (!paperRef.value) return ''
  const target = normalizeI130ACaseText('What is your current immigration status?')
  const row = Array.from(paperRef.value.querySelectorAll('tr')).find(item => {
    return normalizeI130ACaseText(getI130ARowLabel(item)).includes(target)
  })
  const dataCell = Array.from(row?.children || []).find(cell => cell.classList.contains('data-cell'))
  return stripHtml(getCellPrintableValue(dataCell))
}

function syncUSCitizenInfoSectionVisibility(data = props.customerData || {}) {
  const rawStatus = [
    data?.currentImmigrationStatus,
    data?.petitionerStatus,
    data?.petitionerImmigrationStatus,
    data?.immigrationStatus,
    data?.tinhTrangCuTruMy,
    data?.tinhTrangCuTru,
    data?.tinhTrangDiTru,
    data?.statusCuTru,
    getRenderedPetitionerImmigrationStatus()
  ].find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''

  const isLpr = isLawfulPermanentResidentStatus(rawStatus)

  setI130ASectionHiddenByRule(
    'THONG TIN CHO CONG DAN MY',
    isLpr,
    'LprCitizenInfo'
  )
  setI130ASectionHiddenByRule(
    'THONG TIN CHO THUONG TRU NHAN',
    !isLpr,
    'LprCitizenInfo'
  )
}

function syncSiblingPetitionSectionVisibility(data = props.customerData || {}) {
  const isSibling = isSiblingPetitionCase(data)
  const isParent = isParentPetitionCase(data)

  setI130ASectionHiddenByRule(
    'DIA CHI SONG CHUNG VOI NGUOI HON PHOI GAN DAY NHAT',
    isSibling || isParent,
    'SiblingPetition'
  )
  setI130ASectionHiddenByRule(
    'THONG TIN CON',
    isSibling,
    'SiblingPetition'
  )
}



function reconcileLiveAtCurrentMailingAddressCell() {
  if (!paperRef.value) return
  // shouldLiveAtCurrentMailingAddressFromRenderedRows() (shared helper) calls getI130ASectionRows(),
  // which only exists as a local function inside each case's own Vue component, not in the shared
  // module — so it always throws a ReferenceError. Guard against that here so this one broken,
  // unrelated helper can't abort the rest of autoFillData().
  let shouldLiveAtCurrentAddress = false
  try {
    shouldLiveAtCurrentAddress = shouldLiveAtCurrentMailingAddressFromRenderedRows()
  } catch {
    // Known broken helper (see comment above) — nothing to do here, just skip this reconciliation.
  }
  if (!shouldLiveAtCurrentAddress) return

  const target = normalizeI130ACaseText('Do you live at your current mailing address?')
  const row = Array.from(paperRef.value.querySelectorAll('tr')).find(item => {
    return normalizeI130ACaseText(getI130ARowLabel(item)).includes(target)
  })
  const dataCell = Array.from(row?.children || []).find(cell => cell.classList.contains('data-cell'))
  if (!dataCell) return

  if (dataCell.classList.contains('yesno-cell')) {
    fillYesNoCell(dataCell, 'YES')
  } else {
    ensureYesNoCell(dataCell, 'YES')
  }
  dataCell.classList.remove('color-filler', 'color-reviewer')
  dataCell.classList.add('color-customer')

  if (props.mode === 'create' && dataCell.dataset.cellId && changes.value[dataCell.dataset.cellId] !== undefined) {
    delete changes.value[dataCell.dataset.cellId]
    emit('change', { ...changes.value })
  }
}


function isI130HeightLabel(label = '') {
  return normalizeText(label).replace(/\s+/g, ' ').trim().includes('WHAT IS YOUR HEIGHT')
}

function getCellRowLabelText(cell) {
  const row = cell?.closest?.('tr')
  if (!row) return ''
  return Array.from(row.children)
    .filter(td => !td.classList.contains('data-cell') && !td.classList.contains('note-cell'))
    .map(td => td.textContent || '')
    .join(' ')
}

function isHeightValueCell(cell) {
  return !!cell && (
    cell.classList?.contains('height-split-cell') ||
    isI130HeightLabel(getCellRowLabelText(cell))
  )
}

function clearHeightSplitCell(cell) {
  if (!cell) return
  cell.classList.remove('height-split-cell')
  delete cell.dataset.heightSplit
  delete cell.dataset.heightPlain
}

function parseI130HeightParts(value) {
  const text = String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null

  const upper = normalizeText(text).replace(/\s+/g, ' ').trim()

  const intPart = (raw) => {
    const match = String(raw || '').match(/\d+/)
    return match ? String(parseInt(match[0], 10)) : ''
  }

  const validFeet = (n) => Number.isInteger(n) && n >= 1 && n <= 8
  const validInches = (n) => Number.isInteger(n) && n >= 0 && n <= 11

  const normalizeParts = (feetRaw, inchesRaw) => {
    const feet = intPart(feetRaw)
    const inches = intPart(inchesRaw)

    const feetNum = feet === '' ? null : Number(feet)
    const inchesNum = inches === '' ? null : Number(inches)

    if (!validFeet(feetNum)) return null
    if (!validInches(inchesNum)) return null

    return { feet, inches }
  }

  // Không xử lý mét/cm để tránh 1.64m hoặc 164cm bị hiểu sai thành feet/inches.
  if (/\b\d+(?:[.,]\d+)?\s*(M|MET|METER|METRE|CM|CENTIMETER|CENTIMETRE)\b/.test(upper)) {
    return null
  }

  // Chỉ xử lý khi toàn chuỗi có đúng 2 số.
  // Ví dụ hợp lệ: 5 4, 5,4, 5.4, 5-4, 5/4, 5 f 4, 5ft4, 5abc4, 05'-06", 5 feet 4 inches.
  const numbers = upper.match(/\d+/g) || []
  if (numbers.length !== 2) return null

  return normalizeParts(numbers[0], numbers[1])
}

function formatI130HeightPlainValue(parts = {}) {
  const feet = String(parts.feet || '').trim()
  const inches = String(parts.inches || '').trim()
  if (!feet && !inches) return ''
  if (feet && inches) return `${feet} Feet ${inches} Inches`
  if (feet) return `${feet} Feet`
  return `${inches} Inches`
}

function renderI130HeightSplitHtml(parts = {}) {
  const feet = escapeHtml(parts.feet || '')
  const inches = escapeHtml(parts.inches || '')
  const base = 'display:flex;align-items:center;justify-content:center;min-height:20px;padding:0 6px;box-sizing:border-box;'
  const unit = `${base}font-weight:400;color:#000;`
  const line = 'border-left:1px solid #000;'
  return `<div class="i130-height-split" data-height-split="true" style="display:grid;grid-template-columns:2fr 4fr 2fr 3fr;margin:-2px -4px;min-height:20px;">
    <span data-height-part="feet" style="${base}">${feet}</span>
    <span contenteditable="false" style="${unit}${line}">Feet</span>
    <span data-height-part="inches" style="${base}${line}">${inches}</span>
    <span contenteditable="false" style="${unit}${line}">Inches</span>
  </div>`
}

function fillHeightSplitCell(cell, value, colorClass = 'color-customer') {
  const parts = parseI130HeightParts(value)
  if (!cell || !parts) return ''
  const plain = formatI130HeightPlainValue(parts)
  if (!plain) return ''
  cell.innerHTML = renderI130HeightSplitHtml(parts)
  cell.classList.add('height-split-cell')
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  if (colorClass) cell.classList.add(colorClass)
  cell.dataset.heightSplit = 'true'
  cell.dataset.heightPlain = plain
  cell.dataset.filled = 'true'
  cell.dataset.filledValue = plain
  return plain
}

function getEditableCellValue(cell) {
  if (!cell) return ''
  if (isHeightValueCell(cell)) {
    const feet = cell.querySelector('[data-height-part="feet"]')?.textContent?.trim() || ''
    const inches = cell.querySelector('[data-height-part="inches"]')?.textContent?.trim() || ''
    const plain = formatI130HeightPlainValue({ feet, inches })
    if (plain) return plain
    const parsed = parseI130HeightParts(cell.textContent || cell.innerHTML)
    const parsedPlain = parsed ? formatI130HeightPlainValue(parsed) : ''
    if (parsedPlain) return parsedPlain
  }
  return cell.innerHTML.trim()
}




function updateEditedCellState(cell) {
  if (!cell?.dataset?.cellId) return
  const val = getEditableCellValue(cell)

  if (!val || val === '<br>') {
    cell.innerHTML = cell.dataset.originalHtml || ''
    clearHeightSplitCell(cell)
    cell.classList.remove('color-filler', 'color-customer', 'color-reviewer', 'modified')
    // Nếu ô đã được autoFill mà bị xóa → lưu marker
    if (cell.dataset.filled && cell.classList.contains('data-cell') && props.mode === 'create') {
      changes.value[cell.dataset.cellId] = '__CLEARED__'
    } else {
      delete changes.value[cell.dataset.cellId]
    }
  } else if (cell.classList.contains('note-cell') && props.mode === 'review') {
    cell.classList.remove('color-customer', 'color-filler')
    cell.classList.add('color-reviewer')
    const heightVal = isHeightValueCell(cell) ? fillHeightSplitCell(cell, val, 'color-reviewer') : ''
    changes.value[cell.dataset.cellId] = heightVal || val
  } else if (cell.classList.contains('data-cell') && props.mode === 'create') {
    if (cell.dataset.filled === 'true' && val === cell.dataset.filledValue) {
      cell.classList.remove('color-filler', 'modified', 'color-reviewer')
      cell.classList.add('color-customer')
      delete changes.value[cell.dataset.cellId]
    } else {
      cell.classList.remove('color-customer', 'color-reviewer')
      cell.classList.add('color-filler', 'modified')
      const heightVal = isHeightValueCell(cell) ? fillHeightSplitCell(cell, val, 'color-filler') : ''
      changes.value[cell.dataset.cellId] = heightVal || val
    }
  }

  emit('change', { ...changes.value })
}

function handlePlainTextPaste(event) {
  const editableCell = event.target?.closest?.('.data-cell[contenteditable="true"], .note-cell[contenteditable="true"]')
  if (!editableCell) return

  event.preventDefault()
  const rawText = event.clipboardData?.getData('text/plain') || window.clipboardData?.getData('Text') || ''
  const pasteHtml = plainTextToCellHtml(rawText)
  if (!pasteHtml) return

  const selection = window.getSelection?.()
  if (selection?.rangeCount && editableCell.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const template = document.createElement('template')
    template.innerHTML = pasteHtml
    const fragment = template.content
    const lastNode = fragment.lastChild
    range.insertNode(fragment)
    if (lastNode) {
      range.setStartAfter(lastNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  } else {
    editableCell.innerHTML = pasteHtml
  }

  editableCell.innerHTML = plainTextToCellHtml(editableCell.innerText || editableCell.textContent || '')
  setCaretToEnd(editableCell)
  updateEditedCellState(editableCell)
}





function fillSpouseAddressOptionCell(cell, value, sourceClass = 'color-customer') {
  if (!cell) return
  if (!cell.classList.contains('spouse-address-option-cell')) {
    renderSpouseAddressOptionCell(cell)
  }

  const selected = normalizeSpouseAddressOptionValue(value)
  syncSpouseAddressOptionChecks(cell, selected)
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

  if (selected) {
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = selected
    if (sourceClass) cell.classList.add(sourceClass)
  } else {
    delete cell.dataset.filled
    delete cell.dataset.filledValue
  }
}


function renderSpouseAddressOptionCell(cell, selectedValue = '') {
  if (!cell) return
  const selected = normalizeSpouseAddressOptionValue(selectedValue || getSpouseAddressOptionValue(cell))
  const groupName = `spouse-address-option-${cell.dataset.cellId || 'cell'}`
  const isDataCell = cell.classList.contains('data-cell')
  const isReadOnly = props.mode === 'view' || (isDataCell && props.mode !== 'create')

  cell.classList.add('spouse-address-option-cell')
  cell.dataset.optionType = 'spouse-address'
  cell.setAttribute('contenteditable', 'false')
  cell.innerHTML = `
    <div class="spouse-address-options" style="display:grid;gap:2px;align-content:center;font-family:inherit;font-size:inherit;">
      ${SPOUSE_ADDRESS_OPTIONS.map(option => `
        <label class="spouse-address-option-label" style="display:flex;align-items:center;gap:4px;margin:1px 0;line-height:1.25;font-weight:700;white-space:nowrap;cursor:${isReadOnly ? 'default' : 'pointer'};">
          <input
            type="radio"
            class="spouse-address-option-check"
            name="${groupName}"
            data-val="${option}"
            style="width:13px;height:13px;margin:0 4px 0 0;vertical-align:middle;accent-color:#9a3b0c;cursor:${isReadOnly ? 'default' : 'pointer'};"
            ${isReadOnly ? 'disabled' : ''}
          >
          <span>${option}</span>
        </label>
      `).join('')}
    </div>
  `

  syncSpouseAddressOptionChecks(cell, selected)
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  if (selected) {
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = selected
    cell.classList.add('color-customer')
  }

  if (!isReadOnly) {
    cell.querySelectorAll('.spouse-address-option-check').forEach(chk => {
      chk.addEventListener('change', function () {
        handleSpouseAddressOptionChange(cell, this.checked ? this.dataset.val : '')
      })
    })
  }
}

function handleSpouseAddressOptionChange(cell, value) {
  const selected = normalizeSpouseAddressOptionValue(value)
  syncSpouseAddressOptionChecks(cell, selected)
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

  if (selected) {
    if (props.mode === 'review') {
      cell.classList.add('color-reviewer')
      if (cell.dataset.cellId) changes.value[cell.dataset.cellId] = selected

      const noteCellId = cell.classList.contains('data-cell')
        ? cell.dataset.cellId?.replace('data_', 'note_')
        : ''
      const noteCell = noteCellId ? paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`) : null
      if (noteCell && noteCell !== cell) {
        fillSpouseAddressOptionCell(noteCell, selected, 'color-reviewer')
      }
    } else if (cell.dataset.filled === 'true' && selected === cell.dataset.filledValue) {
      cell.classList.add('color-customer')
      if (cell.dataset.cellId) delete changes.value[cell.dataset.cellId]
    } else {
      cell.classList.add('color-filler')
      if (cell.dataset.cellId) changes.value[cell.dataset.cellId] = selected
    }
  } else if (cell.dataset.cellId) {
    delete changes.value[cell.dataset.cellId]
  }

  emit('change', { ...changes.value })
}

function convertSpouseAddressOptionCells() {
  if (!paperRef.value) return

  const dataCells = Array.from(paperRef.value.querySelectorAll('.data-cell'))
    .filter(isSpouseAddressOptionSource)

  dataCells.forEach(dataCell => {
    renderSpouseAddressOptionCell(dataCell)

    const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
    if (!noteCellId) return

    const noteCell = paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
    if (noteCell) renderSpouseAddressOptionCell(noteCell)
  })
}















function parseCompanionDetails(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.flatMap(item => parseCompanionDetails(item))
  }
  if (typeof raw === 'object') {
    const nameParts = splitPersonName(raw.fullName || raw.full_name || raw.fullname || raw.name || '')
    return [{
      surname: raw.surname || raw.lastName || raw.last_name || raw.familyName || raw.family_name || nameParts.surname,
      givenName: raw.givenName || raw.given_name || raw.given || raw.firstName || raw.first_name || nameParts.givenName,
      relationship: normalizeRelationship(raw.relationship || raw.relation || raw.relationshipToYou || raw.relationship_to_you || raw.relationshipWithPerson || raw.relationship_with_person || '')
    }].filter(item => item.surname || item.givenName || item.relationship)
  }

  const text = stripHtml(raw)
  if (!text) return []
  const normalizedText = normalizeText(text).replace(/\s+/g, ' ').trim()
  if (/^(KHONG|KHONG CO|NO|NONE|N\/A|NA)$/i.test(normalizedText)) return []
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return parseCompanionDetails(JSON.parse(text))
    } catch (e) {
      console.error("Failed to parse companionDetails", e)
    }
  }

  return text
    .split(/\r?\n|;/)
    .map(parseCompanionLine)
    .filter(item => item && (item.surname || item.givenName || item.relationship))
}

// Helper: fill giá trị YES/NO vào checkbox cell


// Helper: đảm bảo cell là yesno-cell (convert nếu chưa), rồi fill giá trị
function ensureYesNoCell(td, val) {
  if (!td) return
  const upperVal = (val || '').toUpperCase().trim()
  if (upperVal !== 'YES' && upperVal !== 'NO') return

  // Nếu chưa phải yesno-cell thì convert trước
  if (!td.classList.contains('yesno-cell')) {
    td.classList.add('yesno-cell')
    td.setAttribute('contenteditable', 'false')
    td.dataset.yesno = 'true'

    const isReadOnly = props.mode === 'view' || (td.classList.contains('data-cell') && props.mode !== 'create')
    td.innerHTML = `
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="YES" ${isReadOnly ? 'disabled' : ''}>
        <span>YES</span>
      </label>
      <label class="yesno-label">
        <input type="checkbox" class="yesno-check" data-val="NO" ${isReadOnly ? 'disabled' : ''}>
        <span>NO</span>
      </label>
    `

    if (!isReadOnly) {
      const checks = td.querySelectorAll('.yesno-check')
      checks.forEach(chk => {
        chk.addEventListener('change', function () {
          checks.forEach(c => { if (c !== this) c.checked = false })
          const v = this.checked ? this.dataset.val : ''
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
          if (v) {
            if (props.mode === 'review') {
              td.classList.add('color-reviewer')
              const noteCellId = td.dataset.cellId?.replace('data_', 'note_')
              if (noteCellId) {
                const noteCell = paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`)
                if (noteCell) { noteCell.innerHTML = v; noteCell.classList.add('color-reviewer') }
              }
              changes.value[td.dataset.cellId] = v
            } else {
              if (td.dataset.filled === 'true' && v === td.dataset.filledValue) {
                td.classList.add('color-customer')
                delete changes.value[td.dataset.cellId]
              } else {
                td.classList.add('color-filler')
                changes.value[td.dataset.cellId] = v
              }
            }
          } else {
            // Bỏ chọn một ô vốn đã có data khách hàng là thao tác XÓA, không phải
            // "không có thay đổi": phải ghi marker __CLEARED__, nếu không thì mở lại
            // phiếu là autofill đổ data cũ về và thao tác xóa mất trắng.
            recordClearedChange(changes.value, td)
          }
          const rowText = Array.from(td.closest('tr')?.querySelectorAll('td') || []).map(t => t.textContent).join(' ')
          if (isCompanionTravelQuestion(rowText) || isCompanionGroupQuestion(rowText)) {
            syncCompanionDetailRows(td.closest('table'))
          }
          emit('change', { ...changes.value })
        })
      })
    }
  }

  // Fill giá trị
  fillYesNoCell(td, upperVal)
}

function handleReviewChange(cell) {
  const currentVal = cell.innerHTML.trim()
  const submittedVal = (cell.dataset.submittedValue || cell.dataset.filledValue || '').trim()
  const originalHtml = cell.dataset.originalHtml.trim()

  // Clean diff nodes before comparing
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = currentVal
  const diffNode = tempDiv.querySelector('.diff-old')
  if (diffNode) diffNode.remove()
  const cleanVal = tempDiv.innerHTML.trim()

  if (cleanVal === originalHtml || cleanVal === '' || cleanVal === submittedVal) {
    cell.classList.remove('color-reviewer')
    const existing = cell.querySelector('.diff-old')
    if (existing) existing.remove()
    delete changes.value[cell.dataset.cellId]
  } else {
    cell.classList.remove('color-customer', 'color-filler')
    cell.classList.add('color-reviewer')
    const oldLabel = submittedVal || '(trống)'
    cell.innerHTML = cleanVal + `<span class="diff-old">${oldLabel}</span>`
    changes.value[cell.dataset.cellId] = cleanVal
  }
  emit('change', { ...changes.value })
}















function applyI130DateFormatToAllFilledCells() {
  if (!paperRef.value) return
  const cells = paperRef.value.querySelectorAll('.data-cell, .note-cell')
  cells.forEach(cell => {
    if (!cell || cell.dataset.i130DateFormatted === 'true') return
    if (cell.querySelector('input, select, textarea, button')) return
    // Never touch a value the staff typed themselves — only reformat customer-data auto-fill.
    if (cell.classList.contains('color-filler')) {
      cell.dataset.i130DateFormatted = 'true'
      return
    }

    const rawText = String(cell.textContent || '').trim()
    if (!rawText || /^(PRESENT|NAY)$/i.test(rawText)) return
    if (!/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})(?:T.*)?$/.test(rawText)) return

    const formatted = formatI130DateMMDDYYYY(rawText)
    if (!formatted || formatted === rawText) {
      cell.dataset.i130DateFormatted = 'true'
      return
    }

    cell.innerHTML = formatted
    if (cell.dataset.filled === 'true') cell.dataset.filledValue = formatted
    cell.dataset.i130DateFormatted = 'true'
  })
}


function normalizeRenderedEmailCellsToLowercase() {
  if (!paperRef.value) return

  paperRef.value.querySelectorAll('.data-cell, .note-cell').forEach(cell => {
    if (!cell || cell.querySelector('input, select, textarea, button')) return

    const value = String(cell.textContent || '').trim()
    if (!value || !shouldRenderLowercaseEmail('', value)) return

    const normalized = normalizeEmailDisplayValue(value)
    cell.innerHTML = escapeHtml(normalized)
    if (cell.dataset.filled === 'true') cell.dataset.filledValue = normalized
    if (cell.dataset.submittedValue) cell.dataset.submittedValue = normalizeEmailDisplayValue(cell.dataset.submittedValue)
  })
}

function i130aAppendixSplitAddress(addressValue, source = {}, prefix = '') {
  const pick = (keys) => i130aAppendixPick(source, keys.flatMap(key => {
    if (!prefix) return [key]
    const suffix = key.charAt(0).toUpperCase() + key.slice(1)
    return [key, `${prefix}${suffix}`, `${prefix}_${key}`]
  }))

  const partsSource = i130aAppendixFirstValue(
    source?.parts,
    source?.addressParts,
    source?.diaChiParts,
    prefix ? source?.[`${prefix}Parts`] : null,
    prefix ? source?.[`${prefix}AddressParts`] : null,
    prefix ? source?.[`${prefix}DiaChiParts`] : null
  ) || {}

  const explicit = {
    street: i130aAppendixFirstValue(
      pick(['street', 'line1', 'addressLine1', 'streetAddress', 'addressStreet', 'diaChiStreet', 'diaChiLine1', 'soNhaDuongXaPhuongQuan']),
      partsSource.street,
      partsSource.line1
    ),
    line2: i130aAppendixFirstValue(pick(['line2', 'addressLine2', 'streetAddress2', 'diaChiLine2']), partsSource.line2),
    city: i130aAppendixFirstValue(pick(['city', 'town', 'district', 'huyenThanhPho', 'huyen', 'thanhPho', 'diaChiCity']), partsSource.city),
    province: i130aAppendixFirstValue(pick(['province', 'state', 'tinh', 'tinhBang', 'diaChiProvince', 'diaChiState']), partsSource.province, partsSource.state),
    zip: i130aAppendixFirstValue(pick(['zipCode', 'zip', 'postalCode', 'maZip', 'diaChiZip', 'diaChiZipCode']), partsSource.zip, partsSource.zipCode),
    country: i130aAppendixFirstValue(pick(['country', 'quocGia', 'diaChiCountry']), partsSource.country)
  }

  const raw = i130aAppendixFirstValue(addressValue, source?.diaChi, source?.address, source?.fullAddress)
  const parts = String(raw || '')
    .split(/\r?\n|,|;/)
    .map(part => part.trim())
    .filter(Boolean)

  const parsed = { street: '', line2: '', city: '', province: '', zip: '', country: '' }
  if (parts.length) {
    const countryKey = i130aAppendixNormalize(parts[parts.length - 1])
    if (/^(VIETNAM|VIET NAM|VN|USA|US|UNITED STATES|UNITED STATES OF AMERICA)$/.test(countryKey)) {
      parsed.country = parts.pop()
    }
    if (parts.length && /^\d{4,10}(?:-\d{4})?$/.test(parts[parts.length - 1])) {
      parsed.zip = parts.pop()
    }
    if (parts.length) parsed.province = parts.pop()
    if (parts.length) parsed.city = parts.pop()
    if (parts.length) parsed.street = parts.join(', ')
  }

  const merged = {
    street: i130aAppendixFirstValue(explicit.street, parsed.street),
    line2: i130aAppendixFirstValue(explicit.line2, parsed.line2),
    city: i130aAppendixFirstValue(explicit.city, parsed.city),
    province: i130aAppendixFirstValue(explicit.province, parsed.province),
    zip: i130aAppendixFirstValue(explicit.zip, parsed.zip),
    country: i130aAppendixFirstValue(explicit.country, parsed.country)
  }

  // Khong tu dien VIETNAM/USA nua. O Country chi duoc lay tu o Quoc gia hoac field country ro rang.
  if (merged.line2 && i130aAppendixIsLocalAddressPart(merged.line2)) {
    merged.street = [merged.street, merged.line2].filter(Boolean).join(', ')
    merged.line2 = ''
  }

  return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, value === undefined || value === null ? '' : i130aAppendixNormalize(value)]))
}



function i130aAppendixParentResidenceParts(parent = {}, source = {}, data = {}, relation = 'father') {
  const prefix = relation === 'father' ? 'father' : 'mother'

  const isDeceased = (statusVal) => {
    if (!statusVal) return false
    const status = String(statusVal).trim().toUpperCase()
    const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/Đ/gi, 'D')
    return ['DA MAT', 'DAMAT', 'QUA DOI', 'QUADOI', 'CHET', 'DECEASED', 'DEAD', 'NO', 'KHONG', 'MAT'].some(word => normalized.includes(word))
  }

  const statusVal = i130aAppendixFirstValue(
    parent.status,
    parent.tinhTrang,
    parent.songCon,
    parent.tinhTrangSucKhoe,
    source[`${prefix}Status`],
    data[`${prefix}Status`]
  )

  if (isDeceased(statusVal)) {
    return { city: 'DECEASED', country: 'DECEASED' }
  }

  const addressText = i130aAppendixFirstValue(
    parent.residenceAddress,
    parent.currentAddress,
    parent.diaChi,
    parent.address,
    source[`${prefix}ResidenceAddress`],
    source[`${prefix}CurrentAddress`],
    data[`${prefix}ResidenceAddress`],
    data[`${prefix}CurrentAddress`],
    parent.residenceCountry,
    source[`${prefix}ResidenceCountry`],
    data[`${prefix}ResidenceCountry`]
  )
  const parts = i130aAppendixSplitAddress(addressText, parent)

  return {
    city: i130aAppendixFirstValue(
      i130aAppendixCityOnly(parent.residenceCity, parent.cityOfResidence, source[`${prefix}ResidenceCity`], data[`${prefix}ResidenceCity`]),
      parts.city || parts.province
    ),
    country: i130aAppendixFirstValue(
      i130aAppendixCountryOnly(addressText),
      i130aAppendixCountryOnly(parent.residenceCountry, source[`${prefix}ResidenceCountry`], data[`${prefix}ResidenceCountry`]),
      parts.country
    )
  }
}




function i130aAppendixRow(row) {
  const id = `appendix_${row.id}`.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const value = i130aAppendixEscapeHtml(i130aAppendixDisplayValue(row.label, row.value))
  const numberCell = row.number ? `<strong>${i130aAppendixEscapeHtml(row.number)}</strong>` : ''
  const dataEditable = props.mode === 'create' ? ' contenteditable="true"' : ' contenteditable="false"'
  const noteEditable = props.mode === 'review' ? ' contenteditable="true"' : ' contenteditable="false"'
  const noteColspan = (props.mode === 'review' || props.mode === 'view') ? 11 : 2

  // Bám đúng layout gốc của file public/forms/i130a.html:
  // 26 cột = # (2) + Hạng mục (11) + Xử lý (11) + NOTE/Tư vấn (2)
  return `
    <tr class="i130a-appended-row" data-i130a-appendix-row="1">
      <td colspan="2">${numberCell}</td>
      <td colspan="11">${i130aAppendixEscapeHtml(row.label)}</td>
      <td colspan="11" class="data-cell color-customer" data-cell-id="data_${id}" data-original-html="" data-filled="true" data-filled-value="${value}"${dataEditable}>${value}</td>
      <td colspan="${noteColspan}" class="note-cell" data-cell-id="note_${id}" data-original-html="" data-submitted-value=""${noteEditable}></td>
    </tr>
  `
}

function i130aAppendixSection(title, rows) {
  const isAddress = title === 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA'
  const isJob = title === 'THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA'
  const fullColspan = (props.mode === 'review' || props.mode === 'view') ? 35 : 26
  let buttonHtml = ''
  if (props.mode !== 'view') {
    if (isAddress) {
      buttonHtml = `<button type="button" class="i130a-appendix-add-address-btn" style="float:right;width:22px;height:22px;line-height:18px;margin-left:8px;border:1px solid #16a34a;border-radius:4px;background:#dcfce7;color:#166534;font-size:16px;font-weight:700;font-family:Arial,sans-serif;cursor:pointer;padding:0;" title="Thêm địa chỉ">+</button>`
    } else if (isJob) {
      buttonHtml = `<button type="button" class="i130a-appendix-add-job-btn" style="float:right;width:22px;height:22px;line-height:18px;margin-left:8px;border:1px solid #16a34a;border-radius:4px;background:#dcfce7;color:#166534;font-size:16px;font-weight:700;font-family:Arial,sans-serif;cursor:pointer;padding:0;" title="Thêm công việc">+</button>`
    }
  }

  return `
    <tr class="i130a-appended-row appendix-section-row" data-i130a-appendix-row="1">
      <td colspan="${fullColspan}" style="text-align:center;vertical-align:middle;">
        <strong>${i130aAppendixEscapeHtml(title)}</strong>
        ${buttonHtml}
      </td>
    </tr>
    ${rows.map(row => i130aAppendixRow(row)).join('')}
  `
}

function i130aAppendixRows(rows) {
  return rows.map(row => i130aAppendixRow(row)).join('')
}

function i130aAppendixFindMainTbody() {
  if (!paperRef.value) return null
  const page = paperRef.value.querySelector('main.page') || paperRef.value.querySelector('.page') || paperRef.value
  const tables = Array.from(page.querySelectorAll(':scope > table'))
  const mainTable = tables[tables.length - 1] || page.querySelector('table:last-of-type')
  return mainTable?.querySelector('tbody') || null
}

function i130aAppendixBindCells(section) {
  if (!section) return

  section.querySelectorAll('.data-cell').forEach(td => {
    td.classList.remove('color-filler', 'color-reviewer')
    td.classList.add('color-customer')

    if (props.mode !== 'create') {
      td.setAttribute('contenteditable', 'false')
      return
    }

    td.setAttribute('contenteditable', 'true')
    td.addEventListener('focus', function () {
      if (this.dataset.filled === 'true' && this.innerHTML.trim() === (this.dataset.filledValue || '').trim()) {
        // Giữ lại dữ liệu gốc, chỉ cho người xử lý bôi sửa trực tiếp.
      }
    })
    td.addEventListener('blur', function () {
      const val = this.innerHTML.trim()
      const originalValue = (this.dataset.filledValue || '').trim()

      const jobDateMatch = this.dataset.cellId?.match(/^data_appendix_job_\d+_(from|to)$/)
      if (jobDateMatch) {
        setTimeout(() => {
          sortAppendixJobSections()
        }, 100)
      }

      const employerMatch = this.dataset.cellId?.match(/^data_appendix_job_(\d+)_employer$/)
      if (employerMatch) {
        const blockNum = employerMatch[1]
        const text = val.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
        if (text === 'UNEMPLOYED' || text === 'THAT NGHIEP' || text === 'KHONG CO VIEC LAM') {
          const prefix = `appendix_job_${blockNum}`
          const tbody = i130aAppendixFindMainTbody()
          ;['address1', 'address2', 'city', 'state', 'zip', 'country', 'occupation'].forEach(field => {
            const cellId = `data_${prefix}_${field}`
            changes.value[cellId] = '__CLEARED__'
            if (tbody) {
              const cell = tbody.querySelector(`[data-cell-id="${cellId}"]`)
              if (cell) {
                cell.innerHTML = ''
                cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
                delete cell.dataset.filled
                delete cell.dataset.filledValue
              }
            }
          })
        }
      }

      if (!val || val === '<br>') {
        this.innerHTML = ''
        this.classList.remove('color-customer', 'color-filler', 'color-reviewer')
        changes.value[this.dataset.cellId] = '__CLEARED__'
      } else if (val === originalValue) {
        this.classList.remove('color-filler', 'color-reviewer')
        this.classList.add('color-customer')
        delete changes.value[this.dataset.cellId]
      } else {
        this.classList.remove('color-customer', 'color-reviewer')
        this.classList.add('color-filler')
        changes.value[this.dataset.cellId] = val
      }
      emit('change', { ...changes.value })
      updateCorrectionCountDisplay()
    })
  })

  section.querySelectorAll('.note-cell').forEach(td => {
    td.classList.remove('color-customer', 'color-filler')
    td.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
    if (props.mode !== 'review') return

    td.addEventListener('input', function () {
      const val = this.innerHTML.trim()
      if (!val || val === '<br>') {
        this.innerHTML = ''
        this.classList.remove('color-reviewer')
        delete changes.value[this.dataset.cellId]
      } else {
        this.classList.remove('color-customer', 'color-filler')
        this.classList.add('color-reviewer')
        changes.value[this.dataset.cellId] = val
      }
      emit('change', { ...changes.value })
      updateCorrectionCountDisplay()
    })
  })
}

function i130aAppendixSectionRowGroup(sectionRow) {
  if (!sectionRow) return []
  const rows = [sectionRow]
  let next = sectionRow.nextElementSibling
  while (next && next.matches('tr[data-i130a-appendix-row="1"]') && !next.classList.contains('appendix-section-row')) {
    rows.push(next)
    next = next.nextElementSibling
  }
  return rows
}

// Địa chỉ/công việc thêm tay qua nút "+" chỉ được nối vào cuối, không tự sắp xếp
// theo ngày. Hàm này sắp lại các block CÙNG loại (cùng tiêu đề) theo thời gian mới
// nhất -> cũ nhất, giữ nguyên data-cell-id gốc (chỉ đổi số hiển thị "(N)") để lần
// tải lại sau không bị lệch dữ liệu đã lưu theo cellId.
function sortAppendixSectionsByTitle(titlePrefix) {
  const tbody = i130aAppendixFindMainTbody()
  if (!tbody) return

  const sectionRows = Array.from(tbody.querySelectorAll('tr.appendix-section-row')).filter(tr => {
    const titleText = tr.textContent.replace(/[+−-]/g, '').replace(/\s+/g, ' ').trim()
    return titleText.startsWith(titlePrefix)
  })
  if (sectionRows.length <= 1) return

  // i130aAppendixRow luôn phát ra đúng 4 <td>: số thứ tự, nhãn, data-cell, note-cell.
  const readFieldText = (rows, label) => {
    const row = rows.find(r => r.children[1]?.textContent.trim() === label)
    if (!row) return ''
    const dataCell = Array.from(row.children).find(td => td.classList.contains('data-cell'))
    return dataCell ? dataCell.textContent.trim() : ''
  }

  const groups = sectionRows.map((sectionRow, originalIndex) => {
    const rows = i130aAppendixSectionRowGroup(sectionRow)
    const fromValue = readFieldText(rows, 'From')
    const toValue = readFieldText(rows, 'To')
    const hasData = rows.some(r => {
      const dataCell = Array.from(r.children).find(td => td.classList.contains('data-cell'))
      return dataCell && dataCell.textContent.trim()
    })
    return {
      rows,
      hasData,
      originalIndex,
      sortTo: toValue || (fromValue ? 'PRESENT' : ''),
      sortFrom: fromValue
    }
  })

  const sortedGroups = groups.slice().sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1
    if (!a.hasData && !b.hasData) return a.originalIndex - b.originalIndex
    const endDiff = i130aAppendixParseSortDate(b.sortTo) - i130aAppendixParseSortDate(a.sortTo)
    if (endDiff) return endDiff
    const startDiff = i130aAppendixParseSortDate(b.sortFrom) - i130aAppendixParseSortDate(a.sortFrom)
    if (startDiff) return startDiff
    return a.originalIndex - b.originalIndex
  })

  if (sortedGroups.every((group, index) => group === groups[index])) return

  let insertAfter = sectionRows[0].previousElementSibling
  sortedGroups.forEach((group, displayIndex) => {
    const titleCell = group.rows[0].querySelector('td')
    const titleStrong = titleCell?.querySelector('strong')
    if (titleStrong) titleStrong.textContent = displayIndex === 0 ? titlePrefix : `${titlePrefix} (${displayIndex + 1})`

    const numberCell = Array.from(group.rows[1]?.children || []).find(td => td.querySelector('strong'))
    const numberStrong = numberCell?.querySelector('strong')
    if (numberStrong && numberStrong.textContent.trim()) numberStrong.textContent = `(${displayIndex + 1})`

    group.rows.forEach(row => {
      if (insertAfter) insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling)
      else tbody.insertBefore(row, tbody.firstChild)
      insertAfter = row
    })
  })
}

function sortAppendixJobSections() {
  sortAppendixSectionsByTitle('THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA')
}




function renderBeneficiaryAppendixForSpouseCase(data = {}) {
  if (!paperRef.value) return

  paperRef.value.querySelectorAll('#i130a-beneficiary-appendix-section, tr[data-i130a-appendix-row="1"]').forEach(el => el.remove())

  if (!i130aAppendixIsBaoLanhVoChongCase(data)) return

  const beneficiary = i130aAppendixGetBeneficiaryData(data)
  const hasBeneficiarySource = Object.keys(beneficiary || {}).length > 0
  const source = hasBeneficiarySource ? beneficiary : data
  const parentFallback = hasBeneficiarySource ? {} : data

  const name = i130aAppendixSplitName(
    source,
    data.beneficiaryFullName,
    data.beneficiaryName,
    data.ndblFullName,
    data.hoTenNguoiDuocBaoLanh
  )

  const birthDate = i130aAppendixFormatDate(
    i130aAppendixPick(source, ['birthDate', 'dob', 'ngaySinh', 'dateOfBirth', 'beneficiaryBirthDate']),
    data.beneficiaryBirthDate,
    data.ngaySinhNguoiDuocBaoLanh
  )

  const phone = i130aAppendixFirstValue(
    i130aAppendixPick(source, ['daytimePhone', 'mobilePhone', 'phone', 'soDienThoai', 'contactPrimary', 'beneficiaryDaytimePhone']),
    data.beneficiaryDaytimePhone,
    data.beneficiaryMobilePhone
  )

  const email = i130aAppendixFirstValue(
    i130aAppendixPick(source, ['email', 'emailAddress', 'beneficiaryEmail']),
    data.beneficiaryEmail,
    data.emailNguoiDuocBaoLanh
  )

  const addressItems = i130aAppendixGetAddressList(source, data)
    .map(item => {
      const addrText = i130aAppendixFirstValue(
        item.fullAddress,
        item.currentAddress,
        item.address,
        item.diaChi,
        item.diaChiNhanThuVN,
        source.beneficiaryCurrentAddress,
        data.beneficiaryCurrentAddress
      )
      return {
        parts: i130aAppendixSplitAddress(addrText, item),
        from: i130aAppendixFormatDate(item.from, item.fromDate, item.startDate, item.currentAddressFrom, item.ngayBatDau),
        to: i130aAppendixFirstValue(
          i130aAppendixFormatDate(item.to, item.toDate, item.endDate, item.currentAddressTo, item.ngayKetThuc, item.ngayChuyenDi),
          item.isCurrent || item.present || item.current ? 'PRESENT' : ''
        )
      }
    })
    .filter(item => item.parts.street || item.parts.city || item.parts.province || item.parts.country || item.from || item.to)

  if (!addressItems.length) {
    addressItems.push({
      parts: i130aAppendixSplitAddress(
        i130aAppendixFirstValue(source.currentAddress, source.address, source.diaChi, data.beneficiaryCurrentAddress),
        source
      ),
      from: i130aAppendixFormatDate(source.currentAddressFrom, source.fromDate, source.ngayBatDau),
      to: i130aAppendixFirstValue(i130aAppendixFormatDate(source.currentAddressTo, source.toDate, source.ngayChuyenDi), 'PRESENT')
    })
  }

  const getAppendixSavedCount = (changeMap, type) => {
    if (!changeMap) return 0
    const pattern = new RegExp(`^(?:data|note)_appendix_${type}_(\\d+)_`)
    return Object.keys(changeMap).reduce((max, key) => {
      const match = key.match(pattern)
      return match ? Math.max(max, parseInt(match[1], 10) || 0) : max
    }, 0)
  }

  // Math.max độc lập giữa 3 nguồn không đủ: nếu một block đã lưu ở _fillerChanges/_reviewChanges
  // từ phiên trước, rồi bị xóa (__DELETED__) trong changes.value ở phiên này, phải để changes.value
  // (mới nhất) ghi đè lên các nguồn cũ, nếu không block đã xóa sẽ "sống lại" ở lần tải sau.
  const getEffectiveAppendixSavedCount = (type) => {
    const pattern = new RegExp(`^(?:data|note)_appendix_${type}_(\\d+)_`)
    const allKeys = new Set([
      ...Object.keys(changes.value || {}),
      ...Object.keys(data._fillerChanges || {}),
      ...Object.keys(data._reviewChanges || {})
    ])
    let max = 0
    allKeys.forEach(key => {
      const match = key.match(pattern)
      if (!match) return
      const effectiveValue = changes.value?.[key] !== undefined
        ? changes.value[key]
        : (data._fillerChanges?.[key] !== undefined ? data._fillerChanges[key] : data._reviewChanges?.[key])
      if (effectiveValue === '__DELETED__') return
      max = Math.max(max, parseInt(match[1], 10) || 0)
    })
    return max
  }

  const savedAddressCount = getEffectiveAppendixSavedCount('address')
  const addressCount = Math.max(addressItems.length, savedAddressCount, 1)

  const father = i130aAppendixGetParent(source, 'father')
  const mother = i130aAppendixGetParent(source, 'mother')
  const fatherName = i130aAppendixSplitParentName(father, source.fatherFullName, source.tenCha, parentFallback.fatherFullName)
  const motherName = i130aAppendixSplitParentName(mother, source.motherFullName, source.tenMe, parentFallback.motherFullName)
  const fatherBirthPlace = i130aAppendixFirstValue(father.birthPlace, father.noiSinh, source.fatherBirthPlace, parentFallback.fatherBirthPlace)
  const motherBirthPlace = i130aAppendixFirstValue(mother.birthPlace, mother.noiSinh, source.motherBirthPlace, parentFallback.motherBirthPlace)
  const fatherResidence = i130aAppendixParentResidenceParts(father, source, parentFallback, 'father')
  const motherResidence = i130aAppendixParentResidenceParts(mother, source, parentFallback, 'mother')

  const jobItems = i130aAppendixGetJobList(source, data)
    .map(item => {
      const employerAddress = i130aAppendixSplitAddress(
        i130aAppendixFirstValue(
          item.employerAddress,
          item.companyAddress,
          item.currentEmployerAddress,
          item.address,
          item.diaChi,
          item.diaChiCongTy,
          source.currentEmployerAddress,
          data.currentEmployerAddress
        ),
        item,
        'employer'
      )
      return {
        employer: i130aAppendixNormalize(i130aAppendixFirstValue(item.employerName, item.currentEmployerName, item.companyName, item.tenCongTy, source.currentEmployerName, data.currentEmployerName)),
        address: employerAddress,
        occupation: i130aAppendixNormalize(i130aAppendixFirstValue(item.occupation, item.currentOccupation, item.jobTitle, item.chucVu, item.ngheNghiep, source.currentOccupation, data.currentOccupation)),
        from: i130aAppendixFormatDate(item.from, item.fromDate, item.startDate, item.currentEmploymentBeginDate, item.ngayNhanViec, item.ngayBatDau),
        to: i130aAppendixFirstValue(i130aAppendixFormatDate(item.to, item.toDate, item.endDate, item.ngayNghiViec, item.ngayKetThuc), item.isCurrent || item.present || item.current ? 'PRESENT' : '')
      }
    })
    .filter(item => item.employer || item.occupation || item.address.street || item.from || item.to)
    .sort((a, b) => {
      const aTo = a.to || (a.from ? 'PRESENT' : '')
      const bTo = b.to || (b.from ? 'PRESENT' : '')
      const endDiff = i130aAppendixParseSortDate(bTo) - i130aAppendixParseSortDate(aTo)
      if (endDiff) return endDiff
      return i130aAppendixParseSortDate(b.from) - i130aAppendixParseSortDate(a.from)
    })

  const savedJobCount = getEffectiveAppendixSavedCount('job')
  const jobCount = Math.max(jobItems.length, savedJobCount, 1)

  const rows = []
  const pushSection = (title, sectionRows) => {
    rows.push(i130aAppendixSection(title, sectionRows))
  }

  pushSection('PHẦN THÔNG TIN I-130A - NGƯỜI ĐƯỢC BẢO LÃNH', [
    { id: 'info_family_name', label: 'Family name (last name)', value: name.family },
    { id: 'info_given_name', label: 'Given name (first name)', value: name.given },
    { id: 'info_middle_name', label: 'Middle name', value: name.middle },
    { id: 'info_birth_date', label: 'What is your date of birth?', value: birthDate }
  ])

  for (let index = 0; index < addressCount; index++) {
    const item = addressItems[index] || { parts: { street: '', line2: '', city: '', province: '', zip: '', country: '' }, from: '', to: '' }
    pushSection(index === 0 ? 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA' : `ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA (${index + 1})`, [
      { id: `address_${index + 1}_line1`, number: `(${index + 1})`, label: 'Address line 1', value: item.parts.street },
      { id: `address_${index + 1}_line2`, label: 'Address line 2', value: item.parts.line2 },
      { id: `address_${index + 1}_city`, label: 'City or town', value: item.parts.city },
      { id: `address_${index + 1}_province`, label: 'Province', value: item.parts.province },
      { id: `address_${index + 1}_zip`, label: 'ZIP code/Postal code', value: item.parts.zip },
      { id: `address_${index + 1}_country`, label: 'Country', value: item.parts.country },
      { id: `address_${index + 1}_from`, label: 'From', value: item.from },
      { id: `address_${index + 1}_to`, label: 'To', value: item.to || 'PRESENT' }
    ])
  }

  pushSection('THÔNG TIN BỐ MẸ', [
    { id: 'father_family', number: '(1)', label: 'Family name (last name)', value: fatherName.family },
    { id: 'father_given', label: 'Given name (first name)', value: fatherName.given },
    { id: 'father_middle', label: 'Middle name', value: fatherName.middle },
    { id: 'father_dob', label: 'What is their date of birth?', value: i130aAppendixFormatDate(father.birthDate, father.dob, father.ngaySinh, source.fatherBirthDate, parentFallback.fatherBirthDate) },
    { id: 'father_relation', label: 'What is their relationship to the beneficiary?', value: 'FATHER' },
    { id: 'father_birth_city', label: 'What is their city /town/village of birth?', value: i130aAppendixFirstValue(i130aAppendixCityOnly(father.birthCity), i130aAppendixCityOnly(fatherBirthPlace)) },
    { id: 'father_birth_country', label: 'What is their country of birth?', value: i130aAppendixCountryOnly(father.birthCountry, source.fatherBirthCountry, parentFallback.fatherBirthCountry, fatherBirthPlace) },
    { id: 'father_residence_city', label: 'What is their city /town/village of residence?', value: fatherResidence.city },
    { id: 'father_residence_country', label: 'What is their country of residence?', value: fatherResidence.country },
    { id: 'mother_family', number: '(2)', label: 'Family name (maiden name)', value: motherName.family },
    { id: 'mother_given', label: 'Given name (first name)', value: motherName.given },
    { id: 'mother_middle', label: 'Middle name', value: motherName.middle },
    { id: 'mother_dob', label: 'What is their date of birth?', value: i130aAppendixFormatDate(mother.birthDate, mother.dob, mother.ngaySinh, source.motherBirthDate, parentFallback.motherBirthDate) },
    { id: 'mother_relation', label: 'What is their relationship to the beneficiary?', value: 'MOTHER' },
    { id: 'mother_birth_city', label: 'What is their city /town/village of birth?', value: i130aAppendixFirstValue(i130aAppendixCityOnly(mother.birthCity), i130aAppendixCityOnly(motherBirthPlace)) },
    { id: 'mother_birth_country', label: 'What is their country of birth?', value: i130aAppendixCountryOnly(mother.birthCountry, source.motherBirthCountry, parentFallback.motherBirthCountry, motherBirthPlace) },
    { id: 'mother_residence_city', label: 'What is their city /town/village of residence?', value: motherResidence.city },
    { id: 'mother_residence_country', label: 'What is their country of residence?', value: motherResidence.country }
  ])

  const normalizedJobs = []
  for (let index = 0; index < jobCount; index++) {
    normalizedJobs.push(jobItems[index] || { employer: '', address: {}, occupation: '', from: '', to: '' })
  }
  normalizedJobs.forEach((item, index) => {
    pushSection(index === 0 ? 'THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA' : `THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA (${index + 1})`, [
      { id: `job_${index + 1}_employer`, number: `(${index + 1})`, label: 'Name of current employer', value: item.employer },
      { id: `job_${index + 1}_address1`, label: 'Address line 1', value: item.address?.street || '' },
      { id: `job_${index + 1}_address2`, label: 'Address line 2', value: item.address?.line2 || '' },
      { id: `job_${index + 1}_city`, label: 'City or town', value: item.address?.city || '' },
      { id: `job_${index + 1}_state`, label: 'State/Province', value: item.address?.province || '' },
      { id: `job_${index + 1}_zip`, label: 'ZIP code/Postal code', value: item.address?.zip || '' },
      { id: `job_${index + 1}_country`, label: 'Country', value: item.address?.country || '' },
      { id: `job_${index + 1}_occupation`, label: 'Your occupation', value: item.occupation },
      { id: `job_${index + 1}_from`, label: 'From', value: item.from },
      { id: `job_${index + 1}_to`, label: 'To', value: item.to || (index === 0 ? 'PRESENT' : '') }
    ])
  })

  pushSection('THÔNG TIN LIÊN LẠC', [
    { id: 'contact_daytime_phone', label: 'Daytime telephone number', value: phone },
    { id: 'contact_mobile_phone', label: 'Mobile telephone number (if any)', value: i130aAppendixFirstValue(i130aAppendixPick(source, ['mobilePhone', 'phone', 'soDienThoai']), phone) },
    { id: 'contact_email', label: 'Email address (if any)', value: email }
  ])

  const tbody = i130aAppendixFindMainTbody()
  if (!tbody) return

  // Gắn trực tiếp vào tbody của bảng PKT gốc, không tạo table/div mới.
  // Như vậy phần mới liền mạch với phiếu hiện tại và khi xuất PDF cũng đi chung một layout.
  tbody.insertAdjacentHTML('beforeend', rows.join(''))

  const appendixScope = {
    querySelectorAll: (selector) => tbody.querySelectorAll(`tr[data-i130a-appendix-row="1"] ${selector}`)
  }
  i130aAppendixBindCells(appendixScope)

  const findLastAppendixSectionRow = (titlePrefix) => {
    return Array.from(tbody.querySelectorAll('tr.appendix-section-row')).reverse().find(tr => {
      const titleText = tr.textContent.replace(/\+/g, '').replace(/\s+/g, ' ').trim()
      return titleText.startsWith(titlePrefix)
    }) || null
  }

  const findSectionLastRow = (sectionRow) => {
    if (!sectionRow) return null
    let last = sectionRow
    let next = sectionRow.nextElementSibling
    while (next && next.matches('tr[data-i130a-appendix-row="1"]') && !next.classList.contains('appendix-section-row')) {
      last = next
      next = next.nextElementSibling
    }
    return last
  }

  const bindNewAppendixRows = (insertedRows) => {
    if (!insertedRows.length) return
    const appendixScope = {
      querySelectorAll: (selector) => insertedRows.flatMap(row => Array.from(row.querySelectorAll(selector)))
    }
    i130aAppendixBindCells(appendixScope)
  }

  const insertAppendixHtmlAfter = (afterRow, html) => {
    if (!afterRow || !html) return []
    const template = document.createElement('template')
    template.innerHTML = html.trim()
    const insertedRows = Array.from(template.content.children)
    let insertRef = afterRow
    insertedRows.forEach(row => {
      insertRef.insertAdjacentElement('afterend', row)
      insertRef = row
    })
    bindNewAppendixRows(insertedRows)
    return insertedRows
  }

  const appendBlankAddressSection = (index) => {
    const lastAddressSection = findLastAppendixSectionRow('ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA')
    const insertRef = findSectionLastRow(lastAddressSection)
    const sectionRows = [
      { id: `address_${index}_line1`, number: `(${index})`, label: 'Address line 1', value: '' },
      { id: `address_${index}_line2`, label: 'Address line 2', value: '' },
      { id: `address_${index}_city`, label: 'City or town', value: '' },
      { id: `address_${index}_province`, label: 'Province', value: '' },
      { id: `address_${index}_zip`, label: 'ZIP code/Postal code', value: '' },
      { id: `address_${index}_country`, label: 'Country', value: '' },
      { id: `address_${index}_from`, label: 'From', value: '' },
      { id: `address_${index}_to`, label: 'To', value: '' }
    ]
    insertAppendixHtmlAfter(insertRef, i130aAppendixSection(`ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA (${index})`, sectionRows))
  }

  const appendBlankJobSection = (index) => {
    const lastJobSection = findLastAppendixSectionRow('THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA')
    const insertRef = findSectionLastRow(lastJobSection)
    const sectionRows = [
      { id: `job_${index}_employer`, number: `(${index})`, label: 'Name of current employer', value: '' },
      { id: `job_${index}_address1`, label: 'Address line 1', value: '' },
      { id: `job_${index}_address2`, label: 'Address line 2', value: '' },
      { id: `job_${index}_city`, label: 'City or town', value: '' },
      { id: `job_${index}_state`, label: 'State/Province', value: '' },
      { id: `job_${index}_zip`, label: 'ZIP code/Postal code', value: '' },
      { id: `job_${index}_country`, label: 'Country', value: '' },
      { id: `job_${index}_occupation`, label: 'Your occupation', value: '' },
      { id: `job_${index}_from`, label: 'From', value: '' },
      { id: `job_${index}_to`, label: 'To', value: '' }
    ]
    insertAppendixHtmlAfter(insertRef, i130aAppendixSection(`THÔNG TIN CÔNG VIỆC TRONG 5 NĂM QUA (${index})`, sectionRows))
  }

  // Attach button click listeners
  const addAddressBtn = tbody.querySelector('.i130a-appendix-add-address-btn')
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const nextIndex = Math.max(addressCount, getAppendixSavedCount(changes.value, 'address')) + 1
      changes.value[`data_appendix_address_${nextIndex}_line1`] = ''
      appendBlankAddressSection(nextIndex)
      emit('change', { ...changes.value })
      updateCorrectionCountDisplay()
    })
  }

  const addJobBtn = tbody.querySelector('.i130a-appendix-add-job-btn')
  if (addJobBtn) {
    addJobBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const nextIndex = Math.max(jobCount, getAppendixSavedCount(changes.value, 'job')) + 1
      changes.value[`data_appendix_job_${nextIndex}_employer`] = ''
      appendBlankJobSection(nextIndex)
      emit('change', { ...changes.value })
      updateCorrectionCountDisplay()
    })
  }
}

function copyDataToNoteForReviewer() {
  if ((props.mode !== 'review' && props.mode !== 'view') || !paperRef.value) return
  paperRef.value.querySelectorAll('.note-cell').forEach(nCell => {
    if (!nCell.innerHTML.trim()) {
      nCell.innerHTML = ''
      nCell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    }
  })
}

function resetTable(shouldEmit = false) {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('.data-cell, .note-cell').forEach(td => {
    if (td.classList.contains('spouse-address-option-cell')) {
      clearSpouseAddressOptionCell(td)
    } else if (td.classList.contains('yesno-cell')) {
      // Reset checkboxes thay vì thay innerHTML
      td.querySelectorAll('.yesno-check').forEach(chk => { chk.checked = false })
      td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    } else if (td.classList.contains('immigrant-status-cell')) {
      td.querySelectorAll('.immigrant-status-check').forEach(chk => { chk.checked = false })
      td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    } else {
      td.innerHTML = td.dataset.originalHtml || ''
      td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
    }
    delete td.dataset.filled
    delete td.dataset.filledValue
    delete td.dataset.submittedValue
    delete td.dataset.i130DateFormatted
  })
  changes.value = {}
  if (shouldEmit) emit('change', {})
}




function updateI130APetitionSectionTitle(data = {}) {
  if (!paperRef.value) return
  const title = resolveI130APetitionSectionTitle(data)
  const rows = Array.from(paperRef.value.querySelectorAll('tbody tr'))
  const row = rows.find(tr => normalizeI130ARelationshipText(tr.textContent) === 'vo chong')
  const strong = row?.querySelector('strong')
  if (strong) strong.textContent = title
}

function autoFillData(data) {
  resetTable()
  if (!paperRef.value || !data) return
  convertSpouseAddressOptionCells()
  updateI130APetitionSectionTitle(data)

  // Helper: bỏ dấu tiếng Việt và in hoa
  const toUpperNoAccent = (str) => {
    if (!str) return ''
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase()
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const firstFilledValue = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null) continue
      if (typeof value === 'object') {
        const nested = firstFilledValue(value.value, value.date, value.fullDate, value.birthDate, value.dob, value.year, value.y)
        if (nested !== '') return nested
        continue
      }
      const text = String(value).trim()
      if (text !== '') return text
    }
    return ''
  }

  const pickDateValue = (...values) => {
    const raw = firstFilledValue(...values)
    if (!raw) return ''
    const text = String(raw).trim()
    const yearMatch = text.match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2}|21\d{2})(?:\D|$)/)
    if (/^\d{4}$/.test(text) || !text.includes('/') && !text.includes('-') && yearMatch) {
      return yearMatch ? yearMatch[1] : text
    }
    return text
  }

  const fillDateCells = (firstCell, dateStr) => {
    if (!firstCell || !dateStr) return
    let d = '', m = '', y = ''
    const rawDate = String(dateStr || '').trim()
    const dateOnly = rawDate.split('T')[0]
    const parts = dateOnly.split(/[-/]/).map(part => part.trim()).filter(Boolean)
    if (parts.length >= 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        y = parts[0]; m = parseInt(parts[1], 10); d = parts[2]
      } else {
        const p0 = parseInt(parts[0], 10)
        const p1 = parseInt(parts[1], 10)
        if (p1 > 12) { // MM/DD/YYYY
          m = p0; d = p1; y = parts[2]
        } else { // DD/MM/YYYY hoặc ngày/tháng/năm nhập từ form Việt Nam
          d = p0; m = p1; y = parts[2]
        }
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) { // YYYY-MM
        y = parts[0]; m = parseInt(parts[1], 10); d = ''
      } else { // MM/YYYY
        m = parseInt(parts[0], 10); y = parts[1]; d = ''
      }
    } else if (parts.length === 1) {
      // Trường hợp khách chỉ nhập năm sinh, ví dụ: "1965", hoặc nhập mô tả có kèm năm.
      // Vẫn phải đưa năm vào ô Năm, không được bỏ trống.
      const singlePart = parts[0]
      const yearMatch = singlePart.match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2}|21\d{2})(?:\D|$)/)
      if (/^\d{4}$/.test(singlePart)) {
        y = singlePart
      } else if (yearMatch) {
        y = yearMatch[1]
      }
    }
    if (!y) {
      const yearMatch = rawDate.match(/(?:^|\D)(18\d{2}|19\d{2}|20\d{2}|21\d{2})(?:\D|$)/)
      if (yearMatch && !rawDate.includes('/') && !rawDate.includes('-')) y = yearMatch[1]
    }
    const monthStr = (m >= 1 && m <= 12) ? monthNames[m - 1].toUpperCase() : ''
    const mm = (m >= 1 && m <= 12) ? String(m).padStart(2, '0') : ''
    const dd = d ? String(d).padStart(2, '0') : ''
    const fullDateValue = (mm && dd && y) ? `${mm}/${dd}/${y}` : formatI130DateMMDDYYYY(rawDate)

    const fillDatePart = (cell, value) => {
      if (!cell) return
      cell.innerHTML = value
      cell.dataset.filled = 'true'
      cell.dataset.filledValue = value
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(value || ''))) cell.dataset.i130DateFormatted = 'true'
      cell.classList.add('color-customer')
    }

    let second = firstCell.nextElementSibling
    while (second && !second.classList.contains('data-cell')) second = second.nextElementSibling

    // Một số dòng trong phiếu kiểm tra, đặc biệt phần CON CÁI, chỉ có 1 ô data cho ngày sinh.
    // Nếu vẫn tách ngày/tháng/năm như các dòng 3 ô thì chỉ hiện ngày. Khi chỉ có 1 ô, hiển thị đủ ngày tháng năm trong cùng ô.
    if (!second) {
      fillDatePart(firstCell, fullDateValue)
      return
    }

    let third = second.nextElementSibling
    while (third && !third.classList.contains('data-cell')) third = third.nextElementSibling

    // Nếu chỉ có năm, ưu tiên điền thẳng vào ô năm trong cùng dòng.
    // Tránh tình trạng ô Ngày/Tháng bị xóa nhưng ô Năm vẫn giữ placeholder "Năm".
    if (y && !d && !monthStr) {
      const rowDataCells = firstCell.parentElement
        ? Array.from(firstCell.parentElement.children).filter(cell => cell.classList.contains('data-cell'))
        : []
      const yearCell = third || rowDataCells[rowDataCells.length - 1] || firstCell
      fillDatePart(yearCell, y)
      return
    }

    fillDatePart(firstCell, d)
    fillDatePart(second, monthStr)

    if (third) {
      fillDatePart(third, y)
    }
  }

  const fillMonthYearCells = (firstCell, dateStr) => {
    if (!firstCell || !dateStr) return
    let m = '', y = ''
    const dateOnly = String(dateStr).split('T')[0]
    const parts = dateOnly.split(/[-/]/)
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        y = parts[0]
        m = parseInt(parts[1], 10)
      } else {
        const p0 = parseInt(parts[0], 10)
        const p1 = parseInt(parts[1], 10)
        if (p1 > 12) { // MM/DD/YYYY
          m = p0
          y = parts[2]
        } else { // DD/MM/YYYY hoặc ngày/tháng/năm nhập từ form Việt Nam
          m = p1
          y = parts[2]
        }
      }
    } else if (parts.length === 2) {
      if (parts[0].length === 4) {
        y = parts[0]
        m = parseInt(parts[1], 10)
      } else {
        m = parseInt(parts[0], 10)
        y = parts[1]
      }
    } else if (parts.length === 1) {
      const singlePart = parts[0].trim()
      if (/^\d{4}$/.test(singlePart)) {
        y = singlePart
      }
    }
    const monthStr = (m >= 1 && m <= 12) ? monthNames[m - 1].toUpperCase() : ''

    firstCell.innerHTML = ''
    firstCell.dataset.filled = 'true'
    firstCell.dataset.filledValue = ''
    firstCell.classList.remove('color-customer', 'color-filler', 'color-reviewer')

    let second = firstCell.nextElementSibling
    while (second && !second.classList.contains('data-cell')) second = second.nextElementSibling
    if (second) {
      second.innerHTML = monthStr
      second.dataset.filled = 'true'
      second.dataset.filledValue = monthStr
      second.classList.add('color-customer')

      let third = second.nextElementSibling
      while (third && !third.classList.contains('data-cell')) third = third.nextElementSibling
      if (third) {
        third.innerHTML = y
        third.dataset.filled = 'true'
        third.dataset.filledValue = y
        third.classList.add('color-customer')
      }
    }
  }

  // Helper: parse duration and fill number in current cell, unit in next cell
  const fillDurationInUS = (firstCell, val) => {
    if (!firstCell || !val) return
    const str = val.toString().trim()
    
    const numMatch = str.match(/\d+/)
    const number = numMatch ? numMatch[0] : ''
    
    const textPart = str.replace(/\d+/g, '').trim().toUpperCase()
    let englishUnit = 'MONTHS' // default
    if (textPart.includes('TUAN') || textPart.includes('TUẦN') || textPart.includes('WEEK')) englishUnit = 'WEEKS'
    else if (textPart.includes('THANG') || textPart.includes('THÁNG') || textPart.includes('MONTH')) englishUnit = 'MONTHS'
    else if (textPart.includes('NGAY') || textPart.includes('NGÀY') || textPart.includes('DAY')) englishUnit = 'DAYS'
    else if (textPart.includes('NAM') || textPart.includes('NĂM') || textPart.includes('YEAR')) englishUnit = 'YEARS'
    
    firstCell.innerHTML = number
    firstCell.dataset.filled = 'true'
    firstCell.dataset.filledValue = number
    firstCell.classList.add('color-customer')
    
    // The next cell in ds160.html is currently hardcoded with <strong>MONTHS</strong>
    let next = firstCell.nextElementSibling
    if (next) {
      next.innerHTML = `<strong>${englishUnit}</strong>`
      next.classList.add('color-customer')
    }
  }

  const firstValue = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''

  const emptyAddressParts = () => ({ street: '', line2: '', city: '', province: '', zip: '', country: '' })

  const cleanAddressPart = (value) => stripHtml(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:street address(?:\s*\(line\s*[12]\))?|address(?:\s*line\s*[12])?|city|state\/province|state|province|postal zone\/zip code|postal|zip|country\/region|country)\s*[:.-]\s*/i, '')
    .trim()

  const normalizeAddressPart = (value) => normalizeText(cleanAddressPart(value))
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const addressPartsHaveValue = (parts) => !!(
    parts.street || parts.line2 || parts.city || parts.province || parts.zip || parts.country
  )

  const knownCountryName = (value) => {
    const normalized = normalizeAddressPart(value)
    if (!normalized) return ''
    if (/^(VIET ?NAM|VN)$/.test(normalized)) return 'VIET NAM'
    if (/^(UNITED STATES|UNITED STATES OF AMERICA|USA|US|U S|U S A|AMERICA|HOA KY|MY)$/.test(normalized)) {
      return 'USA'
    }
    return ''
  }

  const normalizeVNPlaceName = (value) => {
    const cleaned = cleanAddressPart(value)
    const normalized = normalizeAddressPart(cleaned)
    if (!normalized) return cleaned

    if (/^(SAI GON|SAIGON|TP HCM|TPHCM|HCM|HCMC|TP HO CHI MINH|THANH PHO HO CHI MINH|HO CHI MINH|HO CHI MINH CITY)$/.test(normalized)) {
      return 'HO CHI MINH'
    }

    return cleaned
  }

  const isZipPart = (value) => {
    const cleaned = cleanAddressPart(value)
    const normalized = normalizeAddressPart(cleaned)
    return normalized === 'DOES NOT APPLY' || /^\d{4,10}(?:-\d{4})?$/.test(cleaned)
  }

  const isLocalAddressPart = (value) => {
    const normalized = normalizeAddressPart(value)
    return /\b(WARD|PHUONG|COMMUNE|XA|DISTRICT|QUAN|HUYEN|TOWN|THI XA)\b/.test(normalized) ||
           /^(P|Q)\s*\d+[A-Z]?$/.test(normalized)
  }

  const expandAddressKeys = (prefix, aliases) => {
    const keys = new Set()
    aliases.forEach(alias => {
      const suffix = alias.charAt(0).toUpperCase() + alias.slice(1)
      if (prefix) {
        keys.add(`${prefix}${suffix}`)
      } else {
        const lower = alias.charAt(0).toLowerCase() + alias.slice(1)
        const snake = alias.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()
        keys.add(alias)
        keys.add(suffix)
        keys.add(lower)
        keys.add(snake)
      }
    })
    return Array.from(keys)
  }

  const pickAddressProp = (source, prefix, aliases) => {
    if (!source) return ''
    return firstValue(...expandAddressKeys(prefix, aliases).map(key => source[key]))
  }

  const getStructuredAddressParts = (source, prefix = '', isUS = false) => {
    const parts = emptyAddressParts()
    if (!source) return parts

    const ward = pickAddressProp(source, prefix, ['Ward', 'WardVN', 'Phuong', 'Xa', 'Commune'])
    const district = pickAddressProp(source, prefix, ['District', 'DistrictVN', 'Quan', 'Huyen'])
    const line2Direct = pickAddressProp(source, prefix, [
      'Line2', 'Street2', 'AddressLine2', 'Address2', 'StreetAddress2'
    ])
    const line2FromAdmin = [ward, district].map(cleanAddressPart).filter(Boolean).join(', ')

    parts.street = cleanAddressPart(pickAddressProp(source, prefix, [
      'Street', 'StreetVN', 'Line1', 'AddressLine1', 'AddressStreet', 'StreetAddress'
    ]))
    parts.line2 = cleanAddressPart(firstValue(line2Direct, line2FromAdmin))
    parts.city = cleanAddressPart(pickAddressProp(source, prefix, [
      'City', 'CityVN', 'Town', 'AddressCity'
    ]))
    parts.province = cleanAddressPart(pickAddressProp(source, prefix, [
      isUS ? 'State' : 'Province',
      'Province', 'ProvinceVN', 'State', 'AddressProvince', 'AddressState'
    ]))
    parts.zip = cleanAddressPart(pickAddressProp(source, prefix, [
      'ZipCode', 'Zip', 'PostalCode', 'PostalZone'
    ]))
    parts.country = knownCountryName(pickAddressProp(source, prefix, [
      'Country', 'CountryVN', 'CountryRegion'
    ])) || cleanAddressPart(pickAddressProp(source, prefix, [
      'Country', 'CountryVN', 'CountryRegion'
    ]))

    return parts
  }

  const parseFreeformAddress = (addr, isUS = false) => {
    const result = emptyAddressParts()
    let parts = String(addr || '')
      .split(/\r?\n|,|;/)
      .map(cleanAddressPart)
      .filter(Boolean)

    if (!parts.length) return result

    const firstCountry = knownCountryName(parts[0])
    if (firstCountry) {
      result.country = firstCountry
      parts = parts.slice(1)

      if (parts.length && isZipPart(parts[0])) {
        result.zip = cleanAddressPart(parts[0])
        parts = parts.slice(1)
      }

      if (result.country === 'VIET NAM') {
        result.province = parts[0] || ''
        result.city = parts[1] || ''
        result.street = parts[2] || ''
        result.line2 = parts.slice(3).join(', ')
      } else if (result.country === 'USA' || isUS) {
        result.province = parts[0] || ''
        if (parts.length >= 4 && isZipPart(parts[1])) {
          result.zip = cleanAddressPart(parts[1])
          result.city = parts[2] || ''
          result.street = parts.slice(3).join(', ')
        } else {
          result.city = parts[1] || ''
          result.street = parts.slice(2).join(', ')
        }
      } else {
        result.province = parts[0] || ''
        result.city = parts[1] || ''
        result.street = parts.slice(2).join(', ')
      }

      return result
    }

    const lastCountry = knownCountryName(parts[parts.length - 1])
    if (lastCountry) {
      result.country = lastCountry
      parts = parts.slice(0, -1)
    }

    if (parts.length && isZipPart(parts[parts.length - 1])) {
      result.zip = cleanAddressPart(parts[parts.length - 1])
      parts = parts.slice(0, -1)
    }

    if (!parts.length) return result

    result.street = parts.shift() || ''
    if (!parts.length) return result

    if (isUS) {
      if (parts.length === 1) {
        result.city = parts[0]
      } else if (parts.length === 2) {
        result.city = parts[0]
        result.province = parts[1]
      } else {
        result.line2 = parts.slice(0, -2).join(', ')
        result.city = parts[parts.length - 2]
        result.province = parts[parts.length - 1]
      }
    } else if (parts.length === 1) {
      result.city = parts[0]
    } else if (parts.length === 2) {
      if (isLocalAddressPart(parts[0])) {
        result.line2 = parts[0]
        result.city = parts[1]
      } else {
        result.city = parts[0]
        result.province = parts[1]
      }
    } else {
      result.line2 = parts.slice(0, -2).join(', ')
      result.city = parts[parts.length - 2]
      result.province = parts[parts.length - 1]
    }

    return result
  }

  const splitAddr = (addr, dataObj = null, prefix = '', isUS = false) => {
    const explicit = getStructuredAddressParts(dataObj, prefix, isUS)
    const parsed = parseFreeformAddress(addr, isUS)
    const merged = {
      street: firstValue(explicit.street, parsed.street),
      line2: firstValue(explicit.line2, parsed.line2),
      city: firstValue(explicit.city, parsed.city),
      province: firstValue(explicit.province, parsed.province),
      zip: firstValue(explicit.zip, parsed.zip),
      country: firstValue(explicit.country, parsed.country)
    }

    if (addressPartsHaveValue({ ...merged, country: '' }) && !merged.country) {
      merged.country = isUS ? 'USA' : 'VIET NAM'
    }

    if (!isUS) {
      merged.city = normalizeVNPlaceName(merged.city)
      merged.province = normalizeVNPlaceName(merged.province)
    }

    return merged
  }

  const normalizeAddressCompare = (parts) => {
    return [
      parts.street,
      parts.line2,
      parts.city,
      parts.province,
      parts.zip,
      parts.country
    ].map(part => normalizeText(String(part || ''))
      .replace(/\b(VIET NAM|VIETNAM|VN)\b/g, 'VIETNAM')
      .replace(/[^A-Z0-9]/g, '')
    ).join('|')
  }

  const hasAddressValue = (parts) => {
    return addressPartsHaveValue(parts)
  }

  const getVNAddress = (baseName, splitPrefix = baseName) => {
    const prefixes = [...new Set([splitPrefix, baseName].filter(Boolean))]
    const fromPrefixes = (suffix) => prefixes.map(prefix => data[`${prefix}${suffix}`])
    const fullAddress = firstValue(
      data[baseName],
      ...fromPrefixes('Full'),
      ...fromPrefixes('FullAddress'),
      ...fromPrefixes('Address')
    )
    const parsed = splitAddr(fullAddress)
    const street = firstValue(
      ...fromPrefixes('Street'),
      ...fromPrefixes('StreetVN'),
      ...fromPrefixes('Line1'),
      ...fromPrefixes('AddressLine1'),
      parsed.street
    )
    const line2FromAdmin = [
      firstValue(...fromPrefixes('Ward'), ...fromPrefixes('WardVN'), ...fromPrefixes('Phuong'), ...fromPrefixes('Xa')),
      firstValue(...fromPrefixes('District'), ...fromPrefixes('DistrictVN'), ...fromPrefixes('Quan'), ...fromPrefixes('Huyen'))
    ].filter(Boolean).join(', ')
    const line2 = firstValue(
      ...fromPrefixes('Line2'),
      ...fromPrefixes('Street2'),
      ...fromPrefixes('AddressLine2'),
      line2FromAdmin,
      parsed.line2
    )
    const city = firstValue(
      ...fromPrefixes('City'),
      ...fromPrefixes('CityVN'),
      parsed.city,
      ...fromPrefixes('District')
    )
    const province = firstValue(
      ...fromPrefixes('Province'),
      ...fromPrefixes('ProvinceVN'),
      ...fromPrefixes('State'),
      parsed.province
    )
    const zip = firstValue(
      ...fromPrefixes('ZipCode'),
      ...fromPrefixes('Zip'),
      ...fromPrefixes('PostalCode'),
      ...fromPrefixes('PostalZone')
    )
    const country = firstValue(
      ...fromPrefixes('Country'),
      ...fromPrefixes('CountryVN'),
      parsed.country
    )

    return { street, line2, city, province, zip, country }
  }

  const resolveHomeMailingAddresses = () => {
    const home = getVNAddress('currentAddressVN', 'currentAddress')
    const rawMail = getVNAddress('mailingAddressVN', 'mailingAddress')
    const explicitSame = isAffirmativeValue(firstValue(
      data.mailingAddressSameAsHome,
      data.mailingSameAsHome,
      data.isMailingSameAsHome,
      data.mailingAddressVNIsSame,
      data.mailingAddressVNSameAsHome,
      data.sameMailingAddress,
      data.sameAsHomeAddress
    ))
    const hasHomeAddress = hasAddressValue(home)
    const hasMailAddress = hasAddressValue(rawMail)
    const isSameAddress = hasHomeAddress &&
                          (hasMailAddress
                            ? normalizeAddressCompare(home) === normalizeAddressCompare(rawMail)
                            : explicitSame)
    const mail = isSameAddress && !hasMailAddress ? { ...home } : rawMail

    return {
      home,
      mail,
      isSame: isSameAddress ? 'YES' : 'NO'
    }
  }

  const getUSAddress = (baseName, splitPrefix = baseName) => {
    const prefixes = [...new Set([splitPrefix, baseName].filter(Boolean))]
    const fromPrefixes = (suffix) => prefixes.map(prefix => data[`${prefix}${suffix}`])
    const fullAddress = firstValue(
      data[baseName],
      ...fromPrefixes('Full'),
      ...fromPrefixes('FullAddress'),
      ...fromPrefixes('Address')
    )
    const parsed = splitAddr(fullAddress, data, splitPrefix, true)
    const street = firstValue(
      ...fromPrefixes('Street'),
      ...fromPrefixes('Line1'),
      ...fromPrefixes('AddressLine1'),
      parsed.street
    )
    const line2 = firstValue(
      ...fromPrefixes('Line2'),
      ...fromPrefixes('Street2'),
      ...fromPrefixes('AddressLine2'),
      parsed.line2
    )
    const city = firstValue(...fromPrefixes('City'), parsed.city)
    const province = firstValue(
      ...fromPrefixes('State'),
      ...fromPrefixes('Province'),
      parsed.province
    )
    const zip = firstValue(
      ...fromPrefixes('ZipCode'),
      ...fromPrefixes('Zip'),
      ...fromPrefixes('PostalCode'),
      parsed.zip
    )
    const country = hasAddressValue({ street, line2, city, province, zip, country: '' })
      ? 'USA'
      : ''

    return { street, line2, city, province, zip, country }
  }

  const resolveSpouseAddressOption = () => {
    const explicitOption = normalizeSpouseAddressOptionValue(firstValue(
      data.spouseAddressOption,
      data.spouseCurrentAddressOption,
      data.spouseAddressType,
      data.spouseCurrentAddressType,
      data.spouseAddressSameAs,
      data.spouseCurrentAddressSameAs
    ))
    if (explicitOption) return explicitOption

    const doNotKnow = isAffirmativeValue(firstValue(
      data.spouseAddressDoNotKnow,
      data.spouseCurrentAddressDoNotKnow,
      data.spouseAddressUnknown,
      data.spouseCurrentAddressUnknown
    ))
    if (doNotKnow) return 'DO NOT KNOW'

    const spouse = getVNAddress('spouseCurrentAddress', 'spouseCurrentAddress')
    if (!hasAddressValue(spouse)) return ''

    const { home, mail } = resolveHomeMailingAddresses()
    const spouseKey = normalizeAddressCompare(spouse)
    if (hasAddressValue(home) && spouseKey === normalizeAddressCompare(home)) {
      return 'SAME AS HOME ADDRESS'
    }
    if (hasAddressValue(mail) && spouseKey === normalizeAddressCompare(mail)) {
      return 'SAME AS MAILING ADDRESS'
    }

    const usContact = getUSAddress('usContactAddress', 'usContactAddress')
    if (hasAddressValue(usContact) && spouseKey === normalizeAddressCompare(usContact)) {
      return 'SAME AS U.S. CONTACT ADDRESS'
    }

    return 'OTHER'
  }

  // Parse Education list
  const normalizeDateValue = (value) => {
    if (value === undefined || value === null) return ''

    if (typeof value === 'object') {
      if (Array.isArray(value)) return firstValue(...value.map(normalizeDateValue))

      const directValue = firstValue(
        value.value,
        value.date,
        value.fullDate,
        value.full_date,
        value.formatted,
        value.text
      )
      if (directValue) return normalizeDateValue(directValue)

      const day = firstValue(value.day, value.d, value.dateDay, value.date_day)
      const month = firstValue(value.month, value.m, value.dateMonth, value.date_month)
      const year = firstValue(value.year, value.y, value.dateYear, value.date_year)
      if (day && month && year) {
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
      }
      if (month && year) {
        return `${String(month).padStart(2, '0')}/${year}`
      }
      return ''
    }

    return String(value || '').trim()
  }

  const getSchoolDateValue = (school = {}, type = 'from') => {
    if (!school) return ''

    const values = type === 'from'
      ? [
          school.dateFrom,
          school.date_from,
          school.attendanceFrom,
          school.attendance_from,
          school.fromDate,
          school.from_date,
          school.startDate,
          school.start_date,
          school.educationStartDate,
          school.schoolStartDate,
          school.dateAttendanceFrom,
          school.date_of_attendance_from
        ]
      : [
          school.dateTo,
          school.date_to,
          school.attendanceTo,
          school.attendance_to,
          school.toDate,
          school.to_date,
          school.endDate,
          school.end_date,
          school.educationEndDate,
          school.schoolEndDate,
          school.dateAttendanceTo,
          school.date_of_attendance_to
        ]

    const direct = firstValue(...values.map(normalizeDateValue))
    if (direct) return direct

    const prefix = type === 'from' ? 'dateFrom' : 'dateTo'
    const altPrefix = type === 'from' ? 'startDate' : 'endDate'
    const day = firstValue(
      school[`${prefix}Day`],
      school[`${prefix}_day`],
      school[`${altPrefix}Day`],
      school[`${altPrefix}_day`]
    )
    const month = firstValue(
      school[`${prefix}Month`],
      school[`${prefix}_month`],
      school[`${altPrefix}Month`],
      school[`${altPrefix}_month`]
    )
    const year = firstValue(
      school[`${prefix}Year`],
      school[`${prefix}_year`],
      school[`${altPrefix}Year`],
      school[`${altPrefix}_year`]
    )

    return normalizeDateValue({ day, month, year })
  }

  const normalizeSchoolRecord = (school = {}) => ({
    name: firstValue(
      school.name,
      school.schoolName,
      school.institutionName,
      school.nameOfInstitution
    ),
    address: firstValue(
      school.address,
      school.fullAddress,
      school.addressFull,
      school.schoolAddress,
      school.institutionAddress
    ),
    street: firstValue(
      school.street,
      school.addressStreet,
      school.addressLine1,
      school.line1,
      school.streetAddress,
      school.schoolAddressStreet,
      school.institutionAddressStreet
    ),
    line2: firstValue(
      school.line2,
      school.street2,
      school.addressLine2,
      school.address2,
      school.schoolAddressLine2,
      school.institutionAddressLine2
    ),
    ward: firstValue(school.ward, school.phuong, school.xa, school.commune),
    district: firstValue(school.district, school.quan, school.huyen),
    city: firstValue(
      school.city,
      school.addressCity,
      school.schoolAddressCity,
      school.institutionAddressCity
    ),
    province: firstValue(
      school.province,
      school.state,
      school.addressProvince,
      school.addressState,
      school.schoolAddressProvince,
      school.institutionAddressProvince
    ),
    zip: firstValue(
      school.zip,
      school.zipCode,
      school.postalCode,
      school.postalZone,
      school.schoolZipCode,
      school.institutionZipCode
    ),
    country: firstValue(
      school.country,
      school.countryRegion,
      school.addressCountry,
      school.schoolAddressCountry,
      school.institutionAddressCountry
    ),
    course: firstValue(school.course, school.courseOfStudy, school.major),
    dateFrom: getSchoolDateValue(school, 'from'),
    dateTo: getSchoolDateValue(school, 'to')
  })

  const getSchoolAddress = (school = {}) => splitAddr(school.address || school.fullAddress || '', school)

  const parseSchoolListValue = (value) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    if (typeof value === 'object') return [value]

    const text = String(value || '').trim()
    if (!text) return []

    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch (e) {
        console.warn('[WordPaper] Cannot parse schoolList JSON:', e)
      }
    }

    return []
  }

  let parsedSchools = []
  const rawSchoolList = data.schoolList
  const schoolListValue = parseSchoolListValue(rawSchoolList)
  if (schoolListValue.length > 0) {
    parsedSchools = schoolListValue.map(normalizeSchoolRecord)
  } else if (typeof rawSchoolList === 'string' && rawSchoolList.trim()) {
    // Legacy string format fallback
    const schoolStr = rawSchoolList
    const schoolBlocks = schoolStr.split(/Tên\s*trường\s*:/i).filter(p => p.trim())
    
    for (let block of schoolBlocks) {
      const s_school = { name: '', address: '', country: '', course: '', dateFrom: '', dateTo: '' }
      
      const nameMatch = block.match(/^(.*?)(?=Địa\s*chỉ\s*:|$)/is)
      const addrMatch = block.match(/Địa\s*chỉ\s*:(.*?)(?=Quốc\s*gia\s*:|$)/is)
      const qgMatch = block.match(/Quốc\s*gia\s*:(.*?)(?=Ngành\s*học\s*:|$)/is)
      const nhMatch = block.match(/Ngành\s*học\s*:(.*?)(?=Thời\s*gian\s*(?:học\s*)?từ\s*:|$)/is)
      const tgMatch = block.match(/Thời\s*gian\s*(?:học\s*)?từ\s*:(.*?)(?=Đến\s*:|$)/is)
      const denMatch = block.match(/Đến\s*:(.*)$/is)
      
      if (nameMatch) s_school.name = nameMatch[1].replace(/<[^>]*>/g, '').trim()
      if (addrMatch) s_school.address = addrMatch[1].replace(/<[^>]*>/g, '').trim()
      if (qgMatch) s_school.country = qgMatch[1].replace(/<[^>]*>/g, '').trim()
      if (nhMatch) s_school.course = nhMatch[1].replace(/<[^>]*>/g, '').trim()
      if (tgMatch) s_school.dateFrom = tgMatch[1].replace(/<[^>]*>/g, '').trim()
      if (denMatch) s_school.dateTo = denMatch[1].replace(/<[^>]*>/g, '').trim()
      
      parsedSchools.push(s_school)
    }
  }
  const firstSchool = parsedSchools[0] || {}
  const firstSchoolAddr = getSchoolAddress(firstSchool)

  // Parse Employments
  const allJobs = []
  for (let i = 1; i <= 5; i++) {
    const sfx = '0' + i
    if (data['companyName' + sfx] || data['occupationTitle' + sfx]) {
      allJobs.push({
        title: data['occupationTitle' + sfx],
        name: data['companyName' + sfx],
        address: data['companyAddress' + sfx],
        street: data['companyAddress' + sfx + 'Street'],
        line2: data['companyAddress' + sfx + 'Line2'] || data['companyAddress' + sfx + 'Street2'],
        city: data['companyAddress' + sfx + 'City'],
        province: data['companyAddress' + sfx + 'Province'],
        country: data['companyAddress' + sfx + 'Country'],
        zip: data['companyZipCode' + sfx] || data['companyAddress' + sfx + 'ZipCode'] || data['companyAddress' + sfx + 'PostalCode'],
        phone: data['companyPhone' + sfx],
        startDate: data['employmentStartDate' + sfx],
        endDate: data['employmentEndDate' + sfx],
        desc: data['jobDescription' + sfx],
        managerName: data['managerName' + sfx]
      })
    }
  }

  // Parse new dynamic previous jobs table
  if (data.previousJobsList && Array.isArray(data.previousJobsList)) {
    data.previousJobsList.forEach(job => {
      if (job.companyName || job.occupationTitle) {
        allJobs.push({
          title: job.occupationTitle,
          name: job.companyName,
          address: job.companyAddress,
          street: job.companyAddressStreet,
          line2: job.companyAddressLine2 || job.companyAddressStreet2,
          city: job.companyAddressCity,
          province: job.companyAddressProvince,
          country: job.companyAddressCountry,
          zip: job.companyZipCode || job.companyAddressZipCode || job.companyAddressPostalCode,
          phone: job.companyPhone,
          startDate: job.employmentStartDate,
          endDate: job.employmentEndDate,
          desc: job.jobDescription,
          managerName: job.managerName
        })
      }
    })
  }
  const currentJob = allJobs.find(j => !j.endDate) || {}
  const parsedPastJobs = allJobs.filter(j => !!j.endDate)

  // Parse Children
  const parsedChildren = []

  const normalizeChildYesNo = (value) => {
    const raw = stripHtml(value).trim()
    if (!raw) return ''
    return isAffirmativeValue(raw) ? 'YES' : 'NO'
  }

  const pushChildRecord = (child = {}) => {
    const fullName = firstValue(
      child.childFullName,
      child.fullName,
      child.full_name,
      child.childName,
      child.name
    )
    const nameParts = splitPersonName(fullName)

    const record = {
      surname: firstValue(child.childSurname, child.surname, child.lastName, child.last_name, nameParts.surname),
      givenName: firstValue(child.childGivenName, child.givenName, child.given_name, child.firstName, child.first_name, nameParts.givenName),
      birthDate: firstValue(child.childBirthDate, child.birthDate, child.dateOfBirth, child.dob),
      city: firstValue(child.childBirthCity, child.childCity, child.city, child.birthCity),
      state: firstValue(child.childBirthProvince, child.childProvince, child.state, child.province, child.birthProvince),
      country: firstValue(child.childBirthCountry, child.childCountry, child.country, child.nationality, child.birthCountry),
      travel: normalizeChildYesNo(firstValue(child.childTravelWithYou, child.childTravelWith, child.childTravelWithUS, child.travel, child.travelWithYou)),
      join: normalizeChildYesNo(firstValue(child.childJoinLater, child.childJoinLaterUS, child.join, child.joinLater))
    }

    if (record.surname || record.givenName || record.birthDate || record.city || record.state || record.country || record.travel || record.join) {
      parsedChildren.push(record)
    }
  }

  if (Array.isArray(data.k1ChildrenList)) {
    data.k1ChildrenList.forEach(pushChildRecord)
  }

  // Fallback dữ liệu cũ nếu không có bảng k1ChildrenList
  for (let i = 1; i <= 10; i++) {
    const sfx = i < 10 ? '0' + i : '' + i
    if (data['childSurname' + sfx] || data['childGivenName' + sfx] || data['childName' + sfx]) {
      pushChildRecord({
        childSurname: data['childSurname' + sfx],
        childGivenName: data['childGivenName' + sfx],
        childName: data['childName' + sfx],
        childBirthDate: data['childBirthDate' + sfx],
        childBirthCity: data['childCity' + sfx],
        childBirthProvince: data['childState' + sfx] || data['childProvince' + sfx],
        childBirthCountry: data['childCountry' + sfx] || data['childNationality' + sfx],
        childTravelWithYou: data['childTravel' + sfx] || data['childTravelWith' + sfx] || data['childTravelWithUS' + sfx],
        childJoinLater: data['childJoin' + sfx] || data['childJoinLater' + sfx] || data['childJoinLaterUS' + sfx]
      })
    }
  }

  const parsedRelativesUS = []
  let shouldParseChildrenFromRels = parsedChildren.length === 0;

  const relativesUSRaw = firstValue(
    data.relativesInUSList,
    data.otherRelativesInUSList,
    data.immediateRelativesInUSList,
    data.otherRelativeInUSList
  )

  if (relativesUSRaw) {
    const lines = String(relativesUSRaw).split(/[\r\n]+/).filter(line => line.trim())
    for (const line of lines) {
      const parts = line.split('-').map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        let fullName = parts[0]
        let relationStr = parts[1]
        let statusStr = parts.length > 2 ? parts.slice(2).join('-').toUpperCase() : 'OTHER'
        
        let status = statusStr
        if (status.includes('CÔNG DÂN') || status.includes('CITIZEN')) status = 'U.S. CITIZEN'
        else if (status.includes('THƯỜNG TRÚ') || status.includes('LPR') || status.includes('THẺ XANH') || status.includes('ĐỊNH CƯ')) status = 'U.S. LEGAL PERMANENT RESIDENT (LPR)'
        else if (status.includes('DU HỌC') || status.includes('STUDENT') || status.includes('F1') || status.includes('J1') || status.includes('NONIMMIGRANT') || status.includes('VISA') || status.includes('LAO ĐỘNG') || status.includes('LÀM VIỆC')) status = 'NONIMMIGRANT'

        let relation = relationStr.toUpperCase()
        if (relation === 'CON') relation = 'CHILD'
        else if (relation === 'ANH' || relation === 'CHỊ' || relation === 'EM' || relation === 'ANH TRAI' || relation === 'EM GÁI' || relation === 'CHỊ GÁI' || relation === 'EM TRAI' || relation.includes('ANH') || relation.includes('CHỊ') || relation.includes('EM')) relation = 'SIBLING'
        else if (relation === 'VỢ' || relation === 'CHỒNG' || relation === 'SPOUSE') relation = 'SPOUSE'

        const commaIndex = fullName.indexOf(',')
        let surname = ''
        let given = fullName
        if (commaIndex !== -1) {
          surname = fullName.substring(0, commaIndex).trim()
          given = fullName.substring(commaIndex + 1).trim()
        } else {
          const words = fullName.split(' ')
          surname = words[0]
          given = words.slice(1).join(' ')
        }
        
        parsedRelativesUS.push({ surname, given, relation, status })
        
        if (shouldParseChildrenFromRels && relationStr.toUpperCase() === 'CON') {
          parsedChildren.push({
            surname: surname || '',
            givenName: given || '',
            birthDate: '', city: '', state: '', country: '', travel: '', join: ''
          })
        }
      }
    }
  }

  // Parse Companions
  const parsedCompanions = parseCompanionDetails(data.companionDetails)
  const hasCompanions = isAffirmativeValue(data.companionsToUS) || parsedCompanions.length > 0

  // Parse Former Spouse Name to remove prefixes like "SECOND MARRIAGE"
  const cleanExSpouseName = String(data.exSpouseName || '').replace(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s*MARRIAGE\s*/i, '').trim()
  const exSpouseSurname = cleanExSpouseName.includes(',') ? cleanExSpouseName.split(',')[0].trim() : cleanExSpouseName.split(' ')[0]
  const exSpouseGiven = cleanExSpouseName.includes(',') ? cleanExSpouseName.split(',').slice(1).join(',').trim() : cleanExSpouseName.split(' ').slice(1).join(' ')

  const isUSLocationValue = (value) => {
    const normalized = normalizeText(stripHtml(value))
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!normalized) return false

    return /(^| )(US|USA|U S|UNITED STATES|AMERICA|HOA KY|MY)( |$)/.test(normalized)
  }

  const isParentInUS = (prefix) => {
    const valuesToCheck = [
      data[`${prefix}InUS`],
      data[`${prefix}IsInUS`],
      data[`${prefix}LivesInUS`],
      data[`${prefix}LivingInUS`],
      data[`${prefix}Location`],
      data[`${prefix}CurrentLocation`],
      data[`${prefix}Status`],
      data[`${prefix}CurrentAddressCountry`],
      data[`${prefix}CurrentAddress`]
    ]

    return valuesToCheck.some(isUSLocationValue)
  }

  const getParentUSAddress = (prefix, inUS) => {
    const emptyAddress = { street: '', line2: '', city: '', state: '', zip: '', country: '' }
    if (!inUS) return emptyAddress

    const rawAddress = data[`${prefix}CurrentAddress`] || ''
    const parsed = splitAddr(rawAddress, data, `${prefix}CurrentAddress`, true)

    let state = firstValue(
      data[`${prefix}CurrentAddressState`],
      data[`${prefix}CurrentAddressProvince`],
      parsed.province
    )
    let zip = firstValue(
      data[`${prefix}CurrentAddressZipCode`],
      data[`${prefix}CurrentAddressZip`],
      data[`${prefix}CurrentAddressPostalCode`],
      parsed.zip
    )

    const stateZipMatch = String(state || '').match(/^([A-Z]{2}|[A-Za-z\s]+)\s+(\d{5}(?:-\d{4})?)$/)
    if (stateZipMatch) {
      state = stateZipMatch[1].trim()
      if (!zip) zip = stateZipMatch[2].trim()
    }

    return {
      street: firstValue(
        data[`${prefix}CurrentAddressStreet`],
        data[`${prefix}CurrentAddressLine1`],
        data[`${prefix}CurrentAddressAddressLine1`],
        parsed.street
      ),
      line2: firstValue(
        data[`${prefix}CurrentAddressLine2`],
        data[`${prefix}CurrentAddressStreet2`],
        data[`${prefix}CurrentAddressAddressLine2`],
        parsed.line2
      ),
      city: firstValue(data[`${prefix}CurrentAddressCity`], parsed.city),
      state,
      zip,
      country: 'USA'
    }
  }

  const fatherInUS = isParentInUS('father')
  const motherInUS = isParentInUS('mother')
  const cleanFatherAddr = getParentUSAddress('father', fatherInUS)
  const cleanMotherAddr = getParentUSAddress('mother', motherInUS)
  const legacyFatherName = i130aAppendixSplitName(data.fatherFullName, data.fatherName, data.thongTinCha, data.father)
  const legacyMotherName = i130aAppendixSplitName(data.motherFullName, data.motherName, data.thongTinMe, data.mother)
  const usRefusalExplain = [
    data.visaUSRejectedDetails,
    data.entryDeniedUSDetails,
    data.withdrawnApplicationUSDetails,
    data.usAdmissionRefusalDetails
  ].filter(Boolean).join('; ')
  const hasUSRefusal = isAffirmativeValue(data.visaUSRejected) ||
                       isAffirmativeValue(data.entryDeniedUS) ||
                       isAffirmativeValue(data.withdrawnApplicationUS) ||
                       isAffirmativeValue(data.usAdmissionRefusal) ||
                       !!usRefusalExplain
  const immigrantPetitionExplain = data.previousSponsorshipDetails ||
                                   data.sponsorResult ||
                                   data.sponsorName ||
                                   data.sponsorCaseNumber ||
                                   ''
  const hasImmigrantPetition = isAffirmativeValue(data.previousSponsorship) ||
                               isAffirmativeValue(immigrantPetitionExplain) ||
                               !!immigrantPetitionExplain
  const socialMediaAccounts = getSocialMediaAccounts(
    data.socialMediaLinks,
    data.socialMediaIdentifier,
    data.socialMediaLink,
    data.socialMedia
  )
  const firstSocialMediaAccount = socialMediaAccounts[0] || { provider: '', identifier: '' }
  const socialMediaIdentifier = firstSocialMediaAccount.identifier || getAllSocialMediaValue(
    data.socialMediaIdentifier,
    data.socialMediaLinks,
    data.socialMediaLink,
    data.socialMedia
  )
  const socialMediaProvider = firstSocialMediaAccount.provider || getSocialMediaProvider(
    socialMediaIdentifier,
    data.socialMediaProvider,
    data.socialMediaPlatform,
    data.socialMediaProviderPlatform
  )

  // ========================================================
  // MAPPINGS: label trong HTML template → data field từ DB
  // Dùng startsWith để match vì label có thể dài hơn
  // ========================================================
  
  // Debugging: Log data to see what the K1 field looks like
  console.log('[WordPaper] Customer Data:', data);
  
  const visaClassValue = String(data.visaClass || data.purposeOfTrip || data.visaPurpose || data.visaType || data.purpose || '').toUpperCase();
  let isK1 = props.formType === 'k1-visa' || visaClassValue.includes('K1') || visaClassValue.includes('K-1') || visaClassValue.includes('HÔN PHU') || visaClassValue.includes('HON PHU') || visaClassValue.includes('FIANC');
  
  if (!isK1) {
    const dataStr = JSON.stringify(data).toUpperCase();
    if (dataStr.includes('"K1"') || dataStr.includes('"K-1"') || dataStr.includes('HÔN PHU') || dataStr.includes('HON PHU')) {
      isK1 = true;
    }
  }
  
  // I-130A module keeps this legacy helper unchanged but does not share runtime state with DS-160.
  console.log('[I130AWordPaper] isK1 =', isK1, 'formType =', props.formType);

  const splitPersonName = (name) => {
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ')
    if (!cleanName) return { surname: '', given: '' }
    if (cleanName.includes(',')) {
      const [surname, ...givenParts] = cleanName.split(',')
      return {
        surname: String(surname || '').trim(),
        given: givenParts.join(',').trim()
      }
    }
    const parts = cleanName.split(' ')
    return {
      surname: parts[0] || '',
      given: parts.slice(1).join(' ')
    }
  }

  const k1FianceFullName = firstValue(
    data.usContactFullName,
    data.usContactName,
    data.usContactPersonName,
    data.petitionerName,
    data.petitionerFullName,
    data.sponsorName,
    data.sponsorFullName
  )
  const k1FianceNameParts = splitPersonName(k1FianceFullName)
  const buildPartialDateValue = (day, month, year) => {
    const y = firstValue(year)
    const m = firstValue(month)
    const d = firstValue(day)
    if (d && m && y) return `${d}/${m}/${y}`
    if (m && y) return `${m}/${y}`
    if (y) return String(y)
    return ''
  }
  const k1FianceBirthDateFromParts = firstValue(
    buildPartialDateValue(data.dateOfBirthDay, data.dateOfBirthMonth, data.dateOfBirthYear),
    buildPartialDateValue(data.usContactBirthDay, data.usContactBirthMonth, data.usContactBirthYear),
    buildPartialDateValue(data.usContactDateOfBirthDay, data.usContactDateOfBirthMonth, data.usContactDateOfBirthYear),
    buildPartialDateValue(data.petitionerBirthDay, data.petitionerBirthMonth, data.petitionerBirthYear),
    buildPartialDateValue(data.petitionerDateOfBirthDay, data.petitionerDateOfBirthMonth, data.petitionerDateOfBirthYear),
    buildPartialDateValue(data.sponsorBirthDay, data.sponsorBirthMonth, data.sponsorBirthYear)
  )
  const k1FianceBirthDate = pickDateValue(
    data.usContactBirthDate,
    data.usContactDateOfBirth,
    data.usContactDOB,
    data.usContactDob,
    data.usContactBirth,
    data.dateOfBirth,
    data.birthDateOfUsContact,
    data.contactDateOfBirth,
    data.contactBirthDate,
    data.petitionerBirthDate,
    data.petitionerDateOfBirth,
    data.petitionerDOB,
    data.petitionerDob,
    data.sponsorBirthDate,
    data.sponsorDateOfBirth,
    data.sponsorDOB,
    data.sponsorDob,
    k1FianceBirthDateFromParts,
    data['Ngày sinh người bảo lãnh:'],
    data['Ngày sinh người bảo lãnh:'],
    data['Ngày sinh:'],
    data['Ngày sinh:']
  )
  const rawK1FianceAddress = getUSAddress('usContactAddress', 'usContactAddress')
  const k1FianceAddress = {
    ...rawK1FianceAddress,
    street: firstValue(
      data.usContactAddressStreet,
      data.usContactStreet,
      data.petitionerAddressStreet,
      data.sponsorAddressStreet,
      rawK1FianceAddress.street
    ),
    line2: firstValue(
      data.usContactAddressLine2,
      data.usContactStreet2,
      data.petitionerAddressLine2,
      data.sponsorAddressLine2,
      rawK1FianceAddress.line2
    ),
    city: firstValue(
      data.usContactAddressCity,
      data.usContactCity,
      data.petitionerAddressCity,
      data.sponsorAddressCity,
      rawK1FianceAddress.city
    ),
    province: firstValue(
      data.usContactAddressState,
      data.usContactState,
      data.usContactAddressProvince,
      data.petitionerAddressState,
      data.sponsorAddressState,
      rawK1FianceAddress.province
    ),
    zip: firstValue(
      data.usContactAddressZipCode,
      data.usContactZipCode,
      data.usContactZip,
      data.usContactPostalCode,
      data.usContactAddressPostalCode,
      data.petitionerAddressZipCode,
      data.petitionerZipCode,
      data.petitionerZip,
      data.sponsorAddressZipCode,
      data.sponsorZipCode,
      data.sponsorZip,
      data['Mã bưu chính (ZIP Code):'],
      data['Ma buu chinh (ZIP Code):'],
      rawK1FianceAddress.zip
    ),
    country: firstValue(
      data.usContactAddressCountry,
      data.usContactCountry,
      data.petitionerAddressCountry,
      data.sponsorAddressCountry,
      rawK1FianceAddress.country
    )
  }
  const k1FianceAddressValue = firstValue(
    data.usContactAddress,
    data.usContactFullAddress,
    data.usContactAddressFull,
    data.usContactAddressStreet,
    k1FianceAddress.street
  )
  const k1FianceBirthCity = firstValue(
    data.usContactBirthCity,
    data.usContactCityOfBirth,
    data.petitionerBirthCity,
    data.petitionerCityOfBirth,
    data.sponsorBirthCity,
    data.sponsorCityOfBirth
  )
  const k1FianceBirthCountry = firstValue(
    data.usContactBirthCountry,
    data.usContactCountryOfBirth,
    data.petitionerBirthCountry,
    data.petitionerCountryOfBirth,
    data.sponsorBirthCountry,
    data.sponsorCountryOfBirth,
    k1FianceFullName ? 'USA' : ''
  )

  const isI130A = true // Component riêng cho I-130A: luôn bật mapping/dynamic I-130A, không phụ thuộc formType truyền vào
  const i130aMappings = isI130A ? buildI130AMappings(data, {
    firstValue,
    splitAddr,
    toUpperNoAccent,
    isAffirmativeValue
  }) : null

  const mappings = i130aMappings || [
    ...(isK1 ? [
      { label: 'Visa class', val: K1_VISA_CLASS },
      { label: 'Specify', val: K1_SPECIFY_FIANCE, force: true }
    ] : []),
    // ── SECTION 1: THÔNG TIN CÁ NHÂN ──
    { label: 'Surnames', val: toUpperNoAccent(String(data.fullName || '').split(' ')[0]) },
    { label: 'Given Names', val: toUpperNoAccent(String(data.fullName || '').split(' ').slice(1).join(' ')) },
    { 
      label: 'Full Name in Native Language', 
      val: data.fullName ? String(data.fullName).trim().toUpperCase() : '' 
    },
    { 
      label: 'Have ever used other names?', 
      val: data.otherName && String(data.otherName).trim().length > 0 ? 'YES' : 'NO' 
    },
    { 
      label: 'Other Surnames used', 
      val: data.otherName && String(data.otherName).trim().length > 0 ? toUpperNoAccent(String(data.otherName).trim().split(' ')[0]) : '', 
      after: 'Have ever used other names?' 
    },
    { 
      label: 'Other Given Names used', 
      val: data.otherName && String(data.otherName).trim().length > 0 ? toUpperNoAccent(String(data.otherName).trim().split(' ').slice(1).join(' ')) : '', 
      after: 'Have ever used other names?' 
    },
    { 
      label: 'Do you have a telecode that represents your name?', 
      val: 'NO' 
    },
    { 
      label: 'Sex', 
      val: data.gender === 'Nam' ? 'MALE' : (data.gender === 'Nữ' ? 'FEMALE' : data.gender) 
    },
    { 
      label: 'Current Marital Status', 
      val: (() => {
        const status = toUpperNoAccent(data.maritalStatus);
        if (status.includes('DOC THAN')) return 'SINGLE';
        if (status.includes('DA KET HON') || status.includes('KET HON LAN DAU') || status.includes('KET HON')) return 'MARRIED';
        if (status.includes('LY HON') || status.includes('LY DI')) return 'DIVORCED';
        if (status.includes('GOA')) return 'WIDOWED';
        if (status.includes('LY THAN')) return 'LEGALLY SEPARATED';
        return data.maritalStatus;
      })()
    },
    { label: 'Date of Birth', val: data.birthDate, handler: fillDateCells },
    ...(() => {
      // Ưu tiên 3 field nơi sinh đã tách trong form ICAVIET.
      // Không lấy currentAddressCityVN/currentAddressProvinceVN để tránh nhầm địa chỉ hiện tại thành nơi sinh.
      const explicitCity = firstValue(
        data.placeBirthCity,
        data.birthCity,
        data.cityOfBirth,
        data.placeOfBirthCity,
        data.birthPlaceCity
      )
      const explicitProvince = firstValue(
        data.placeBirthProvince,
        data.birthProvince,
        data.stateProvinceOfBirth,
        data.placeOfBirthProvince,
        data.birthPlaceProvince
      )
      const explicitCountry = firstValue(
        data.placeBirthCountry,
        data.birthCountry,
        data.countryOfBirth,
        data.placeOfBirthCountry,
        data.birthPlaceCountry
      )

      const normalizeCountryName = (value) => {
        const rawCountry = String(value || '').trim()
        const n = rawCountry
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/gi, 'd')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
        if (!n) return ''
        if (n === 'VN' || n === 'VIETNAM') return 'VIETNAM'
        if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA'].includes(n)) return 'USA'
        return rawCountry
      }

      const isCountryKeyword = (value) => !!normalizeCountryName(value)

      let city = explicitCity
      let province = explicitProvince
      let country = normalizeCountryName(explicitCountry) || ''

      // Fallback cho dữ liệu cũ còn lưu chung trong 1 field.
      // Format ưu tiên: Huyện/Thành phố, Tỉnh, Quốc gia.
      if (!city && !province && !country) {
        const raw = firstValue(data.placeBirth, data.birthPlace, data.placeOfBirth)
        const parts = String(raw || '').split(',').map(part => part.trim()).filter(Boolean)
        if (parts.length === 1) {
          city = parts[0]
        } else if (parts.length >= 2) {
          const maybeCountry = parts[parts.length - 1]
          const hasCountryAtEnd = isCountryKeyword(maybeCountry)
          const locationParts = hasCountryAtEnd ? parts.slice(0, -1) : parts
          country = hasCountryAtEnd ? normalizeCountryName(maybeCountry) : ''
          city = locationParts[0] || ''
          province = locationParts[1] || locationParts[0] || ''
        }
      }

      country = normalizeCountryName(country) || (city || province ? 'VIETNAM' : '')

      return [
        { label: 'City of Birth', val: toUpperNoAccent(city) },
        { label: 'State/Province of Birth', val: toUpperNoAccent(province) },
        { label: 'Country/Region of Birth', val: toUpperNoAccent(country) || 'VIETNAM' }
      ]
    })(),
    { label: 'Country/Region of Origin', val: data.nationality || 'VIETNAM' },
    { label: 'Do you hold or have you held any nationality', val: data.otherNationality ? (String(data.otherNationality).toLowerCase().startsWith('c') ? 'YES' : 'NO') : 'NO' },
    { label: 'Other Country/Region of Origin', val: data.otherNationality?.replace(/^Có[,\s-]+/i, '').trim() || '', after: 'Do you hold or have you held any nationality' },
    { label: 'Do you hold a passport from the country/region of origin', val: data.otherPassportNumber ? 'YES' : 'NO' },
    { label: 'Passport Number', val: data.otherPassportNumber || '', after: 'Do you hold a passport from the country/region of origin' },
    { label: 'Are you a permanent resident of a country', val: 'NO' }, // Thường khách VN chọn NO
    { label: 'National Identification Number', val: data.idNumber },

    // ── PASSPORT ──
    ...(() => {
      const parts = (data.passportIssuePlaceVN || '').split(',').map(p => p.trim()).filter(Boolean)
      const explicitCountry = firstValue(
        data.passportIssueCountryVN,
        data.passportIssueCountry,
        data.passportIssuingCountry,
        data.passportCountryOfIssuance,
        data.passportAuthorityCountry
      )
      const isCountryPart = (part) => {
        const normalized = normalizeText(part).replace(/[^A-Z]/g, '')
        return [
          'VIETNAM', 'VN', 'UNITEDSTATES', 'USA', 'US',
          'CANADA', 'AUSTRALIA', 'JAPAN', 'KOREA', 'SOUTHKOREA',
          'FRANCE', 'GERMANY', 'CHINA', 'TAIWAN', 'SINGAPORE'
        ].includes(normalized)
      }
      const normalizeCountry = (value) => {
        const normalized = normalizeText(value).replace(/[^A-Z]/g, '')
        if (!normalized) return ''
        if (normalized === 'VN' || normalized === 'VIETNAM') return 'VIETNAM'
        if (normalized === 'US' || normalized === 'USA' || normalized === 'UNITEDSTATES') return 'USA'
        return value
      }
      let city = '', province = '', country = normalizeCountry(explicitCountry) || 'VIETNAM'
      const placeParts = [...parts]
      
      if (!explicitCountry) {
        const countryIndex = placeParts.findIndex(isCountryPart)
        if (countryIndex !== -1) {
          country = normalizeCountry(placeParts[countryIndex]) || country
          placeParts.splice(countryIndex, 1)
        }
      }

      if (placeParts.length >= 2) {
        city = placeParts[0]
        province = placeParts[1]
      } else if (placeParts.length === 1) {
        city = placeParts[0]
      }
      
      // Normalize common Vietnam inputs
      if (/^(vi[eệ]t\s*nam|vn)$/i.test(country)) country = 'VIETNAM'
      
      return [
        { label: 'Passport/Travel Document Number', val: data.passportNumberVN },
        { label: 'Issuance Date', val: data.passportIssueDateVN, handler: fillDateCells },
        { label: 'Expiration Date', val: data.passportExpiryDateVN, handler: fillDateCells },
        { label: 'Country/Authority that Issued Passport', val: country },
        { label: 'City of Issuance', val: city },
        { label: 'State/Province of Issuance', val: province },
        { label: 'Country of Issuance', val: country },
      ]
    })(),

    // ── LOST PASSPORT ──
    ...(() => {
      const isLost = String(data.lostPassport || '').toLowerCase().startsWith('c') ? 'YES' : 'NO'
      return [
        { label: 'Have you ever lost a passport or had one stolen?', val: isLost },
        { label: 'Passport/Travel Document Number', val: isLost === 'YES' ? (data.lostPassportNumberVN || 'UNKNOWN') : '', after: 'Have you ever lost a passport or had one stolen?' },
        { label: 'Country/Authority that Issued Passport/Travel', val: isLost === 'YES' ? (data.lostPassportCountry || 'VIETNAM') : '', after: 'Have you ever lost a passport or had one stolen?' }
      ]
    })(),

    // ── TRAVEL ──
    { label: 'Intended Date of Arrival', val: data.expectedDateToUS, handler: fillMonthYearCells },
    { label: 'Intended Length of Stay in U.S.', val: data.durationInUS, handler: fillDurationInUS },
    { label: 'Are there other person traveling with', val: hasCompanions ? 'YES' : 'NO' },
    
    // ── U.S. ADDRESS ──
    ...(() => {
      const usAddrFull = data.addressInUS || ''
      const usAddrObj = splitAddr(usAddrFull, data, 'addressInUS', true)
      let state = data.addressInUSState || ''
      let zip = data.addressInUSZipCode || ''
      
      if (usAddrFull && usAddrFull.includes(',')) {
        // Tách State & Zip nếu format là "IN 46818"
        const stateZipMatch = (usAddrObj.province || '').match(/^([a-zA-Z\s]+)\s+(\d+)$/)
        if (stateZipMatch) {
          state = stateZipMatch[1].trim()
          zip = stateZipMatch[2].trim()
        } else {
          state = usAddrObj.province || state
        }
        return [
          { label: 'Street Address (Line 1)', val: usAddrObj.street, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'City', val: usAddrObj.city, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'State', val: state, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'ZIP Code', val: zip || usAddrObj.zip, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' }
        ]
      } else {
        return [
          { label: 'Street Address (Line 1)', val: data.addressInUSStreet || data.addressInUS, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'City', val: data.addressInUSCity, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'State', val: data.addressInUSState, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' },
          { label: 'ZIP Code', val: data.addressInUSZipCode, after: 'THÔNG TIN ĐỊA CHỈ Ở BÊN MỸ' }
        ]
      }
    })(),

    { 
      label: 'Person/Entity Paying for Your Trip', 
      val: isK1
        ? getK1PayerDefaultValue(data)
        : data.tripSponsor === 'Bản thân' ? 'SELF' : 
          data.tripSponsor === 'Người khác' ? 'OTHER PERSON' : 
          data.tripSponsor === 'Công ty' ? 'COMPANY/ORGANIZATION' : data.tripSponsor 
    },
    { label: 'Surnames of Person Paying for Trip', val: data.sponsorDetails, after: 'Person/Entity Paying for Your Trip' },
    {
      label: 'Email Address',
      val: firstValue(
        data.usContactEmail,
        data.sponsorEmail,
        data.petitionerEmail,
        data.petitioner_email,
        data.nguoiBaoLanhEmail,
        data.emailNguoiBaoLanh,
        data.q21_email
      ),
      after: 'Person/Entity Paying for Your Trip'
    },

    // ── HOME ADDRESS ──
    ...(() => {
      const { home, mail, isSame } = resolveHomeMailingAddresses()

      return [
        { label: 'Street Address (Line 1)', val: home.street, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },
        { label: 'Street Address (Line 2)', val: home.line2, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },
        { label: 'City', val: home.city, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },
        { label: 'State/Province', val: home.province, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },
        { label: 'Postal Zone/ZIP Code', val: home.zip, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },
        { label: 'Country/Region', val: home.country, after: 'ĐỊA CHỈ Ở HIỆN TẠI' },

        // ── MAILING ADDRESS ──
        { label: 'Is your Mailing Address the same as your Home Address', val: isSame },
        { label: 'Street Address (Line 1)', val: mail.street, after: 'Is your Mailing Address the same as your Home Address' },
        { label: 'Street Address (Line 2)', val: mail.line2, after: 'Is your Mailing Address the same as your Home Address' },
        { label: 'City', val: mail.city, after: 'Is your Mailing Address the same as your Home Address' },
        { label: 'State/Province', val: mail.province, after: 'Is your Mailing Address the same as your Home Address' },
        { label: 'Postal Zone/ZIP Code', val: mail.zip, after: 'Is your Mailing Address the same as your Home Address' },
        { label: 'Country/Region', val: mail.country, after: 'Is your Mailing Address the same as your Home Address' },
      ]
    })(),

    // ── PHONE & EMAIL ──
    { label: 'Primary Phone Number', val: data.contactPrimary },
    { label: 'Secondary Phone Number', val: data.contactSecondary },
    { label: 'Email Address', val: data.email, after: 'Secondary Phone Number' },

    // ── SOCIAL MEDIA ──
    { label: 'Social Media Provider/Platform', val: socialMediaProvider, force: true },
    { label: 'Social Media Identifier', val: socialMediaIdentifier, force: true },
    { label: 'Other Social Media', val: socialMediaAccounts.length > 1 ? 'YES' : 'NO', force: true },

    // ── FATHER ──
    { label: "Father's Surnames", val: legacyFatherName.family },
    { label: "Father's Given Names", val: [legacyFatherName.middle, legacyFatherName.given].filter(Boolean).join(' ') },
    { label: "Date of Birth", val: pickDateValue(data.fatherBirthDate, data.fatherBirthYear, data.fatherYearOfBirth, data.fatherDobYear, data.fatherDOBYear, data.father_birth_year, data.father_birthDateYear, data['Sinh ngày cha:'], data['Sinh ngày cha:']), handler: fillDateCells, after: "Father's Surnames" },
    { label: "Is your father still living", val: data.fatherStatus === 'Còn sống' ? 'YES' : 'NO' },
    { label: "Year of Death", val: data.fatherDeathYear, after: "Is your father still living" },
    { label: "U.S. Street Address (Line 1)", val: cleanFatherAddr.street, after: "Is your father still living", force: true },
    { label: "U.S. Street Address (Line 2)", val: cleanFatherAddr.line2, after: "Is your father still living", force: true },
    { label: "City", val: cleanFatherAddr.city, after: "Is your father still living", force: true },
    { label: "State", val: cleanFatherAddr.state, after: "Is your father still living", force: true },
    { label: "ZIP Code", val: cleanFatherAddr.zip, after: "Is your father still living", force: true },
    { label: "Country/Region", val: cleanFatherAddr.country, after: "Is your father still living", force: true },
    { label: "Is your father in the US?", val: fatherInUS ? 'YES' : 'NO' },
    { label: "Father's Status", val: fatherInUS ? (data.fatherImmigrantStatus || '') : '' },

    // ── MOTHER ──
    { label: "Mother's Surnames", val: legacyMotherName.family },
    { label: "Mother's Given Names", val: [legacyMotherName.middle, legacyMotherName.given].filter(Boolean).join(' ') },
    { label: "Date of birth", val: pickDateValue(data.motherBirthDate, data.motherBirthYear, data.motherYearOfBirth, data.motherDobYear, data.motherDOBYear, data.mother_birth_year, data.mother_birthDateYear, data['Sinh ngày mẹ:'], data['Sinh ngày mẹ:']), handler: fillDateCells, after: "Mother's Surnames" },
    { label: "Is your mother still living", val: data.motherStatus === 'Còn sống' ? 'YES' : 'NO' },
    { label: "Year of Death", val: data.motherDeathYear, after: "Is your mother still living" },
    { label: "U.S. Street Address (Line 1)", val: cleanMotherAddr.street, after: "Is your mother still living", force: true },
    { label: "U.S. Street Address (Line 2)", val: cleanMotherAddr.line2, after: "Is your mother still living", force: true },
    { label: "City", val: cleanMotherAddr.city, after: "Is your mother still living", force: true },
    { label: "State", val: cleanMotherAddr.state, after: "Is your mother still living", force: true },
    { label: "ZIP Code", val: cleanMotherAddr.zip, after: "Is your mother still living", force: true },
    { label: "Country/Region", val: cleanMotherAddr.country, after: "Is your mother still living", force: true },
    { label: "Is your mother in the US?", val: motherInUS ? 'YES' : 'NO' },
    { label: "Mother’s Status", val: motherInUS ? (data.motherImmigrantStatus || '') : '' },

    // ── RELATIVES IN US ──
    ...(() => {
      const usRels = []
      const hasRels = isAffirmativeValue(data.relativesInUS) || isAffirmativeValue(data.otherRelativesInUS) || isAffirmativeValue(data.siblingsInUS) || parsedRelativesUS.length > 0;
      usRels.push({ label: 'Do you have any immediate relatives, not including', val: hasRels ? 'YES' : 'NO' })
      
      if (hasRels) {
        const rel = parsedRelativesUS.length > 0 ? parsedRelativesUS[0] : {}
        usRels.push(
          { label: 'Surnames', val: (rel.surname || '').toUpperCase(), after: 'Do you have any immediate relatives, not including' },
          { label: 'Given Names', val: (rel.given || '').toUpperCase(), after: 'Do you have any immediate relatives, not including' },
          { label: 'Relationship to You', val: (rel.relation || '').toUpperCase(), after: 'Do you have any immediate relatives, not including' },
          { label: 'Relative’s Status', val: (rel.status || '').toUpperCase(), after: 'Do you have any immediate relatives, not including' }
        )
      }
      return usRels
    })(),

    // ── SPOUSE / K1 FIANCE(E) ──
    {
      label: "Spouse/Fiancé/ Fiancée's Surnames",
      val: isK1
        ? toUpperNoAccent(k1FianceNameParts.surname)
        : String(data.spouseName || '').split(' ')[0]?.toUpperCase()
    },
    {
      label: "Spouse/Fiancé/ Fiancée's Given Names",
      val: isK1
        ? toUpperNoAccent(k1FianceNameParts.given)
        : String(data.spouseName || '').split(' ').slice(1).join(' ')?.toUpperCase()
    },
    {
      label: "Spouse/Fiancé/ Fiancée’s Date of birth",
      val: isK1 ? k1FianceBirthDate : data.spouseBirthDate,
      handler: fillDateCells
    },
    ...(() => {
      if (isK1) {
        return [
          { label: "Spouse/Fiancé/ Fiancée’s Country of Origin", val: k1FianceBirthCountry },
          { label: "Spouse/Fiancé/ Fiancée’s City of Birth", val: k1FianceBirthCity },
          { label: "Spouse/Fiancé/ Fiancée’s Country/Region of Birth", val: k1FianceBirthCountry },

          { label: "Spouse/Fiancé/ Fiancée's Address", val: k1FianceAddressValue },
          { label: "Street Address (Line 1)", val: k1FianceAddress.street || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
          { label: "Street Address (Line 2)", val: k1FianceAddress.line2 || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
          { label: "City", val: k1FianceAddress.city || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
          { label: "State/Province", val: k1FianceAddress.province || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
          { label: "Postal Zone/ZIP Code", val: k1FianceAddress.zip || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
          { label: "Country/Region", val: k1FianceAddress.country || (k1FianceAddress.street ? 'USA' : ' '), after: "Spouse/Fiancé/ Fiancée’s City of Birth" }
        ]
      }

      const birthPlaceObj = splitAddr(data.spouseBirthPlace, null, '', false)
      const city = birthPlaceObj.city || data.spouseBirthPlace || ''
      const country = birthPlaceObj.country || 'VIETNAM'
      
      const spouseAddrObj = splitAddr(data.spouseCurrentAddress, data, 'spouseCurrentAddress', false)
      let spouseAddrVal = data.spouseCurrentAddress || ''
      let street = data.spouseCurrentAddressStreet || spouseAddrObj.street || spouseAddrVal || ''
      let addrCity = data.spouseCurrentAddressCity || spouseAddrObj.city || ''
      let province = data.spouseCurrentAddressProvince || spouseAddrObj.province || ''
      let zip = data.spouseCurrentAddressZipCode || ''
      let addrCountry = data.spouseCurrentAddressCountry || spouseAddrObj.country || (street ? 'VIETNAM' : '')

      return [
        { label: "Spouse/Fiancé/ Fiancée’s Country of Origin", val: country },
        { label: "Spouse/Fiancé/ Fiancée’s City of Birth", val: city },
        { label: "Spouse/Fiancé/ Fiancée’s Country/Region of Birth", val: country },
        
        { label: "Spouse/Fiancé/ Fiancée's Address", val: spouseAddrVal },
        { label: "Street Address (Line 1)", val: street || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
        { label: "Street Address (Line 2)", val: data.spouseCurrentAddressLine2 || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
        { label: "City", val: addrCity || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
        { label: "State/Province", val: province || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
        { label: "Postal Zone/ZIP Code", val: zip || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" },
        { label: "Country/Region", val: addrCountry || ' ', after: "Spouse/Fiancé/ Fiancée’s City of Birth" }
      ]
    })(),
    
    // ── FORMER SPOUSE ──
    { label: 'Do you have any former spouse', val: (data.numberOfMarriages > 1 || data.exSpouseName) ? 'YES' : 'NO' },
    { label: 'Number of Former Spouses', val: data.numberOfMarriages ? (data.numberOfMarriages - 1).toString() : (data.exSpouseName ? '1' : '') },
    { label: 'Surname', val: exSpouseSurname?.toUpperCase(), after: 'Number of Former Spouses' },
    { label: 'Given name', val: exSpouseGiven?.toUpperCase(), after: 'Number of Former Spouses' },
    { label: 'Date of birth', val: data.exSpouseBirthDate, after: 'Number of Former Spouses' },
    { label: 'Country/Region of Origin(Nationality)', val: data.exSpouseBirthPlace, after: 'Number of Former Spouses' },
    { label: 'City', val: data.exSpouseBirthPlace, after: 'Number of Former Spouses' },
    { label: 'Date of Marriage', val: data.marriageDate, after: 'Number of Former Spouses' },
    { label: 'Date Marriage Ended', val: data.divorceDate, after: 'Number of Former Spouses' },
    { label: 'How the Marriage Ended', val: data.divorceReason, after: 'Number of Former Spouses' },
    { label: 'Country/Region Marriage was Terminated', val: (data.numberOfMarriages > 1 || data.exSpouseName) ? (data.marriagePlace || 'Việt Nam') : '', after: 'Number of Former Spouses' },

    // ── CHILDREN ──
    { label: 'Do you have any children?', val: (parsedChildren.length > 0 || isAffirmativeValue(data.hasChild)) ? 'YES' : (data.hasChild ? 'NO' : '') },
    { label: 'Number of children', val: data.numberOfChildren || (parsedChildren.length > 0 ? parsedChildren.length.toString() : '') },
    ...(parsedChildren.length > 0 ? [
      { label: 'Surname', val: parsedChildren[0].surname, after: 'Number of children' },
      { label: 'Given name', val: parsedChildren[0].givenName, after: 'Number of children' },
      { label: 'Date of birth', val: parsedChildren[0].birthDate, handler: fillDateCells, after: 'Number of children' },
      { label: 'City', val: parsedChildren[0].city, after: 'Number of children' },
      { label: 'State/Province', val: parsedChildren[0].state, after: 'Number of children' },
      { label: 'Country/Region', val: parsedChildren[0].country, after: 'Number of children' },
      { label: 'Is this child traveling to the US with you?', val: parsedChildren[0].travel, after: 'Number of children' },
      { label: 'Is this child traveling to the US at a later date', val: parsedChildren[0].join, after: 'Number of children' },
    ] : []),

    // ── EMPLOYMENT PROCESSING ──
    ...(() => {
      const cleanAddr = (addr) => addr ? addr.replace(/.*Địa chỉ:\s*/i, '').trim() : ''
      const getEmploymentAddress = (job = {}) => {
        const structured = splitAddr('', job)
        if (hasAddressValue(structured)) return structured
        return splitAddr(cleanAddr(job.address))
      }
      const comp1Addr = getEmploymentAddress(currentJob)
      
      let empMappings = [
        { label: 'Primary Occupation', val: currentJob.title || (allJobs.length > 0 ? 'NOT EMPLOYED' : '') },
        { label: 'Present Employer or School Name', val: currentJob.name },
        { label: 'Street Address (Line 1)', val: comp1Addr.street, after: 'Present Employer' },
        { label: 'Street Address (Line 2)', val: comp1Addr.line2 || ' ', after: 'Present Employer', force: true },
        { label: 'City', val: comp1Addr.city, after: 'Present Employer' },
        { label: 'State/Province', val: comp1Addr.province, after: 'Present Employer' },
        { label: 'Postal Zone/ZIP Code', val: currentJob.zip, after: 'Present Employer' },
        { label: 'Country/Region', val: comp1Addr.country, after: 'Present Employer' },
        { label: 'Start Date', val: currentJob.startDate, handler: fillDateCells },
        { label: 'Briefly describe your duties', val: currentJob.desc },
      ]

      if (parsedPastJobs.length > 0) {
        const p1 = parsedPastJobs[0]
        const comp2Addr = getEmploymentAddress(p1)
        empMappings.push(
          { label: 'Were you previously employed', val: 'YES' },
          { label: 'Employer Name', val: p1.name },
          { label: 'Employer Street Address (Line 1)', val: comp2Addr.street, after: 'Employer Name' },
          { label: 'Employer Street Address (Line 2)', val: comp2Addr.line2 || ' ', after: 'Employer Name', force: true },
          { label: 'City', val: comp2Addr.city, after: 'Employer Name' },
          { label: 'State/Province', val: comp2Addr.province, after: 'Employer Name' },
          { label: 'Country', val: comp2Addr.country, after: 'Employer Name' },
          { label: 'Telephone Number', val: p1.phone },
          { label: 'Job title', val: p1.title },
          { label: 'Supervisor’s Surname', val: p1.managerName?.split(' ')[0] },
          { label: 'Supervisor’s Given Names', val: p1.managerName?.split(' ').slice(1).join(' ') },
          { label: 'Employment Date From', val: p1.startDate, handler: fillDateCells },
          { label: 'Employment Date To', val: p1.endDate, handler: fillDateCells },
          { label: 'Briefly describe your duties', val: p1.desc, after: 'Employment Date To' }
        )
      } else {
        empMappings.push(
          { label: 'Were you previously employed', val: 'NO' }
        )
      }
          return empMappings
    })(),

    // ── COMPANIONS ──
    { label: 'Are there other person traveling with you', val: hasCompanions ? 'YES' : 'NO' },
    { label: 'Are you travelling as part of a group', val: 'NO' },
    { label: 'Surnames of Person Traveling With You', val: parsedCompanions.length > 0 ? parsedCompanions[0].surname : '' },
    { label: 'Given Names of Person Traveling With You', val: parsedCompanions.length > 0 ? parsedCompanions[0].givenName : '' },
    { label: 'Relationship with Person', val: parsedCompanions.length > 0 ? parsedCompanions[0].relationship : '' },

    // ── EDUCATION ──
    { label: 'Have you attended any educational institutions', val: parsedSchools.length > 0 ? 'YES' : 'NO' },
    { label: 'Name of Institution', val: firstSchool.name },
    { label: 'Street Address (Line 1)', val: firstSchoolAddr.street, after: 'Name of Institution' },
    { label: 'Street Address (Line 2)', val: firstSchoolAddr.line2 || ' ', after: 'Name of Institution', force: true },
    { label: 'City', val: firstSchoolAddr.city, after: 'Name of Institution' },
    { label: 'State/Province', val: firstSchoolAddr.province, after: 'Name of Institution' },
    { label: 'Postal Zone/ZIP Code', val: firstSchoolAddr.zip, after: 'Name of Institution' },
    { label: 'Country/region', val: firstValue(firstSchool.country, firstSchoolAddr.country), after: 'Name of Institution' },
    { label: 'Course of Study', val: firstSchool.course, after: 'Name of Institution' },
    { label: 'Date of Attendance From', val: firstSchool.dateFrom, handler: fillDateCells, after: 'Name of Institution' },
    { label: 'Date of Attendance To', val: firstSchool.dateTo, handler: fillDateCells, after: 'Name of Institution' },

    // ── LANGUAGE ──
    { label: 'Languages', val: data.otherLanguages },

    // ── CHARITY / ORGANIZATIONS ──
    { label: 'Have you belonged to, contributed to, or worked', val: String(data.charityInvolvement || '').toLowerCase() === 'có' ? 'YES' : 'NO' },
    { label: 'Explain', val: data.charityInvolvementExplain, after: 'Have you belonged to, contributed to, or worked' },

    // ── COUNTRIES VISITED ──
    { label: 'Have you traveled to any countries/regions', val: data.countriesVisited ? 'YES' : 'NO' },
    { label: 'Country/Region', val: data.countriesVisited, after: 'Have you traveled to any countries/regions' },
    { label: 'Do you belong to a clan or tribe', val: 'NO' }, // Thường VN là NO

    // ── PREVIOUS US TRAVEL ──
    { label: 'Have you ever been in the U.S', val: data.visitedUS === 'Đã từng' ? 'YES' : 'NO' },
    { label: 'Bạn đã từng đến Mỹ chưa', val: data.visitedUS === 'Đã từng' ? 'YES' : 'NO' },
    { label: 'Date Arrived', val: data.usArrivalDate1, handler: fillDateCells },
    { label: 'Ngày đến', val: data.usArrivalDate1, handler: fillDateCells },
    { label: 'Length of Stay', val: data.usStayDuration1 },
    { label: 'Thời gian lưu trú', val: data.usStayDuration1 },
    { label: 'Have you ever been issued a U.S. Visa', val: data.hasUSVisa === 'Đã từng' ? 'YES' : 'NO' },
    { label: 'Have you ever been issued a US', val: data.hasUSVisa === 'Đã từng' ? 'YES' : 'NO' },
    { label: 'Bạn đã từng được cấp visa Mỹ chưa', val: data.hasUSVisa === 'Đã từng' ? 'YES' : 'NO' },

    // ── DRIVER's LICENSE ──
    { label: "Do you or did you ever hold a U.S. Driver", val: data.driverLicense ? (isAffirmativeValue(data.driverLicense) ? 'YES' : 'NO') : '' },
    { label: "Driver’s License Number", val: data.driverLicenseNumber || data.usDriverLicenseNumber || data.usDriversLicenseNumber },
    { label: "State of Driver’s License", val: data.driverLicenseState || data.usDriverLicenseState || data.usDriversLicenseState },

    // ── VISA ──
    { label: 'Date issued', val: data.usVisaIssueDate, handler: fillDateCells },
    { label: 'Ngày phát hành', val: data.usVisaIssueDate, handler: fillDateCells },
    { label: 'Visa classification', val: data.usVisaClassification },
    { label: 'Phân loại visa', val: data.usVisaClassification },
    { label: 'Visa number', val: data.usVisaNumber },
    { label: 'Số visa', val: data.usVisaNumber },
    { label: 'Are you applying for the same type of visa', val: 'NO' },
    { label: 'Are you applying in the same country or location', val: 'NO' },
    { label: 'Have you been ten-printed', val: 'NO' },
    { label: 'Have any your US visa ever been lost or stolen', val: 'NO' },
    { label: 'Have any of your U.S visas ever been cancelled or revoked', val: 'NO' },
    { label: 'Have you ever been refused a US Visa', val: hasUSRefusal ? 'YES' : 'NO' },
    { label: 'Explain', val: usRefusalExplain, after: 'Have you ever been refused a US Visa' },
    { label: 'Has anyone ever filed an immigrant petition', val: hasImmigrantPetition ? 'YES' : 'NO' },
    { label: 'Explain', val: immigrantPetitionExplain, after: 'Has anyone ever filed an immigrant petition' },

    // ── MILITARY & PARTY MEMBERSHIP ──
    { label: 'Have you ever served in the', val: isAffirmativeValue(data.militaryService) ? 'YES' : 'NO' },
    { label: 'Name of Country/Region', val: data.militaryCountry, after: 'Have you ever served in the' },
    { label: 'Branch of Service', val: data.militaryBranch, after: 'Have you ever served in the' },
    { label: 'Rank/Position', val: data.militaryRank, after: 'Have you ever served in the' },
    { label: 'Military Specialty', val: data.militaryUnit, after: 'Have you ever served in the' },
    { label: 'Date of Service From', val: data.militaryEnlistmentDate, handler: fillDateCells, after: 'Have you ever served in the' },
    { label: 'Date of Service To', val: data.militaryDischargeDate, handler: fillDateCells, after: 'Have you ever served in the' },
    { label: 'Do you have any specialized skills or training', val: isAffirmativeValue(data.specializedSkills) ? 'YES' : 'NO' },
    { label: 'Bạn có kỹ năng hoặc đào tạo chuyên môn nào không', val: isAffirmativeValue(data.specializedSkills) ? 'YES' : 'NO' },
    { label: 'Explain', val: data.specializedSkillsExplain, after: 'Do you have any specialized skills or training' },
    { label: 'Giải thích', val: data.specializedSkillsExplain, after: 'Bạn có kỹ năng hoặc đào tạo chuyên môn nào không' },
    { label: 'Are you a member of or affiliated with the', val: isAffirmativeValue(data.partyMembership) ? 'YES' : 'NO' },

    // ── THÔNG TIN LIÊN LẠC BÊN MỸ (US CONTACT) ──
    ...(() => {
      let surname = ''
      let given = ''
      if (data.usContactFullName) {
        const parts = String(data.usContactFullName).trim().split(' ')
        if (parts.length > 1) {
          surname = parts[0]
          given = parts.slice(1).join(' ')
        } else {
          given = parts[0]
        }
      }

      const usAddrFull = data.usContactAddress || ''
      const usAddrObj = splitAddr(usAddrFull, data, 'usContactAddress', true)
      
      let finalStreet = data.usContactAddressStreet || data.usContactStreet || usAddrObj.street || usAddrFull || ''
      let finalCity = data.usContactAddressCity || data.usContactCity || usAddrObj.city || ''
      let state = data.usContactAddressState || data.usContactState || usAddrObj.province || ''
      let zip = data.usContactAddressZipCode || data.usContactZipCode || usAddrObj.zip || ''
      let finalLine2 = data.usContactAddressLine2 || data.usContactLine2 || ''
      
      const combinedStateZip = state || usAddrObj.province || ''
      const stateZipMatch = combinedStateZip.match(/^([a-zA-Z\s]+)\s+(\d+)$/)
      if (stateZipMatch) {
        state = stateZipMatch[1].trim()
        if (!zip) zip = stateZipMatch[2].trim()
      }

      return [
        { label: 'Surnames', val: surname, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'Given Names', val: given, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'Organization Name', val: data.usContactOrganization || '', after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'Relationship to you', val: data.usContactRelationship, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'U.S. Street Address (Line 1)', val: finalStreet, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'U.S. Street Address (Line 2)', val: finalLine2, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'City', val: finalCity, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'State', val: state, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'ZIP Code', val: zip, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'Phone Number', val: data.usContactPhone, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' },
        { label: 'Email Address', val: data.usContactEmail, after: 'THÔNG TIN LIÊN LẠC BÊN MỸ' }
      ]
    })(),
  ]

  const allTds = Array.from(paperRef.value.querySelectorAll('td'))
  const usedCells = new Set() // Track đã dùng cell nào để tránh fill trùng

  // Chuẩn hóa label để match được cả dấu nháy cong trong HTML (Mother’s) và dấu nháy thẳng trong mapping (Mother's).
  const normalizeLabelForMatch = (value) => String(value || '')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()


  const isDateLikeLabel = (label = '') => /DATE|DOB|BIRTH|SINH|NGÀY|NGÀY|THÁNG|THANG|NĂM|NAM/i.test(String(label || ''))
  const normalizeI130ValueByLabel = (label, value) => {
    if (shouldRenderLowercaseEmail(label, value)) return normalizeEmailDisplayValue(value)
    if (!isDateLikeLabel(label)) return normalizeText(value)
    const formatted = formatI130DateMMDDYYYY(value)
    return normalizeText(formatted || value)
  }

  mappings.forEach(m => {
    const hasValue = !(m.val === undefined || m.val === null || String(m.val).trim() === '')
    if (!hasValue && !m.force) return
    
    if (m.label === 'Full Name in Native Language') {
      m.val = typeof m.val === 'string' ? m.val.toUpperCase() : m.val
    } else {
      m.val = normalizeI130ValueByLabel(m.label, m.val)
    }
    
    let searchStartIndex = 0
    if (m.after) {
      const afterLabel = normalizeLabelForMatch(m.after)
      const idx = allTds.findIndex(td => normalizeLabelForMatch(td.textContent).includes(afterLabel))
      if (idx !== -1) searchStartIndex = idx
    }

    // Tìm label cell chưa được dùng
    let labelCell = null
    const targetLabel = normalizeLabelForMatch(m.label)
    for (let i = searchStartIndex; i < allTds.length; i++) {
      const td = allTds[i]
      if (td.classList.contains('data-cell')) continue
      if (usedCells.has(td)) continue
      const text = normalizeLabelForMatch(td.textContent)
      if (text.startsWith(targetLabel)) {
        labelCell = td
        break
      }
    }
    
    if (!labelCell) return
    usedCells.add(labelCell)

    // Find next sibling data-cell
    let next = labelCell.nextElementSibling
    while (next && !next.classList.contains('data-cell')) {
      next = next.nextElementSibling
    }
    if (next) {
      if (m.handler) {
        m.handler(next, m.val)
      } else if (next.classList.contains('yesno-cell')) {
        fillYesNoCell(next, m.val)
      } else if (next.classList.contains('immigrant-status-cell')) {
        fillImmigrantStatusCell(next, m.val)
      } else if (next.classList.contains('spouse-address-option-cell')) {
        fillSpouseAddressOptionCell(next, m.val)
      } else if (isI130HeightLabel(m.label)) {
        const heightVal = fillHeightSplitCell(next, m.val, 'color-customer')
        if (!heightVal) {
          next.innerHTML = m.val
          next.dataset.filled = 'true'
          next.dataset.filledValue = m.val
          next.classList.add('color-customer')
        }
      } else if (m.val === 'YES' || m.val === 'NO') {
        ensureYesNoCell(next, m.val)
      } else {
        next.innerHTML = m.val
        next.dataset.filled = 'true'
        next.dataset.filledValue = m.val
        if (isDateLikeLabel(m.label) && /^\d{2}\/\d{2}\/\d{4}$/.test(String(m.val || ''))) next.dataset.i130DateFormatted = 'true'
        next.classList.add('color-customer')
      }
    }
  })

  let dynamicSections = null
  if (isI130A) {
    dynamicSections = renderI130ADynamicSections({
      paperEl: paperRef.value,
      data,
      mode: props.mode,
      changes,
      emit,
      normalizeText,
      splitAddr,
      firstValue,
      updateCorrectionCountDisplay
    })
  }

  renderBeneficiaryAppendixForSpouseCase(data)

  // Chốt format ngày ở tầng render cuối cùng để không sót các block động như việc làm, cư trú, hôn nhân, cha mẹ, con cái.
  applyI130DateFormatToAllFilledCells()

  if (isK1) {
    renderK1SpecifyControls(data._fillerChanges, data._reviewChanges)
    renderK1PayerControls(getK1PayerDefaultValue(data), data._fillerChanges, data._reviewChanges)
  }

  const spouseAddressOption = resolveSpouseAddressOption()
  const spouseAddressOptionCell = Array.from(paperRef.value.querySelectorAll('.data-cell.spouse-address-option-cell'))[0]
  if (spouseAddressOption && spouseAddressOptionCell) {
    fillSpouseAddressOptionCell(spouseAddressOptionCell, spouseAddressOption)
  }

  const fillSeparatedSocialMediaRows = () => {
    if (!paperRef.value) return

    const accounts = socialMediaAccounts.length
      ? socialMediaAccounts
      : getSocialMediaAccounts(
          socialMediaIdentifier,
          data.socialMediaIdentifier,
          data.socialMediaLinks,
          data.socialMediaLink,
          data.socialMedia
        )

    if (!accounts.length) return

    const normalizePlainText = (value) => normalizeText(
      String(value || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
    ).replace(/\s+/g, ' ').trim()

    const getRowText = (row) => normalizePlainText(row?.textContent || '')

    const isDataLikeCell = (td) => {
      if (!td) return false
      const normalized = normalizePlainText(td.textContent || '')
      if (!normalized) return true
      if (normalized.startsWith('SOCIAL MEDIA PROVIDER/PLATFORM')) return false
      if (normalized.startsWith('SOCIAL MEDIA IDENTIFIER')) return false
      if (normalized === '20' || normalized === '21') return false
      if (normalized.includes('OTHER SOCIAL MEDIA')) return false
      if (normalized.includes('MANG XA HOI') || normalized.includes('MẠNG XÃ HỘI')) return false
      return true
    }

    const findValueCell = (row) => {
      if (!row) return null
      const cells = Array.from(row.querySelectorAll('td'))
      const dataCells = cells.filter(td => td.classList.contains('data-cell'))
      if (dataCells.length) return dataCells[dataCells.length - 1]

      const fallbackCells = cells.filter(isDataLikeCell)
      return fallbackCells[fallbackCells.length - 1] || cells[cells.length - 1] || null
    }

    const setCellValue = (cell, value) => {
      if (!cell) return
      const normalizedValue = normalizeText(value || '')
      cell.innerHTML = normalizedValue
      cell.dataset.filled = 'true'
      cell.dataset.filledValue = normalizedValue
      cell.classList.remove('color-filler', 'color-reviewer')
      cell.classList.add('color-customer')
    }

    const rows = Array.from(paperRef.value.querySelectorAll('tr'))
    let inSocialSection = false
    const pairs = []
    let pendingProviderRow = null
    let otherSocialRow = null
    let insertBeforeRow = null

    for (const row of rows) {
      const rowText = getRowText(row)

      if (rowText.includes('MANG XA HOI') || rowText.includes('MẠNG XÃ HỘI')) {
        inSocialSection = true
        continue
      }

      if (!inSocialSection) continue

      if (rowText.includes('THONG TIN HO CHIEU') || rowText.includes('THÔNG TIN HỘ CHIẾU')) {
        insertBeforeRow = row
        break
      }

      if (!otherSocialRow && rowText.includes('OTHER SOCIAL MEDIA')) {
        otherSocialRow = row
      }

      if (rowText.includes('SOCIAL MEDIA PROVIDER/PLATFORM')) {
        pendingProviderRow = row
        continue
      }

      if (pendingProviderRow && rowText.includes('SOCIAL MEDIA IDENTIFIER')) {
        pairs.push({ providerRow: pendingProviderRow, identifierRow: row })
        pendingProviderRow = null
      }
    }

    if (!pairs.length) return

    const tbody = pairs[0].providerRow.parentNode
    const lastPair = pairs[pairs.length - 1]

    const isStandardProvider = (provider) => {
      const p = String(provider || '').trim().toUpperCase()
      const std = [
        'ASK.FM', 'DOUBAN', 'FACEBOOK', 'FLICKR', 'GOOGLE+', 'INSTAGRAM',
        'LINKEDIN', 'MYSPACE', 'PINTEREST', 'QZONE', 'QZONE(QQ)', 'REDDIT',
        'SINA WEIBO', 'TENCENT WEIBO', 'TUMBLR', 'TWITTER', 'TWITER', 'TWOO',
        'VINE', 'VKONTAKTE', 'VKONTAKTE (VK)', 'VK', 'YOUKU', 'YOUTUBE'
      ]
      return std.includes(p)
    }

    const standardAccounts = accounts.filter(a => isStandardProvider(a.provider || inferSocialMediaProvider(a.identifier)))
    const otherAccounts = accounts.filter(a => !isStandardProvider(a.provider || inferSocialMediaProvider(a.identifier)))

    const standardPairs = [pairs[0]]
    const otherPairs = pairs.slice(1)

    const getSocialMediaCount = (changeMap, prefix) => {
      if (!changeMap) return 0
      return Object.keys(changeMap).reduce((max, key) => {
        const regex = new RegExp(`_pair_${prefix}_(\\d+)`)
        const match = key.match(regex)
        return match ? Math.max(max, parseInt(match[1], 10)) : max
      }, 0)
    }

    const neededStd = Math.max(getSocialMediaCount(data._fillerChanges, 'std'), getSocialMediaCount(data._reviewChanges, 'std'))
    const neededOth = Math.max(getSocialMediaCount(data._fillerChanges, 'oth'), getSocialMediaCount(data._reviewChanges, 'oth'))

    const targetStdLength = Math.max(standardAccounts.length, neededStd)
    const targetOthLength = Math.max(otherAccounts.length, neededOth)

    const bindDynamicSocialMediaCell = (td) => {
      if (td.classList.contains('data-cell') && props.mode === 'create') {
        td.setAttribute('contenteditable', 'true')
        td.addEventListener('focus', function () {
          if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
            this.innerHTML = ''
          }
        })
        td.addEventListener('blur', function () {
          const val = this.innerHTML.trim()
          if (!val || val === '<br>') {
            // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
            // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
            const wasFilled = this.dataset.filled === 'true'
            this.innerHTML = this.dataset.originalHtml || ''
            this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
            if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
            else delete changes.value[this.dataset.cellId]
          } else if (this.dataset.filled && val === this.dataset.filledValue) {
            this.classList.remove('color-filler', 'modified', 'color-reviewer')
            this.classList.add('color-customer')
            delete changes.value[this.dataset.cellId]
          } else {
            this.classList.remove('color-customer', 'color-reviewer')
            this.classList.add('color-filler', 'modified')
            changes.value[this.dataset.cellId] = val
          }
          emit('change', { ...changes.value })
        })
      }

      if (td.classList.contains('note-cell')) {
        td.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
        if (props.mode === 'review') {
          td.addEventListener('input', function () {
            const val = this.innerHTML.trim()
            if (!val || val === '<br>') {
              this.classList.remove('color-reviewer')
              delete changes.value[this.dataset.cellId]
            } else {
              this.classList.remove('color-customer', 'color-filler')
              this.classList.add('color-reviewer')
              changes.value[this.dataset.cellId] = val
            }
            emit('change', { ...changes.value })
            updateCorrectionCountDisplay()
          })
        }
      }
    }

    const cloneSocialMediaRow = (row, rowIndex, pairIdStr) => {
      const clone = row.cloneNode(true)
      clone.classList.add('dynamic-social-media-row')
      clone.querySelectorAll('.social-media-add-btn').forEach(btn => btn.remove())

      clone.querySelectorAll('td').forEach((td, cellIndex) => {
        if (!td.classList.contains('data-cell') && !td.classList.contains('note-cell')) {
          if (rowIndex === 0 && td.textContent.trim() === '20') {
            td.innerHTML = ''
          }
          return
        }

        const baseCellId = td.dataset.cellId || `social_${rowIndex}_${cellIndex}`
        td.dataset.cellId = `${baseCellId}_pair_${pairIdStr}_row_${rowIndex}_cell_${cellIndex}`
        td.dataset.originalHtml = td.classList.contains('note-cell') ? '' : (td.dataset.originalHtml || '')
        td.innerHTML = td.dataset.originalHtml || ''
        delete td.dataset.filled
        delete td.dataset.filledValue
        delete td.dataset.submittedValue
    delete td.dataset.i130DateFormatted
        td.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

        bindDynamicSocialMediaCell(td)
      })

      const labelTd = Array.from(clone.querySelectorAll('td')).find(t => t.getAttribute('colspan') === '7')
      if (labelTd) {
        if (rowIndex === 0) labelTd.textContent = 'Social Media Provider/Platform:'
        if (rowIndex === 1) {
          const isStd = String(pairIdStr).startsWith('std')
          const prefix = isStd ? '' : ` (${String(pairIdStr).replace('oth_', '')})`
          labelTd.textContent = `Social Media Identifier${prefix}`
        }
      }
      return clone
    }

    while (standardPairs.length < targetStdLength) {
      const pairIndex = standardPairs.length + 1
      const lastPairNow = standardPairs[standardPairs.length - 1]

      const providerClone = cloneSocialMediaRow(lastPairNow.providerRow, 0, `std_${pairIndex}`)
      const identifierClone = cloneSocialMediaRow(lastPairNow.identifierRow, 1, `std_${pairIndex}`)

      tbody.insertBefore(providerClone, otherSocialRow)
      tbody.insertBefore(identifierClone, otherSocialRow)
      standardPairs.push({ providerRow: providerClone, identifierRow: identifierClone })
    }

    while (otherPairs.length < targetOthLength && otherPairs.length > 0) {
      const pairIndex = otherPairs.length + 1
      const lastPairNow = otherPairs[otherPairs.length - 1]

      const providerClone = cloneSocialMediaRow(lastPairNow.providerRow, 0, `oth_${pairIndex}`)
      const identifierClone = cloneSocialMediaRow(lastPairNow.identifierRow, 1, `oth_${pairIndex}`)

      tbody.insertBefore(providerClone, insertBeforeRow)
      tbody.insertBefore(identifierClone, insertBeforeRow)
      otherPairs.push({ providerRow: providerClone, identifierRow: identifierClone })
    }

    standardPairs.forEach((pair, index) => {
      const account = standardAccounts[index]
      const providerCell = findValueCell(pair.providerRow)
      const identifierCell = findValueCell(pair.identifierRow)

      if (account) {
        setCellValue(providerCell, account.provider || inferSocialMediaProvider(account.identifier))
        setCellValue(identifierCell, account.identifier)
      } else {
        setCellValue(providerCell, '')
        setCellValue(identifierCell, '')
      }
    })

    otherPairs.forEach((pair, index) => {
      const account = otherAccounts[index]
      const providerCell = findValueCell(pair.providerRow)
      const identifierCell = findValueCell(pair.identifierRow)

      if (account) {
        setCellValue(providerCell, account.provider || inferSocialMediaProvider(account.identifier))
        setCellValue(identifierCell, account.identifier)
      } else {
        setCellValue(providerCell, '')
        setCellValue(identifierCell, '')
      }
    })

    if (otherSocialRow) {
      const otherSocialCell = findValueCell(otherSocialRow)
      if (otherSocialCell) fillYesNoCell(otherSocialCell, otherAccounts.length > 0 ? 'YES' : 'NO')
    }

    const createAddBtn = (title, onClick) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'social-media-add-btn'
      btn.textContent = '+'
      btn.title = title
      btn.style.cssText = [
        'float:right', 'width:22px', 'height:22px', 'line-height:18px', 'margin-left:8px',
        'border:1px solid #6366f1', 'border-radius:4px', 'background:#eef2ff', 'color:#4338ca',
        'font-size:16px', 'font-weight:700', 'font-family:Arial,sans-serif', 'cursor:pointer', 'padding:0'
      ].join(';')
      btn.addEventListener('click', onClick)
      return btn
    }

    if (props.mode !== 'view' && tbody) {
      // Row 20 button
      if (standardPairs.length && otherSocialRow) {
        const row20LabelTd = Array.from(standardPairs[0].providerRow.querySelectorAll('td')).find(td => {
          const text = normalizePlainText(td.textContent || '')
          return text.includes('SOCIAL MEDIA PROVIDER/PLATFORM')
        })
        if (row20LabelTd && !row20LabelTd.querySelector('.social-media-add-btn')) {
          row20LabelTd.appendChild(createAddBtn('Thêm mạng xã hội chuẩn', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const pairIndex = standardPairs.length + 1
            const lastPairNow = standardPairs[standardPairs.length - 1]

            const providerClone = cloneSocialMediaRow(lastPairNow.providerRow, 0, `std_${pairIndex}`)
            const identifierClone = cloneSocialMediaRow(lastPairNow.identifierRow, 1, `std_${pairIndex}`)

            tbody.insertBefore(providerClone, otherSocialRow)
            tbody.insertBefore(identifierClone, otherSocialRow)
            standardPairs.push({ providerRow: providerClone, identifierRow: identifierClone })
            updateCorrectionCountDisplay()
          }))
        }
      }

      // Row 21 button
      if (otherPairs.length && otherSocialRow && insertBeforeRow) {
        const row21LabelTd = Array.from(otherSocialRow.querySelectorAll('td')).find(td => {
          const text = normalizePlainText(td.textContent || '')
          return text.includes('OTHER SOCIAL MEDIA')
        })
        if (row21LabelTd && !row21LabelTd.querySelector('.social-media-add-btn')) {
          row21LabelTd.appendChild(createAddBtn('Thêm mạng xã hội khác', (e) => {
            e.preventDefault()
            e.stopPropagation()
            const pairIndex = otherPairs.length + 1
            const lastPairNow = otherPairs[otherPairs.length - 1]

            const providerClone = cloneSocialMediaRow(lastPairNow.providerRow, 0, `oth_${pairIndex}`)
            const identifierClone = cloneSocialMediaRow(lastPairNow.identifierRow, 1, `oth_${pairIndex}`)

            tbody.insertBefore(providerClone, insertBeforeRow)
            tbody.insertBefore(identifierClone, insertBeforeRow)
            otherPairs.push({ providerRow: providerClone, identifierRow: identifierClone })

            const otherCell = findValueCell(otherSocialRow)
            if (otherCell) fillYesNoCell(otherCell, 'YES')

            updateCorrectionCountDisplay()
          }))
        }
      }
    }
  }

  fillSeparatedSocialMediaRows()

  const fillMailingAddressRows = (mail) => {
    if (!hasAddressValue(mail)) return

    const anchorTd = allTds.find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      const text = td.textContent.trim().replace(/\s+/g, ' ')
      return text.startsWith('Is your Mailing Address the same as your Home Address')
    })
    if (!anchorTd) return

    const sectionRows = []
    let row = anchorTd.closest('tr')?.nextElementSibling
    for (let i = 0; i < 6 && row; i += 1) {
      sectionRows.push(row)
      row = row.nextElementSibling
    }

    const fillRow = (label, val) => {
      if (!val) return
      const targetRow = sectionRows.find(tr => {
        return Array.from(tr.querySelectorAll('td')).some(td => {
          if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
          const text = td.textContent.trim().replace(/\s+/g, ' ')
          return text.startsWith(label)
        })
      })
      if (!targetRow) return

      const labelTd = Array.from(targetRow.querySelectorAll('td')).find(td => {
        if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
        const text = td.textContent.trim().replace(/\s+/g, ' ')
        return text.startsWith(label)
      })
      if (!labelTd) return

      let next = labelTd.nextElementSibling
      while (next && !next.classList.contains('data-cell')) {
        next = next.nextElementSibling
      }
      if (!next) return

      const normalizedVal = normalizeText(val)
      next.innerHTML = normalizedVal
      next.dataset.filled = 'true'
      next.dataset.filledValue = normalizedVal
      next.classList.add('color-customer')
    }

    fillRow('Street Address (Line 1)', mail.street)
    fillRow('Street Address (Line 2)', mail.line2)
    fillRow('City', mail.city)
    fillRow('State/Province', mail.province)
    fillRow('Postal Zone/ZIP Code', mail.zip)
    fillRow('Country/Region', mail.country)
  }

  fillMailingAddressRows(resolveHomeMailingAddresses().mail)

  const bindHomeMailingAddressSync = () => {
    if (props.mode !== 'create' || !paperRef.value) return

    const addressLabels = [
      'Street Address (Line 1)',
      'Street Address (Line 2)',
      'City',
      'State/Province',
      'Postal Zone/ZIP Code',
      'Country/Region'
    ]

    const normalizeCellText = (td) => td.textContent.trim().replace(/\s+/g, ' ')
    const findNextDataCell = (td) => {
      let next = td?.nextElementSibling || null
      while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
      return next
    }

    const sameQuestionTd = allTds.find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return normalizeCellText(td).startsWith('Is your Mailing Address the same as your Home Address')
    })
    if (!sameQuestionTd) return

    const sameCell = findNextDataCell(sameQuestionTd)
    const sameRow = sameQuestionTd.closest('tr')
    if (!sameCell || !sameRow) return

    const getAddressRowsBefore = () => {
      const rows = []
      let row = sameRow.previousElementSibling
      while (row && rows.length < addressLabels.length) {
        rows.unshift(row)
        row = row.previousElementSibling
      }
      return rows
    }

    const getAddressRowsAfter = () => {
      const rows = []
      let row = sameRow.nextElementSibling
      while (row && rows.length < addressLabels.length) {
        rows.push(row)
        row = row.nextElementSibling
      }
      return rows
    }

    const getAddressCells = (rows) => {
      const result = {}
      addressLabels.forEach(label => {
        const row = rows.find(tr => {
          return Array.from(tr.querySelectorAll('td')).some(td => {
            if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
            return normalizeCellText(td).startsWith(label)
          })
        })
        if (!row) return

        const labelTd = Array.from(row.querySelectorAll('td')).find(td => {
          if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
          return normalizeCellText(td).startsWith(label)
        })
        const dataCell = findNextDataCell(labelTd)
        if (dataCell) result[label] = dataCell
      })
      return result
    }

    const homeCells = getAddressCells(getAddressRowsBefore())
    const mailingCells = getAddressCells(getAddressRowsAfter())

    const isMailingSameAsHome = () => {
      if (sameCell.classList.contains('yesno-cell')) return getCheckedYesNoValue(sameCell) === 'YES'
      return normalizeText(stripHtml(sameCell.innerHTML)).includes('YES')
    }

    const applySyncedMailingValue = (cell, value) => {
      if (!cell) return
      const cleanValue = String(value || '').trim()

      cell.innerHTML = cleanValue || cell.dataset.originalHtml || ''
      cell.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

      if (!cleanValue || cleanValue === '<br>') {
        delete changes.value[cell.dataset.cellId]
        return
      }

      if (cell.dataset.filled === 'true' && cleanValue === cell.dataset.filledValue) {
        cell.classList.add('color-customer')
        delete changes.value[cell.dataset.cellId]
      } else {
        cell.classList.add('color-filler', 'modified')
        changes.value[cell.dataset.cellId] = cleanValue
      }
    }

    const syncMailingFromHome = () => {
      if (!isMailingSameAsHome()) return

      addressLabels.forEach(label => {
        const homeCell = homeCells[label]
        const mailingCell = mailingCells[label]
        if (!homeCell || !mailingCell) return
        applySyncedMailingValue(mailingCell, homeCell.innerHTML.trim())
      })
      emit('change', { ...changes.value })
    }

    Object.values(homeCells).forEach(cell => {
      if (cell.dataset.homeMailingSyncBound === 'true') return
      cell.dataset.homeMailingSyncBound = 'true'
      cell.addEventListener('blur', syncMailingFromHome)
    })

    sameCell.querySelectorAll('.yesno-check').forEach(chk => {
      if (chk.dataset.homeMailingSyncBound === 'true') return
      chk.dataset.homeMailingSyncBound = 'true'
      chk.addEventListener('change', () => {
        if (chk.dataset.val === 'YES' && chk.checked) syncMailingFromHome()
      })
    })
  }

  bindHomeMailingAddressSync()

  // ── DYNAMIC PREVIOUS US TRIPS ──
  const dateArrivedTd = allTds.find(td => td.textContent.trim().startsWith('Date Arrived') || td.textContent.trim().startsWith('Ngày đến'))
  const lengthOfStayTd = allTds.find(td => td.textContent.trim().startsWith('Length of Stay') || td.textContent.trim().startsWith('Thời gian lưu trú'))
  const visitedUSQuestionTd = allTds.find(td => {
    if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
    const txt = td.textContent.trim().replace(/\s+/g, ' ')
    return txt.startsWith('Have you ever been in the U.S') || txt.startsWith('Bạn đã từng đến Mỹ chưa')
  })
  const visitedUSQuestionDataCell = (() => {
    if (!visitedUSQuestionTd) return null
    let next = visitedUSQuestionTd.nextElementSibling
    while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
    return next || null
  })()

  if (dateArrivedTd && lengthOfStayTd) {
    const trDate = dateArrivedTd.closest('tr')
    const trLength = lengthOfStayTd.closest('tr')
    
    // Tìm ô có số 13 (đang có rowspan=6) để tăng thêm khi clone dòng
    const rowspanCell = allTds.find(td => td.textContent.trim() === '13' && td.hasAttribute('rowspan'))

    if (trDate && trLength) {
      dateArrivedTd.querySelectorAll('.trip-add-btn').forEach(btn => btn.remove())
      if (rowspanCell && !rowspanCell.dataset.originalRowspan) {
        rowspanCell.dataset.originalRowspan = rowspanCell.getAttribute('rowspan') || '6'
      }
      const baseRowspan = rowspanCell ? (parseInt(rowspanCell.dataset.originalRowspan || rowspanCell.getAttribute('rowspan')) || 6) : 6
      let renderedTripCount = 1

      const markVisitedUSQuestionYes = () => {
        if (!visitedUSQuestionDataCell) return
        const isYes = visitedUSQuestionDataCell.dataset.filledValue === 'YES' || 
                      visitedUSQuestionDataCell.querySelector('.yesno-check:checked')?.dataset.val === 'YES' || 
                      visitedUSQuestionDataCell.textContent.trim() === 'YES'
        if (isYes) return

        // Tư vấn thêm lần đến Mỹ thì chỉ ghi vào cột TƯ VẤN.
        if (props.mode === 'review') {
          const noteCellId = visitedUSQuestionDataCell.dataset.cellId?.replace('data_', 'note_')
          const noteCell = noteCellId ? paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`) : null
          if (noteCell) {
            noteCell.innerHTML = 'YES'
            noteCell.classList.remove('color-customer', 'color-filler')
            noteCell.classList.add('color-reviewer')
            changes.value[noteCell.dataset.cellId] = 'YES'
          }
          return
        }

        const originalFilled = visitedUSQuestionDataCell.dataset.filled
        const originalFilledValue = visitedUSQuestionDataCell.dataset.filledValue
        if (visitedUSQuestionDataCell.classList.contains('yesno-cell')) {
          fillYesNoCell(visitedUSQuestionDataCell, 'YES')
        } else {
          ensureYesNoCell(visitedUSQuestionDataCell, 'YES')
        }
        visitedUSQuestionDataCell.classList.remove('color-customer', 'color-reviewer')
        if (originalFilled !== undefined) visitedUSQuestionDataCell.dataset.filled = originalFilled
        else delete visitedUSQuestionDataCell.dataset.filled
        if (originalFilledValue !== undefined) visitedUSQuestionDataCell.dataset.filledValue = originalFilledValue
        else delete visitedUSQuestionDataCell.dataset.filledValue

        if (originalFilled === 'true' && originalFilledValue === 'YES') {
          visitedUSQuestionDataCell.classList.add('color-customer')
          if (visitedUSQuestionDataCell.dataset.cellId) delete changes.value[visitedUSQuestionDataCell.dataset.cellId]
        } else {
          visitedUSQuestionDataCell.classList.add('color-filler')
          if (visitedUSQuestionDataCell.dataset.cellId) changes.value[visitedUSQuestionDataCell.dataset.cellId] = 'YES'
        }
      }

      const bindDynamicTripCell = (td) => {
        if (td.dataset.tripBound === 'true') return
        td.dataset.tripBound = 'true'

        if (td.classList.contains('data-cell')) {
          if (props.mode === 'create') {
            td.setAttribute('contenteditable', 'true')
            td.addEventListener('focus', function () {
              if (this.innerHTML === this.dataset.originalHtml && !this.dataset.filled) {
                this.innerHTML = ''
              }
            })
            td.addEventListener('blur', function () {
              const val = this.innerHTML.trim()
              if (!val || val === '<br>') {
                // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
                // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
                const wasFilled = this.dataset.filled === 'true'
                this.innerHTML = this.dataset.originalHtml || ''
                this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
                if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
                else delete changes.value[this.dataset.cellId]
              } else if (this.dataset.filled && val === this.dataset.filledValue) {
                this.classList.remove('color-filler', 'modified', 'color-reviewer')
                this.classList.add('color-customer')
                delete changes.value[this.dataset.cellId]
              } else {
                this.classList.remove('color-customer', 'color-reviewer')
                this.classList.add('color-filler', 'modified')
                changes.value[this.dataset.cellId] = val
              }
              emit('change', { ...changes.value })
            })
          } else {
            td.setAttribute('contenteditable', 'false')
          }
        }

        if (td.classList.contains('note-cell')) {
          td.setAttribute('contenteditable', props.mode === 'view' ? 'false' : 'true')
          if (props.mode === 'review') {
            td.addEventListener('input', function () {
              const val = this.innerHTML.trim()
              if (val === '' || val === '<br>') {
                this.classList.remove('color-reviewer')
                delete changes.value[this.dataset.cellId]
              } else {
                this.classList.remove('color-customer', 'color-filler')
                this.classList.add('color-reviewer')
                changes.value[this.dataset.cellId] = val
              }
              emit('change', { ...changes.value })
            })
          }
        }
      }

      const prepareDynamicTripRow = (row, tripNumber, rowIndex) => {
        row.classList.add('dynamic-us-trip-row')
        row.querySelectorAll('.trip-add-btn').forEach(btn => btn.remove())
        row.querySelectorAll('td').forEach((td, cellIndex) => {
          if (!td.classList.contains('data-cell') && !td.classList.contains('note-cell')) return

          const baseCellId = td.dataset.cellId || `trip_${rowIndex}_${cellIndex}`
          const originalHtml = td.classList.contains('note-cell') ? '' : (td.dataset.originalHtml || '')
          td.dataset.cellId = `${baseCellId}_trip_${tripNumber}_row_${rowIndex}_cell_${cellIndex}`
          td.dataset.originalHtml = originalHtml
          td.innerHTML = originalHtml
          delete td.dataset.filled
          delete td.dataset.filledValue
          delete td.dataset.submittedValue
    delete td.dataset.i130DateFormatted
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
          bindDynamicTripCell(td)
        })
      }

      const insertTripBlock = (tripNumber, insertAfterRow) => {
        const cloneDate = trDate.cloneNode(true)
        const cloneLength = trLength.cloneNode(true)
        prepareDynamicTripRow(cloneDate, tripNumber, 0)
        prepareDynamicTripRow(cloneLength, tripNumber, 1)

        const arrDate = data['usArrivalDate' + tripNumber]
        const duration = data['usStayDuration' + tripNumber]
        const dateCells = Array.from(cloneDate.querySelectorAll('.data-cell'))
        if (dateCells.length > 0 && arrDate) {
          fillDateCells(dateCells[0], arrDate)
        }

        const lengthCells = Array.from(cloneLength.querySelectorAll('.data-cell'))
        if (lengthCells.length > 0 && duration) {
          lengthCells[0].innerHTML = duration
          lengthCells[0].dataset.filled = 'true'
          lengthCells[0].dataset.filledValue = duration
          lengthCells[0].classList.add('color-customer')
        }

        insertAfterRow.insertAdjacentElement('afterend', cloneDate)
        cloneDate.insertAdjacentElement('afterend', cloneLength)
        return cloneLength
      }

      const renderTripBlocks = (count) => {
        const tripCount = Math.max(1, count)
        paperRef.value.querySelectorAll('tr.dynamic-us-trip-row').forEach(row => row.remove())
        if (rowspanCell) rowspanCell.setAttribute('rowspan', baseRowspan + Math.max(0, tripCount - 1) * 2)

        let insertAfterRow = trLength
        for (let tripNumber = 2; tripNumber <= tripCount; tripNumber++) {
          insertAfterRow = insertTripBlock(tripNumber, insertAfterRow)
        }
        renderedTripCount = tripCount
        restoreCurrentTripChanges()
      }

      const getTripCountFromChanges = (changeMap) => {
        if (!changeMap) return 0
        return Object.keys(changeMap).reduce((max, key) => {
          const match = key.match(/_trip_(\d+)_/)
          if (!match) return max
          const tripNumber = parseInt(match[1], 10)
          return Number.isFinite(tripNumber) ? Math.max(max, tripNumber) : max
        }, 0)
      }

      const restoreCurrentTripChanges = () => {
        if (!changes.value || Object.keys(changes.value).length === 0) return
        paperRef.value.querySelectorAll('tr.dynamic-us-trip-row .data-cell, tr.dynamic-us-trip-row .note-cell').forEach(td => {
          const savedValue = changes.value[td.dataset.cellId]
          if (savedValue === undefined) return
          td.innerHTML = savedValue
          if (td.classList.contains('note-cell')) {
            td.classList.remove('color-customer', 'color-filler')
            td.classList.add('color-reviewer')
          } else {
            td.classList.remove('color-customer', 'color-reviewer')
            td.classList.add('color-filler', 'modified')
          }
        })
      }

      let initialTripCount = 1
      for (let tripNumber = 2; tripNumber <= 10; tripNumber++) {
        if (data['usArrivalDate' + tripNumber] || data['usStayDuration' + tripNumber]) {
          initialTripCount = tripNumber
        }
      }
      initialTripCount = Math.max(
        initialTripCount,
        getTripCountFromChanges(data._fillerChanges),
        getTripCountFromChanges(data._reviewChanges)
      )
      renderTripBlocks(initialTripCount)

      if (props.mode !== 'view') {
        const addTripBtn = document.createElement('button')
        addTripBtn.type = 'button'
        addTripBtn.className = 'trip-add-btn'
        addTripBtn.textContent = '+'
        addTripBtn.title = 'Thêm lần đến Mỹ'
        addTripBtn.setAttribute('aria-label', 'Thêm lần đến Mỹ')
        addTripBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          renderTripBlocks(renderedTripCount + 1)
          markVisitedUSQuestionYes()
          emit('change', { ...changes.value })
          updateCorrectionCountDisplay()
        })
        dateArrivedTd.appendChild(addTripBtn)
      }
    }
  }

  // ── DYNAMIC COMPANIONS ──
  if (parsedCompanions && parsedCompanions.length > 1) {
    const surnamesOfPersonTd = allTds.find(td => td.textContent.trim().startsWith('Surnames of Person Traveling With You'))
    if (surnamesOfPersonTd) {
      const startTr = surnamesOfPersonTd.closest('tr')
      const compTrs = []
      let curr = startTr
      for (let i = 0; i < 3; i++) {
        if (curr) compTrs.push(curr)
        curr = curr.nextElementSibling
      }

      if (compTrs.length === 3) {
        let currentInsertRef = compTrs[2]

        for (let i = 1; i < parsedCompanions.length; i++) {
          const comp = parsedCompanions[i]

          const clonedTrs = compTrs.map((tr) => {
            const clone = tr.cloneNode(true)
            
            clone.querySelectorAll('td').forEach(td => {
              if (td.classList.contains('data-cell') || td.innerHTML === '' || td.colSpan === 11) {
                if (td.colSpan === 11) td.innerHTML = ''
                delete td.dataset.filled
                delete td.dataset.filledValue
                td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
                delete td.dataset.cellId
              }
            })
            return clone
          })

          const ans0 = Array.from(clonedTrs[0].querySelectorAll('td')).find(td => td.colSpan === 11)
          if (ans0 && comp.surname) {
             ans0.innerHTML = normalizeText(comp.surname)
             ans0.dataset.filled = 'true'
             ans0.classList.add('color-customer')
          }

          const ans1 = Array.from(clonedTrs[1].querySelectorAll('td')).find(td => td.colSpan === 11)
          if (ans1 && comp.givenName) {
             ans1.innerHTML = normalizeText(comp.givenName)
             ans1.dataset.filled = 'true'
             ans1.classList.add('color-customer')
          }

          const ans2 = Array.from(clonedTrs[2].querySelectorAll('td')).find(td => td.colSpan === 11)
          if (ans2 && comp.relationship) {
             ans2.innerHTML = normalizeText(comp.relationship)
             ans2.dataset.filled = 'true'
             ans2.classList.add('color-customer')
          }

          clonedTrs.forEach(clone => {
            currentInsertRef.insertAdjacentElement('afterend', clone)
            currentInsertRef = clone
          })
        }
      }
    }
  }

  // ── DYNAMIC EDUCATION ──
  ;(() => {
    const normalizeCellText = (td) => td.textContent.trim().replace(/\s+/g, ' ')
    const questionTd = allTds.find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return normalizeCellText(td).startsWith('Have you attended any educational institutions')
    })
    const nameOfInstTd = allTds.find(td => normalizeCellText(td).startsWith('Name of Institution'))
    if (!questionTd || !nameOfInstTd) return

    const questionRow = questionTd.closest('tr')
    const questionDataCell = (() => {
      let next = questionTd.nextElementSibling
      while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
      return next || null
    })()
    questionTd.querySelectorAll('.education-add-btn').forEach(btn => btn.remove())

    const startTr = nameOfInstTd.closest('tr')
    const schoolTrs = []
    let curr = startTr
    for (let i = 0; i < 10; i++) {
      if (curr) schoolTrs.push(curr)
      curr = curr.nextElementSibling
    }
    if (schoolTrs.length !== 10) return

    paperRef.value.querySelectorAll('tr.dynamic-school-block').forEach(tr => tr.remove())

    const baseRowspanTds = Array.from(startTr.querySelectorAll('td[rowspan]')).filter(td => {
      return parseInt(td.getAttribute('rowspan') || '0', 10) >= 10
    })
    baseRowspanTds.forEach(td => {
      if (!td.dataset.originalEducationRowspan) {
        td.dataset.originalEducationRowspan = td.getAttribute('rowspan') || '10'
      }
      td.setAttribute('rowspan', td.dataset.originalEducationRowspan)
    })

    const getSchoolCountFromChanges = (changeMap) => {
      if (!changeMap) return 0
      return Object.keys(changeMap).reduce((max, key) => {
        const match = key.match(/_school_(\d+)_/)
        return match ? Math.max(max, parseInt(match[1], 10) || 0) : max
      }, 0)
    }

    let renderedSchoolCount = 1

    const bindDynamicSchoolCell = (td) => {
      if (td.classList.contains('data-cell') && props.mode === 'create') {
        td.setAttribute('contenteditable', 'true')
        td.addEventListener('focus', function () {
          if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
            this.innerHTML = ''
          }
        })
        td.addEventListener('blur', function () {
          const val = this.innerHTML.trim()
          if (!val || val === '<br>') {
            // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
            // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
            const wasFilled = this.dataset.filled === 'true'
            this.innerHTML = this.dataset.originalHtml || ''
            this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
            if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
            else delete changes.value[this.dataset.cellId]
          } else if (this.dataset.filled && val === this.dataset.filledValue) {
            this.classList.remove('color-filler', 'modified', 'color-reviewer')
            this.classList.add('color-customer')
            delete changes.value[this.dataset.cellId]
          } else {
            this.classList.remove('color-customer', 'color-reviewer')
            this.classList.add('color-filler', 'modified')
            changes.value[this.dataset.cellId] = val
          }
          emit('change', { ...changes.value })
        })
      } else if (td.classList.contains('data-cell')) {
        td.setAttribute('contenteditable', 'false')
      }

      if (td.classList.contains('note-cell')) {
        td.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
        if (props.mode === 'review') {
          td.addEventListener('input', function () {
            const val = this.innerHTML.trim()
            if (!val || val === '<br>') {
              this.classList.remove('color-reviewer')
              delete changes.value[this.dataset.cellId]
            } else {
              this.classList.remove('color-customer', 'color-filler')
              this.classList.add('color-reviewer')
              changes.value[this.dataset.cellId] = val
            }
            emit('change', { ...changes.value })
          })
        }
      }
    }

    const updateSchoolRowspans = (count) => {
      const baseRows = parseInt(baseRowspanTds[0]?.dataset.originalEducationRowspan || '10', 10) || 10
      baseRowspanTds.forEach(td => {
        td.setAttribute('rowspan', baseRows + Math.max(0, count - 1) * 10)
      })
    }

    const getInsertRef = () => {
      const dynamicRows = paperRef.value.querySelectorAll('tr.dynamic-school-block')
      return dynamicRows[dynamicRows.length - 1] || schoolTrs[9]
    }

    const appendSchoolBlock = (schoolNumber, school = null) => {
      const addrObj = getSchoolAddress(school || {})
      const clonedTrs = schoolTrs.map((tr, rowIndex) => {
        const clone = tr.cloneNode(true)
        clone.classList.add('dynamic-school-block')

        if (rowIndex === 0) {
          Array.from(clone.querySelectorAll('td[rowspan]')).forEach(td => clone.removeChild(td))
        }

        clone.querySelectorAll('td').forEach((td, cellIndex) => {
          if (!td.classList.contains('data-cell') && !td.classList.contains('note-cell')) return

          const baseCellId = td.dataset.cellId || `school_${rowIndex}_${cellIndex}`
          td.dataset.cellId = `${baseCellId}_school_${schoolNumber}_row_${rowIndex}_cell_${cellIndex}`
          td.dataset.originalHtml = td.classList.contains('note-cell') ? '' : (td.dataset.originalHtml || '')
          td.innerHTML = td.dataset.originalHtml || ''
          delete td.dataset.filled
          delete td.dataset.filledValue
          delete td.dataset.submittedValue
    delete td.dataset.i130DateFormatted
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

          bindDynamicSchoolCell(td)
        })

        return clone
      })

      const fillField = (label, val, handler = null) => {
        if (!val) return
        for (let tr of clonedTrs) {
          const labelTd = Array.from(tr.querySelectorAll('td')).find(t => normalizeCellText(t).startsWith(label))
          if (!labelTd) continue

          let next = labelTd.nextElementSibling
          while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
          if (next) {
            if (handler) handler(next, val)
            else {
              const normalizedVal = normalizeText(val)
              next.innerHTML = normalizedVal
              next.dataset.filled = 'true'
              next.dataset.filledValue = normalizedVal
              next.classList.add('color-customer')
            }
          }
          break
        }
      }

      if (school) {
        fillField('Name of Institution', school.name)
        fillField('Street Address (Line 1)', addrObj.street)
        fillField('Street Address (Line 2)', addrObj.line2 || ' ')
        fillField('City', addrObj.city)
        fillField('State/Province', addrObj.province)
        fillField('Postal Zone/ZIP Code', addrObj.zip)
        fillField('Country/region', firstValue(school.country, addrObj.country))
        fillField('Course of Study', school.course)
        fillField('Date of Attendance From', school.dateFrom, fillDateCells)
        fillField('Date of Attendance To', school.dateTo, fillDateCells)
      }

      let insertRef = getInsertRef()
      clonedTrs.forEach(tr => {
        insertRef.insertAdjacentElement('afterend', tr)
        insertRef = tr
      })

      renderedSchoolCount = Math.max(renderedSchoolCount, schoolNumber)
      updateSchoolRowspans(renderedSchoolCount)
    }

    const renderInitialSchoolBlocks = () => {
      const initialCount = Math.max(
        1,
        parsedSchools.length || 0,
        getSchoolCountFromChanges(data._fillerChanges),
        getSchoolCountFromChanges(data._reviewChanges)
      )

      for (let schoolNumber = 2; schoolNumber <= initialCount; schoolNumber += 1) {
        appendSchoolBlock(schoolNumber, parsedSchools[schoolNumber - 1] || null)
      }
      updateSchoolRowspans(initialCount)
      renderedSchoolCount = initialCount
    }

    const markEducationQuestionYes = () => {
      if (!questionDataCell) return
      const isYes = questionDataCell.dataset.filledValue === 'YES' || 
                    questionDataCell.querySelector('.yesno-check:checked')?.dataset.val === 'YES' || 
                    questionDataCell.textContent.trim() === 'YES'
      if (isYes) return

      // Tư vấn thêm học vấn thì chỉ ghi vào cột TƯ VẤN, không sửa cột XỬ LÝ.
      if (props.mode === 'review') {
        const noteCellId = questionDataCell.dataset.cellId?.replace('data_', 'note_')
        const noteCell = noteCellId ? paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`) : null
        if (noteCell) {
          noteCell.innerHTML = 'YES'
          noteCell.classList.remove('color-customer', 'color-filler')
          noteCell.classList.add('color-reviewer')
          changes.value[noteCell.dataset.cellId] = 'YES'
        }
        return
      }

      const originalFilled = questionDataCell.dataset.filled
      const originalFilledValue = questionDataCell.dataset.filledValue
      if (questionDataCell.classList.contains('yesno-cell')) {
        fillYesNoCell(questionDataCell, 'YES')
      } else {
        ensureYesNoCell(questionDataCell, 'YES')
      }
      questionDataCell.classList.remove('color-customer', 'color-reviewer')
      if (originalFilled !== undefined) questionDataCell.dataset.filled = originalFilled
      else delete questionDataCell.dataset.filled
      if (originalFilledValue !== undefined) questionDataCell.dataset.filledValue = originalFilledValue
      else delete questionDataCell.dataset.filledValue

      if (originalFilled === 'true' && originalFilledValue === 'YES') {
        questionDataCell.classList.add('color-customer')
        if (questionDataCell.dataset.cellId) delete changes.value[questionDataCell.dataset.cellId]
      } else {
        questionDataCell.classList.add('color-filler')
        if (questionDataCell.dataset.cellId) changes.value[questionDataCell.dataset.cellId] = 'YES'
      }
    }

    const injectEducationAddButton = () => {
      if (props.mode === 'view' || questionTd.querySelector('.education-add-btn')) return

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'education-add-btn'
      btn.textContent = '+'
      btn.title = props.mode === 'review' ? 'Tư vấn thêm học vấn' : 'Thêm học vấn'
      btn.style.cssText = [
        'float:right',
        'width:22px',
        'height:22px',
        'line-height:18px',
        'margin-left:8px',
        'border:1px solid #16a34a',
        'border-radius:4px',
        'background:#dcfce7',
        'color:#166534',
        'font-size:16px',
        'font-weight:700',
        'font-family:Arial,sans-serif',
        'cursor:pointer',
        'padding:0'
      ].join(';')

      btn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        appendSchoolBlock(renderedSchoolCount + 1)
        markEducationQuestionYes()
        emit('change', { ...changes.value })
        updateCorrectionCountDisplay()
      })

      questionTd.appendChild(btn)
      questionRow?.classList.add('education-question-row')
    }

    renderInitialSchoolBlocks()
    injectEducationAddButton()
  })()

  // ── DYNAMIC PREVIOUS EMPLOYMENT ──
  ;(() => {
    const normCellText = (td) => td.textContent.trim().replace(/\s+/g, ' ')
    const questionTd = allTds.find(td => {
      if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) return false
      return normCellText(td).startsWith('Were you previously employed')
    })
    const employerNameTd = allTds.find(td => normCellText(td).startsWith('Employer Name'))
    if (!questionTd || !employerNameTd) return

    const questionRow = questionTd.closest('tr')
    const questionDataCell = (() => {
      let next = questionTd.nextElementSibling
      while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
      return next || null
    })()

    // Lấy 14 dòng base của employment đầu tiên
    const startTr = employerNameTd.closest('tr')
    const jobTrs = []
    let curr = startTr
    for (let i = 0; i < 14; i++) {
      if (curr) jobTrs.push(curr)
      curr = curr.nextElementSibling
    }
    if (jobTrs.length !== 14) return

    // Xóa các block động cũ (nếu có)
    paperRef.value.querySelectorAll('tr.dynamic-job-block').forEach(tr => tr.remove())
    // Xóa dòng nút + cũ từ HTML tĩnh (nếu còn)
    paperRef.value.querySelectorAll('tr.prev-employment-add-row').forEach(tr => tr.remove())

    // Lưu rowspan gốc
    const baseRowspanTds = Array.from(startTr.querySelectorAll('td[rowspan]')).filter(td => {
      return parseInt(td.getAttribute('rowspan') || '0', 10) >= 14
    })
    baseRowspanTds.forEach(td => {
      if (!td.dataset.originalJobRowspan) {
        td.dataset.originalJobRowspan = td.getAttribute('rowspan') || '14'
      }
      td.setAttribute('rowspan', td.dataset.originalJobRowspan)
    })

    // Rowspan của ô số 33
    const sec33NumTd = questionRow ? Array.from(questionRow.querySelectorAll('td')).find(td => {
      const s = td.querySelector('strong')
      return s && s.textContent.trim() === '33'
    }) : null
    if (sec33NumTd && !sec33NumTd.dataset.originalSec33Rowspan) {
      sec33NumTd.dataset.originalSec33Rowspan = sec33NumTd.getAttribute('rowspan') || '16'
    }

    let renderedJobCount = 1

    const updateJobRowspans = (count) => {
      const extra = Math.max(0, count - 1) * 14
      baseRowspanTds.forEach(td => {
        const base = parseInt(td.dataset.originalJobRowspan || '14', 10)
        td.setAttribute('rowspan', base + extra)
      })
      if (sec33NumTd) {
        const baseSec33 = parseInt(sec33NumTd.dataset.originalSec33Rowspan || '16', 10)
        sec33NumTd.setAttribute('rowspan', baseSec33 + extra)
      }
    }

    const getInsertRef = () => {
      const dynamicRows = paperRef.value.querySelectorAll('tr.dynamic-job-block')
      return dynamicRows.length > 0 ? dynamicRows[dynamicRows.length - 1] : jobTrs[13]
    }

    const bindDynamicJobCell = (td) => {
      if (td.classList.contains('data-cell') && props.mode === 'create') {
        td.setAttribute('contenteditable', 'true')
        td.addEventListener('focus', function () {
          if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
            this.innerHTML = ''
          }
        })
        td.addEventListener('blur', function () {
          const val = this.innerHTML.trim()
          if (!val || val === '<br>') {
            // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
            // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
            const wasFilled = this.dataset.filled === 'true'
            this.innerHTML = this.dataset.originalHtml || ''
            this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
            if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
            else delete changes.value[this.dataset.cellId]
          } else if (this.dataset.filled && val === this.dataset.filledValue) {
            this.classList.remove('color-filler', 'modified', 'color-reviewer')
            this.classList.add('color-customer')
            delete changes.value[this.dataset.cellId]
          } else {
            this.classList.remove('color-customer', 'color-reviewer')
            this.classList.add('color-filler', 'modified')
            changes.value[this.dataset.cellId] = val
          }
          emit('change', { ...changes.value })
          updateCorrectionCountDisplay()
        })
      } else if (td.classList.contains('data-cell')) {
        td.setAttribute('contenteditable', 'false')
      }

      if (td.classList.contains('note-cell')) {
        td.setAttribute('contenteditable', props.mode === 'review' ? 'true' : 'false')
        if (props.mode === 'review') {
          td.addEventListener('input', function () {
            const val = this.innerHTML.trim()
            if (!val || val === '<br>') {
              this.classList.remove('color-reviewer')
              delete changes.value[this.dataset.cellId]
            } else {
              this.classList.remove('color-customer', 'color-filler')
              this.classList.add('color-reviewer')
              changes.value[this.dataset.cellId] = val
            }
            emit('change', { ...changes.value })
            updateCorrectionCountDisplay()
          })
        }
      }
    }

    const appendJobBlock = (jobNumber, job = null) => {
      const clonedTrs = jobTrs.map((tr, idx) => {
        const clone = tr.cloneNode(true)
        clone.classList.add('dynamic-job-block')

        if (idx === 0) {
          Array.from(clone.querySelectorAll('td[rowspan]')).forEach(td => clone.removeChild(td))
        }

        clone.querySelectorAll('td').forEach((td, cellIndex) => {
          if (!td.classList.contains('data-cell') && !td.classList.contains('note-cell')) return

          const baseCellId = td.dataset.cellId || `job_${idx}_${cellIndex}`
          td.dataset.cellId = `${baseCellId}_job_${jobNumber}_row_${idx}_cell_${cellIndex}`
          td.dataset.originalHtml = td.classList.contains('note-cell') ? '' : (td.dataset.originalHtml || '')
          td.innerHTML = td.dataset.originalHtml || ''
          delete td.dataset.filled
          delete td.dataset.filledValue
          delete td.dataset.submittedValue
    delete td.dataset.i130DateFormatted
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')

          bindDynamicJobCell(td)
        })

        return clone
      })

      // Fill data nếu có
      if (job) {
        const cleanAddr = (addr) => addr ? addr.replace(/.*Địa chỉ:\s*/i, '').trim() : ''
        const addrObj = splitAddr(cleanAddr(job.address))

        const fillField = (label, val, handler = null) => {
          if (!val) return
          for (let tr of clonedTrs) {
            const labelTd = Array.from(tr.querySelectorAll('td')).find(t => t.textContent.trim().startsWith(label))
            if (labelTd) {
              let next = labelTd.nextElementSibling
              while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
              if (next) {
                if (handler) handler(next, val)
                else {
                  const nv = normalizeText(val)
                  next.innerHTML = nv
                  next.dataset.filled = 'true'
                  next.dataset.filledValue = nv
                  next.classList.add('color-customer')
                }
              }
              break
            }
          }
        }

        fillField('Employer Name', job.name)
        fillField('Employer Street Address (Line 1)', addrObj.street)
        fillField('Employer Street Address (Line 2)', addrObj.line2 || ' ')
        fillField('City', addrObj.city)
        fillField('State/Province', addrObj.province)
        fillField('Country', firstValue(job.country, addrObj.country))
        fillField('Telephone Number', job.phone)
        fillField('Job title', job.title)
        fillField('Supervisor\u2019s Surname', job.managerName?.split(' ')[0])
        fillField('Supervisor\u2019s Given Names', job.managerName?.split(' ').slice(1).join(' '))
        fillField('Employment Date From', job.startDate, fillDateCells)
        fillField('Employment Date To', job.endDate, fillDateCells)
        fillField('Briefly describe your duties', job.desc)
      }

      let insertRef = getInsertRef()
      clonedTrs.forEach(tr => {
        insertRef.insertAdjacentElement('afterend', tr)
        insertRef = tr
      })

      renderedJobCount = Math.max(renderedJobCount, jobNumber)
      updateJobRowspans(renderedJobCount)
    }

    const markEmploymentQuestionYes = () => {
      if (!questionDataCell) return
      const isYes = questionDataCell.dataset.filledValue === 'YES' || 
                    questionDataCell.querySelector('.yesno-check:checked')?.dataset.val === 'YES' || 
                    questionDataCell.textContent.trim() === 'YES'
      if (isYes) return
      if (props.mode === 'review') {
        const noteCellId = questionDataCell.dataset.cellId?.replace('data_', 'note_')
        const noteCell = noteCellId ? paperRef.value?.querySelector(`[data-cell-id="${noteCellId}"]`) : null
        if (noteCell) {
          noteCell.innerHTML = 'YES'
          noteCell.classList.remove('color-customer', 'color-filler')
          noteCell.classList.add('color-reviewer')
          changes.value[noteCell.dataset.cellId] = 'YES'
        }
        return
      }
      if (questionDataCell.classList.contains('yesno-cell')) {
        fillYesNoCell(questionDataCell, 'YES')
      } else {
        ensureYesNoCell(questionDataCell, 'YES')
      }
    }

    // Nút [+] Thêm công việc
    const injectEmploymentAddButton = () => {
      if (props.mode === 'view' || questionTd.querySelector('.employment-add-btn')) return

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'employment-add-btn'
      btn.textContent = '+'
      btn.title = props.mode === 'review' ? 'Tư vấn thêm công việc' : 'Thêm công việc trước đây'
      btn.style.cssText = [
        'float:right',
        'width:22px',
        'height:22px',
        'line-height:18px',
        'margin-left:8px',
        'border:1px solid #6366f1',
        'border-radius:4px',
        'background:#eef2ff',
        'color:#4338ca',
        'font-size:16px',
        'font-weight:700',
        'font-family:Arial,sans-serif',
        'cursor:pointer',
        'padding:0'
      ].join(';')

      btn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        appendJobBlock(renderedJobCount + 1)
        markEmploymentQuestionYes()
        emit('change', { ...changes.value })
        updateCorrectionCountDisplay()
      })

      questionTd.appendChild(btn)
    }

    const getJobCountFromChanges = (changeMap) => {
      if (!changeMap) return 0
      return Object.keys(changeMap).reduce((max, key) => {
        const match = key.match(/_job_(\d+)_/)
        return match ? Math.max(max, parseInt(match[1], 10) || 0) : max
      }, 0)
    }

    const renderInitialJobBlocks = () => {
      const initialCount = Math.max(
        1,
        parsedPastJobs.length || 0,
        getJobCountFromChanges(data._fillerChanges),
        getJobCountFromChanges(data._reviewChanges)
      )

      for (let jobNumber = 2; jobNumber <= initialCount; jobNumber += 1) {
        appendJobBlock(jobNumber, parsedPastJobs[jobNumber - 1] || null)
      }
    }

    renderInitialJobBlocks()

    injectEmploymentAddButton()
  })();
  // ── DYNAMIC RELATIVES IN US ──
  if (parsedRelativesUS && parsedRelativesUS.length > 1) {
    const relTd = allTds.find(td => td.textContent.trim().startsWith('Do you have any immediate relatives, not including'))
    if (relTd) {
      const parentTr = relTd.closest('tr')
      const startTr = parentTr.nextElementSibling
      const relTrs = []
      let curr = startTr
      for (let i = 0; i < 4; i++) {
        if (curr) relTrs.push(curr)
        curr = curr.nextElementSibling
      }

      if (relTrs.length === 4) {
        let currentInsertRef = relTrs[3]

        for (let i = 1; i < parsedRelativesUS.length; i++) {
          const rel = parsedRelativesUS[i]

          const clonedTrs = relTrs.map((tr) => {
            const clone = tr.cloneNode(true)
            const resetCell = (td) => {
              if (td.classList.contains('color-customer') || td.dataset.filled === 'true' || td.dataset.filledValue) {
                td.innerHTML = ''
                td.dataset.filled = 'false'
                td.removeAttribute('data-filled-value')
                td.classList.remove('color-customer')
              }
            }
            clone.querySelectorAll('td').forEach(resetCell)
            return clone
          })

          const fillField = (label, val) => {
            if (!val) return
            for (let tr of clonedTrs) {
              const labelTd = Array.from(tr.querySelectorAll('td')).find(t => t.textContent.trim().startsWith(label))
              if (labelTd) {
                let next = labelTd.nextElementSibling
                while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
                if (next) {
                  next.innerHTML = val
                  next.dataset.filled = 'true'
                  next.dataset.filledValue = val
                  next.classList.add('color-customer')
                }
                break
              }
            }
          }

          fillField('Surnames', rel.surname?.toUpperCase())
          fillField('Given Names', rel.given?.toUpperCase())
          fillField('Relationship to You', rel.relation?.toUpperCase())
          fillField('Relative’s Status', rel.status?.toUpperCase())

          clonedTrs.forEach(tr => {
            currentInsertRef.insertAdjacentElement('afterend', tr)
            currentInsertRef = tr
          })
        }

        const rs5 = Array.from(parentTr.querySelectorAll('td[rowspan]')).find(td => td.getAttribute('rowspan') === '5')
        if (rs5) {
          rs5.setAttribute('rowspan', 5 + (parsedRelativesUS.length - 1) * 4)
        }
      }
    }
  }

  // ── DYNAMIC CHILDREN ──
  const numChildrenTd = allTds.find(td => td.textContent.trim().startsWith('Number of children'))
  if (numChildrenTd) {
    const numCellData = numChildrenTd.nextElementSibling
    // Tìm noteCell nếu đang ở review mode (chính là ô bên phải numCellData sau khi initInteractiveTable đã chạy)
    let numCellNote = null
    if (props.mode === 'review' && numCellData) {
       let curr = numCellData.nextSibling
       while(curr) {
         if (curr.nodeType === 1 && curr.classList.contains('note-cell')) {
           numCellNote = curr; break;
         }
         curr = curr.nextSibling
       }
    }

    const startTr = numChildrenTd.closest('tr').nextElementSibling
    const baseChildTrs = []
    let curr = startTr
    for (let i = 0; i < 8; i++) {
      if (curr) baseChildTrs.push(curr)
      curr = curr.nextElementSibling
    }

    if (baseChildTrs.length === 8) {
      const renderChildBlocks = (count) => {
        // Xóa các khối đã thêm trước đó thông qua class đánh dấu
        const oldDynamicTrs = paperRef.value.querySelectorAll('tr.dynamic-child-block')
        oldDynamicTrs.forEach(tr => tr.remove())
        
        let currentInsertRef = baseChildTrs[7]
        
        // Thêm các khối mới để tổng số block = count (đã có sẵn 1 block base)
        const toAdd = count - 1
        for (let i = 0; i < toAdd; i++) {
          const childData = parsedChildren && parsedChildren[i + 1] ? parsedChildren[i + 1] : null
          
          const clonedTrs = baseChildTrs.map((tr, rowIndex) => {
            const clone = tr.cloneNode(true)
            clone.classList.add('dynamic-child-block') // Đánh dấu để dễ dàng xóa
            
            const resetCell = (td, cellIndex) => {
              if (td.classList.contains('note-cell')) {
                td.innerHTML = ''
              } else if (td.classList.contains('data-cell')) {
                td.innerHTML = td.dataset.originalHtml || ''
              }
              
              if (td.classList.contains('data-cell') || td.classList.contains('note-cell')) {
                const baseCellId = td.dataset.cellId || 'unknown'
                const childNumber = i + 2 // block gốc là con thứ 1, clone đầu tiên là con thứ 2
                td.dataset.cellId = `${baseCellId}_child_${childNumber}_row_${rowIndex}_cell_${cellIndex}`
                td.dataset.filled = 'false'
                td.removeAttribute('data-filled-value')
                td.classList.remove('color-customer', 'color-filler', 'color-reviewer', 'modified')
                 
                 if (td.classList.contains('data-cell') && props.mode === 'create') {
                   td.setAttribute('contenteditable', 'true')
                   td.addEventListener('focus', function () {
                     if (this.innerHTML === (this.dataset.originalHtml || '') && !this.dataset.filled) {
                       this.innerHTML = ''
                     }
                   })
                   td.addEventListener('blur', function () {
                     const val = this.innerHTML.trim()
                     if (!val || val === '<br>') {
                       // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
                       // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
                       const wasFilled = this.dataset.filled === 'true'
                       this.innerHTML = this.dataset.originalHtml || ''
                       this.classList.remove('color-filler', 'color-customer', 'modified')
                       if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
                       else delete changes.value[this.dataset.cellId]
                       emit('change', changes.value)
                     } else {
                       if (this.dataset.filled && val === this.dataset.filledValue) {
                         this.classList.remove('color-filler', 'modified')
                         this.classList.add('color-customer')
                         delete changes.value[this.dataset.cellId]
                         emit('change', changes.value)
                       } else {
                         this.classList.remove('color-customer')
                         this.classList.add('color-filler', 'modified')
                         changes.value[this.dataset.cellId] = val
                         emit('change', changes.value)
                       }
                     }
                   })
                 }
  
                 if (td.classList.contains('note-cell') && props.mode === 'review') {
                   td.setAttribute('contenteditable', 'true')
                   td.addEventListener('blur', function() {
                     const val = this.innerHTML.trim()
                     if (val === '' || val === '<br>') {
                       this.classList.remove('color-reviewer')
                       delete changes.value[this.dataset.cellId]
                     } else {
                       this.classList.remove('color-customer', 'color-filler')
                       this.classList.add('color-reviewer')
                       changes.value[this.dataset.cellId] = val
                     }
                     emit('change', { ...changes.value })
                   })
                 }
              }
            }
            clone.querySelectorAll('td').forEach(resetCell)
            return clone
          })

          const fillField = (label, val, handler = null) => {
            if (!val) return
            for (let tr of clonedTrs) {
              const labelTd = Array.from(tr.querySelectorAll('td')).find(t => t.textContent.trim().startsWith(label))
              if (labelTd) {
                let next = labelTd.nextElementSibling
                while (next && !next.classList.contains('data-cell')) next = next.nextElementSibling
                if (next) {
                  if (handler) handler(next, val)
                  else {
                    next.innerHTML = val
                    next.dataset.filled = 'true'
                    next.dataset.filledValue = val
                    next.classList.add('color-customer')
                  }
                }
                break
              }
            }
          }

          if (childData) {
            fillField('Surname', childData.surname)
            fillField('Given name', childData.givenName)
            fillField('Date of birth', childData.birthDate, fillDateCells)
            fillField('City', childData.city)
            fillField('State/Province', childData.state)
            fillField('Country/Region', childData.country)
            fillField('Is this child traveling to the US with you?', childData.travel)
            fillField('Is this child traveling to the US at a later date', childData.join)
          }

          clonedTrs.forEach(tr => {
            currentInsertRef.insertAdjacentElement('afterend', tr)
            currentInsertRef = tr
          })
        }
        
        // Cập nhật rowspan
        const prevRow = numChildrenTd.closest('tr').previousElementSibling
        if (prevRow) {
          const allRs10 = Array.from(prevRow.querySelectorAll('td[rowspan]')).filter(td => parseInt(td.getAttribute('rowspan')) >= 10)
          allRs10.forEach(td => {
             td.setAttribute('rowspan', 10 + Math.max(0, count - 1) * 8)
          })
        }
      }

      // Khởi tạo ban đầu
      // Ưu tiên số lượng con từ dữ liệu gốc, sau đó lấy thêm từ ô Number of children
      // và cả _fillerChanges. Trường hợp bên xử lý sửa số lượng thành 2 nhưng DB gốc
      // chưa có numberOfChildren = 2 thì reviewer vẫn phải render đủ block con trước
      // khi áp dụng fillerChanges.
      const parseChildCount = (val) => {
        const n = parseInt(String(val || '').replace(/[^0-9]/g, ''), 10)
        return !isNaN(n) && n > 0 ? n : 0
      }

      let initialCount = parsedChildren ? parsedChildren.length : 0
      if (numCellData) {
         const countFromCell = parseChildCount(numCellData.innerText)
         if (countFromCell > initialCount) initialCount = countFromCell

         const fillerCountValue = data._fillerChanges?.[numCellData.dataset.cellId]
         const countFromFillerChanges = parseChildCount(fillerCountValue)
         if (countFromFillerChanges > initialCount) initialCount = countFromFillerChanges
      }
      if (initialCount > 1) {
        renderChildBlocks(initialCount)
      }

      // Lắng nghe sự kiện thay đổi số lượng
      const onChildCountChange = (e) => {
         const val = parseInt(e.target.innerText.trim())
         if (!isNaN(val) && val >= 1) {
            renderChildBlocks(val)
         } else {
            renderChildBlocks(1) // Ít nhất 1 block
         }
      }
      
      if (numCellData && props.mode === 'create') {
        numCellData.addEventListener('input', onChildCountChange)
      }
      if (numCellNote && props.mode === 'review') {
        numCellNote.addEventListener('input', onChildCountChange)
      }
    }
  }

  // ── HEADER INFO (Tên đương đơn, Số ID) ──
  const tables = paperRef.value.querySelectorAll('table')
  if (tables.length >= 2) {
    const headerTable = tables[1]
    const headerTds = headerTable.querySelectorAll('tbody tr:first-child td')
    if (headerTds.length >= 2) {
      // Gán cellId ổn định cho các ô header để lưu/khôi phục sửa đổi đúng vị trí.
      // ds160.html: td[0] = Tên đương đơn, td[1] = Số ID, td[2] = MSHS.
      if (headerTds[0] && !headerTds[0].dataset.cellId) headerTds[0].dataset.cellId = 'header_A_name'
      if (headerTds[1] && !headerTds[1].dataset.cellId) headerTds[1].dataset.cellId = 'header_A_id'
      if (headerTds[2] && !headerTds[2].dataset.cellId) headerTds[2].dataset.cellId = 'header_A_mshs'

      const headerName = isI130A ? firstValue(data.beneficiaryFullName, data.customerName, data.spouseFullName, data.spouseName, data.fullName) : data.fullName
      if (headerName) {
        headerTds[0].innerHTML = headerName
        headerTds[0].dataset.filled = 'true'
        headerTds[0].dataset.filledValue = headerName
        headerTds[0].classList.add('color-customer')
      }
      // Người dùng yêu cầu để trống Số ID để nhập tay
      // if (data.idNumber) {
      //   headerTds[1].innerHTML = data.idNumber
      //   headerTds[1].dataset.filled = 'true'
      //   headerTds[1].dataset.filledValue = data.idNumber
      //   headerTds[1].classList.add('color-customer')
      // }
    }

    // Làm cho toàn bộ các ô trong Header Table (Phần A) có thể sửa được
    let headerCellId = 0
    const SKIP_HEADER_IDS = ['header-dien-don', 'header-kiem-tra', 'header-submit-cell']
    headerTable.querySelectorAll('tbody td').forEach(td => {
      // Bỏ qua các ô chứa chữ in đậm (là tiêu đề cột)
      if (td.querySelector('strong')) return
      // Bỏ qua các ô chứa controls được inject (dropdown, nút submit)
      if (SKIP_HEADER_IDS.includes(td.id)) return

      td.classList.add('data-cell')
      if (!td.dataset.cellId) {
        td.dataset.cellId = 'header_A_' + headerCellId++
      }
      td.dataset.originalHtml = td.innerHTML

      // Phân quyền sửa:
      // - Xử lý (create): sửa các ô header thông thường.
      // - Tư vấn (review): chỉ sửa Số ID và MSHS theo yêu cầu.
      // - View: chỉ xem.
      const isReviewerEditableHeader = props.mode === 'review' && ['header_A_id', 'header_A_mshs'].includes(td.dataset.cellId)
      const isEditableHeader = props.mode === 'create' || isReviewerEditableHeader

      if (!isEditableHeader || props.mode === 'view') {
        td.setAttribute('contenteditable', 'false')
      } else {
        td.setAttribute('contenteditable', 'true')
        td.addEventListener('focus', function () {
          // Lưu lại nội dung thật sự lúc focus để blur có thể so sánh
          // đúng "đã sửa hay chưa" — tránh việc chỉ click vào rồi click ra
          // (không gõ gì) mà vẫn bị tính là đã thay đổi.
          this.dataset.valueAtFocus = this.innerHTML
          if (this.innerHTML === this.dataset.originalHtml && !this.dataset.filled) {
            this.innerHTML = ''
          }
        })
        td.addEventListener('blur', function () {
          const val = this.innerHTML.trim()
          if (val === (this.dataset.valueAtFocus || '').trim()) return
          const isReviewerEdit = props.mode === 'review'
          const sourceClass = isReviewerEdit ? 'color-reviewer' : 'color-filler'

          if (!val || val === '<br>') {
            // Ô đã autofill từ data khách hàng mà người xử lý xoá đi: phải ghi marker __CLEARED__.
            // Chỉ xoá key thì lần mở lại autofill đổ data cũ về, và mục "Đã kiểm tra" hiện lại ô vừa xoá.
            const wasFilled = this.dataset.filled === 'true'
            this.innerHTML = this.dataset.originalHtml
            this.classList.remove('color-filler', 'color-customer', 'modified', 'color-reviewer')
            if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
            else delete changes.value[this.dataset.cellId]
          } else {
            if (this.dataset.filled && val === this.dataset.filledValue) {
              this.classList.remove('color-filler', 'modified', 'color-reviewer')
              this.classList.add('color-customer')
              delete changes.value[this.dataset.cellId]
            } else {
              this.classList.remove('color-customer', 'color-filler', 'color-reviewer')
              this.classList.add(sourceClass, 'modified')
              changes.value[this.dataset.cellId] = val
            }
          }
          emit('change', { ...changes.value })
          updateCorrectionCountDisplay()
        })
      }
    })
  }

  // Helper lấy change theo cellId hiện tại.
  // Có fallback cho dữ liệu cũ từng lưu với cellId random dạng:
  // data_x_child_0_ab12c / note_x_child_0_ab12c.
  // Tra ve dung KEY trong changeMap ma mot cellId se doc toi (di qua ca cac nhanh migration
  // ben duoi), de biet key nao da thuc su duoc mot o tren phieu xu ly.
  const getChangeKeyByCellId = (changeMap, cellId) => {
    if (!changeMap || !cellId) return undefined

    // MIGRATION: Dữ liệu cũ trước khi có cột MSHS thường được lưu tạm vào ô Điền đơn (header_A_2)
    if (cellId === 'header_A_id') {
      if (changeMap['header_A_id'] !== undefined) return 'header_A_id'
      if (changeMap['header_A_1'] !== undefined) return 'header_A_1'
    }
    if (cellId === 'header_A_mshs') {
      if (changeMap['header_A_mshs'] !== undefined) return 'header_A_mshs'
      if (changeMap['header_A_2'] !== undefined && /^[0-9A-Z]+$/.test(String(changeMap['header_A_2']).trim())) {
        return 'header_A_2'
      }
    }
    if (cellId === 'header_A_2') {
      if (changeMap['header_A_mshs'] === undefined && changeMap['header_A_2'] !== undefined && /^[0-9A-Z]+$/.test(changeMap['header_A_2'].trim())) {
        return undefined // Đã chuyển sang hiển thị ở ô MSHS
      }
    }

    if (changeMap[cellId] !== undefined) return cellId

    const dynamicChildMatch = cellId.match(/^(.*)_child_(\d+)_row_\d+_cell_\d+$/)
    if (!dynamicChildMatch) return undefined

    const baseCellId = dynamicChildMatch[1]
    const childNumber = parseInt(dynamicChildMatch[2], 10)
    const legacyChildIndex = childNumber - 2
    if (legacyChildIndex < 0) return undefined

    const legacyPrefix = `${baseCellId}_child_${legacyChildIndex}_`
    return Object.keys(changeMap).find(key => key.startsWith(legacyPrefix))
  }

  const getChangeByCellId = (changeMap, cellId) => {
    const matchedKey = getChangeKeyByCellId(changeMap, cellId)
    return matchedKey === undefined ? undefined : changeMap[matchedKey]
  }

  const normalizeChangeCompareValue = (value = '') => String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const getRenderedCompareValue = (cell) => normalizeChangeCompareValue(
    cell?.dataset?.heightPlain || cell?.dataset?.filledValue || cell?.innerHTML || ''
  )

  const getPairedCell = (cell, fromPrefix, toPrefix) => {
    const cellId = cell?.dataset?.cellId || ''
    if (!cellId.startsWith(fromPrefix)) return null
    return paperRef.value?.querySelector(`[data-cell-id="${cellId.replace(fromPrefix, toPrefix)}"]`) || null
  }

  // ── ÁP DỤNG FILLER CHANGES (khi Reviewer mở phiếu) ──
  const fillerChanges = data._fillerChanges
  if (fillerChanges && Object.keys(fillerChanges).length > 0 && paperRef.value) {
    // Key nào đã được một ô trên phiếu xử lý, kể cả ô cố ý bỏ vì trùng dữ liệu gốc và key cũ
    // đã migrate sang cell-id mới. Dùng để phân biệt với key không khớp ô nào, ở cuối hàm.
    const handledFillerKeys = new Set()
    paperRef.value.querySelectorAll('.data-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const legacyCellId = td.dataset.legacyCellId
      const fillerValue = getChangeByCellId(fillerChanges, cellId) ?? getChangeByCellId(fillerChanges, legacyCellId)
      if (cellId && fillerValue !== undefined) {
        const matchedKey = getChangeKeyByCellId(fillerChanges, cellId) ?? getChangeKeyByCellId(fillerChanges, legacyCellId)
        if (matchedKey) handledFillerKeys.add(matchedKey)
        handledFillerKeys.add(cellId)
        if (legacyCellId) handledFillerKeys.add(legacyCellId)
        if (fillerValue !== '__CLEARED__') {
          const currentAutoFilledValue = getRenderedCompareValue(td)
          const incomingFillerValue = normalizeChangeCompareValue(fillerValue)
          if (currentAutoFilledValue && incomingFillerValue && currentAutoFilledValue === incomingFillerValue) {
            td.classList.remove('color-filler', 'color-reviewer')
            td.classList.add('color-customer')
            delete changes.value[cellId]
            if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
            return
          }
        }

        // Xử lý ô đã bị filler xóa có chủ ý
        if (fillerValue === '__CLEARED__') {
          // Filler/xử lý đã xóa dữ liệu có chủ ý.
          // Khi reviewer/tư vấn mở phiếu, giữ ô trống thay vì hiện placeholder __CLEARED__ hoặc dữ liệu gốc.
          clearCellContent(td)
          clearHeightSplitCell(td)
          td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
          // KHONG xoa dataset.filled/filledValue: o nay van co du lieu khach phia sau, chi la
          // dang bi an di. Neu xoa, lan sau nguoi dung chi can click vao o roi click ra la blur
          // handler thay o "trong va chua tung co data" -> delete changes[cellId], tuc xoa luon
          // marker __CLEARED__ khoi ban nhap, va du lieu goc song lai o lan tai trang sau.
          // Giu lai thi blur van ghi __CLEARED__, con khi go lai dung gia tri goc thi
          // val === filledValue se tu nhan dien la du lieu khach va go marker dung cach.
        } else if (td.classList.contains('yesno-cell')) {
          fillYesNoCell(td, fillerValue)
          td.classList.remove('color-customer')
          td.classList.add('color-filler')
        } else if (td.classList.contains('immigrant-status-cell')) {
          fillImmigrantStatusCell(td, fillerValue)
          td.classList.remove('color-customer')
          td.classList.add('color-filler')
        } else if (td.classList.contains('spouse-address-option-cell')) {
          fillSpouseAddressOptionCell(td, fillerValue, 'color-filler')
        } else if (isHeightValueCell(td)) {
          const heightVal = fillHeightSplitCell(td, fillerValue, 'color-filler')
          if (!heightVal) {
            td.innerHTML = fillerValue
            td.classList.remove('color-customer', 'color-reviewer')
            td.classList.add('color-filler', 'modified')
          }
        } else {
          td.innerHTML = fillerValue
          if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}$/.test(String(fillerValue || '').trim())) td.dataset.i130DateFormatted = 'true'
          td.classList.remove('color-customer', 'color-reviewer')
          td.classList.add('color-filler') // Màu xanh = do Filler tự điền
        }
        if (props.mode === 'create') {
          changes.value[cellId] = td.dataset.heightPlain || fillerValue
          if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
        }
      }
    })
    // AN TOÀN DỮ LIỆU: key nào trong _fillerChanges không khớp ô nào đang có trên phiếu
    // (block chưa render, mục bị ẩn theo diện hồ sơ, phiếu tải thiếu dữ liệu nguồn...) thì vẫn
    // phải giữ lại trong changes. resetTable() ở đầu autoFillData đã xoá sạch changes, nên key
    // không được nạp lại ở đây sẽ bị lần emit cuối ghi đè khỏi bản nháp = mất vĩnh viễn.
    // Key đã có ô xử lý nằm trong handledFillerKeys nên không bị dựng sống lại.
    if (props.mode === 'create') {
      Object.keys(fillerChanges).forEach(key => {
        if (handledFillerKeys.has(key)) return
        if (changes.value[key] !== undefined) return
        changes.value[key] = fillerChanges[key]
      })
      emit('change', { ...changes.value })
    }
  }

  if (isK1) {
    renderK1SpecifyControls(data._fillerChanges, data._reviewChanges)
    renderK1PayerControls(getK1PayerDefaultValue(data), data._fillerChanges, data._reviewChanges)
  }

  // ── ÁP DỤNG REVIEW CHANGES (khi mở lại phiếu đã kiểm tra) ──
  const reviewChanges = data._reviewChanges
  if (reviewChanges && Object.keys(reviewChanges).length > 0 && paperRef.value) {
    // 1. Áp dụng cho note-cell (cột B đỏ) từ Database
    paperRef.value.querySelectorAll('.note-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const legacyCellId = td.dataset.legacyCellId
      const reviewValue = getChangeByCellId(reviewChanges, cellId) ?? getChangeByCellId(reviewChanges, legacyCellId)
      if (cellId && reviewValue !== undefined) {
        const pairedDataCell = getPairedCell(td, 'note_', 'data_')
        const submittedValue = getRenderedCompareValue(pairedDataCell) || normalizeChangeCompareValue(td.dataset.submittedValue)
        const incomingReviewValue = normalizeChangeCompareValue(reviewValue)
        if (submittedValue && incomingReviewValue && submittedValue === incomingReviewValue) {
          delete changes.value[cellId]
          if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
          return
        }

        if (td.classList.contains('yesno-cell')) {
          // Ô YES/NO ở cột TƯ VẤN đã được chuyển thành checkbox ở bước "Convert matching
          // note-cells". Ghi đè innerHTML bằng text sẽ xoá mất checkbox trong khi class
          // 'yesno-cell' vẫn còn -> getCellPrintableValue() đọc ra rỗng và "Tổng sửa" đếm
          // THIẾU đúng ô tư vấn vừa sửa. Phải tick lại checkbox như nhánh data-cell ở dưới.
          const upperReviewValue = String(reviewValue || '').toUpperCase().trim()
          if (upperReviewValue === 'YES' || upperReviewValue === 'NO') {
            fillYesNoCell(td, upperReviewValue)
          } else {
            // Giá trị cũ không phải YES/NO: hiện text thuần và bỏ luôn class yesno-cell
            // để bộ đếm đọc được nội dung.
            td.classList.remove('yesno-cell')
            delete td.dataset.yesno
            td.innerHTML = reviewValue
          }
          td.classList.remove('color-customer', 'color-filler')
          td.classList.add('color-reviewer')
        } else if (td.classList.contains('spouse-address-option-cell')) {
          fillSpouseAddressOptionCell(td, reviewValue, 'color-reviewer')
        } else if (td.classList.contains('immigrant-status-cell')) {
          fillImmigrantStatusCell(td, reviewValue)
          td.classList.remove('color-customer', 'color-filler')
          td.classList.add('color-reviewer')
        } else if (isHeightValueCell(td)) {
          const heightVal = fillHeightSplitCell(td, reviewValue, 'color-reviewer')
          if (!heightVal) {
            td.innerHTML = reviewValue
            td.classList.remove('color-customer', 'color-filler')
            td.classList.add('color-reviewer')
          }
        } else {
          td.innerHTML = reviewValue
          td.classList.remove('color-customer', 'color-filler')
          td.classList.add('color-reviewer') // LUÔN HIỆN MÀU ĐỎ KHI XEM LẠI
        }
        // Lưu vào bộ nhớ local của component để đồng bộ
        changes.value[cellId] = td.dataset.heightPlain || reviewValue
        if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
      }
    })
    // 2. Áp dụng cho cả data-cell (ví dụ: header cells mà Reviewer đã sửa)
    paperRef.value.querySelectorAll('.data-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const legacyCellId = td.dataset.legacyCellId
      const reviewValue = getChangeByCellId(reviewChanges, cellId) ?? getChangeByCellId(reviewChanges, legacyCellId)
      if (cellId && reviewValue !== undefined) {
        // Bản ghi cũ bị nhiễm: các key data_* của người điền đơn từng bị chép sang review_changes.
        // Key nào trùng khít _fillerChanges thì không phải tư vấn sửa -> không tô đỏ sang cột
        // TƯ VẤN và không tính vào "Tổng sửa".
        const fillerValueForCell = getChangeByCellId(fillerChanges, cellId) ?? getChangeByCellId(fillerChanges, legacyCellId)
        if (
          fillerValueForCell !== undefined &&
          normalizeChangeCompareValue(fillerValueForCell) === normalizeChangeCompareValue(reviewValue)
        ) {
          delete changes.value[cellId]
          if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
          return
        }

        const pairedNoteCell = getPairedCell(td, 'data_', 'note_')
        const shouldRenderOnNoteCell = pairedNoteCell && !['header_A_id', 'header_A_mshs'].includes(cellId)
        const targetCell = shouldRenderOnNoteCell ? pairedNoteCell : td
        const submittedValue = getRenderedCompareValue(td)
        const incomingReviewValue = normalizeChangeCompareValue(reviewValue)

        if (submittedValue && incomingReviewValue && submittedValue === incomingReviewValue) {
          delete changes.value[cellId]
          if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
          return
        }

        if (targetCell.classList.contains('yesno-cell')) {
          fillYesNoCell(targetCell, reviewValue)
          targetCell.classList.remove('color-customer', 'color-filler')
          targetCell.classList.add('color-reviewer')
        } else if (targetCell.classList.contains('immigrant-status-cell')) {
          fillImmigrantStatusCell(targetCell, reviewValue)
          targetCell.classList.remove('color-customer', 'color-filler')
          targetCell.classList.add('color-reviewer')
        } else if (targetCell.classList.contains('spouse-address-option-cell')) {
          fillSpouseAddressOptionCell(targetCell, reviewValue, 'color-reviewer')
        } else if (isHeightValueCell(targetCell)) {
          const heightVal = fillHeightSplitCell(targetCell, reviewValue, 'color-reviewer')
          if (!heightVal) {
            targetCell.innerHTML = reviewValue
            targetCell.classList.remove('color-customer', 'color-filler')
            targetCell.classList.add('color-reviewer')
          }
        } else {
          targetCell.innerHTML = reviewValue
          targetCell.classList.remove('color-customer', 'color-filler')
          targetCell.classList.add('color-reviewer')
        }
        const targetCellId = targetCell.dataset.cellId || cellId
        changes.value[targetCellId] = targetCell.dataset.heightPlain || reviewValue
        if (targetCellId !== cellId) delete changes.value[cellId]
        if (legacyCellId && legacyCellId !== cellId) delete changes.value[legacyCellId]
      }
    })
    emit('change', { ...changes.value })
  }

  if (isK1) {
    renderK1SpecifyControls(data._fillerChanges, data._reviewChanges)
    renderK1PayerControls(getK1PayerDefaultValue(data), data._fillerChanges, data._reviewChanges)
  }

  // Chạy lần cuối sau khi áp dụng _fillerChanges/_reviewChanges
  // để Provider luôn khớp với toàn bộ link trong Identifier.
  if (typeof forceFillPrimarySocialMediaRows === 'function') {
    forceFillPrimarySocialMediaRows()
  }

  // Cập nhật tổng số mục đã sửa sau khi áp dụng tất cả dữ liệu
  normalizeRenderedEmailCellsToLowercase()
  syncUSCitizenInfoSectionVisibility(data)
  syncSiblingPetitionSectionVisibility(data)
  reconcileLiveAtCurrentMailingAddressCell()
  updateCorrectionCountDisplay()

  if (dynamicSections && typeof dynamicSections.sortEmploymentBlocksByDate === 'function') {
    dynamicSections.sortEmploymentBlocksByDate()
  }
  if (dynamicSections && typeof dynamicSections.sortOldAddressBlocksByDate === 'function') {
    dynamicSections.sortOldAddressBlocksByDate()
  }
  sortAppendixJobSections()
}
</script>
 
