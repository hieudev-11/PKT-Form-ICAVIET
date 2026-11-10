<template>
  <div class="word-paper-container n600-word-paper-container">
    <div ref="paperRef" v-html="rawHtml"></div>
  </div>
</template>

<script setup>
import { clearCellContent, recordClearedChange } from '../lib/cell-clear.js'
import { buildAuditSnapshot } from '../lib/audit-snapshot.js'
import { ref, onMounted, watch, nextTick } from 'vue'
import { appendSignatureBlockToClone } from '../lib/signatures.js'
import { appendCommentsToClone } from '../lib/pdf-comments.js'
import { buildN600Mappings, getN600HeaderValues, getN600ResidencePeriodRowCount } from '../forms/n600-mappings.js'

const props = defineProps({
  mode: String,
  formType: String,
  customerData: Object,
  currentUser: Object,
  reviewers: Array,
  selectedReviewer: [String, Number],
  logCompare: { type: Boolean, default: false },
  signatures: { type: Object, default: null },
  // Comment theo dòng của phiếu đã kiểm tra, chỉ dùng khi xuất PDF.
  comments: { type: Array, default: () => [] }
})

const emit = defineEmits(['change', 'submit-form', 'update:selectedReviewer', 'manual-save'])

const paperRef = ref(null)
const rawHtml = ref('')
const changes = ref({})
defineExpose({
  exportPdf,
  getAuditSnapshot
})

onMounted(() => { loadFormHtml() })
watch(() => props.formType, () => { loadFormHtml() })
watch(() => props.customerData, (d) => {
  if (d) { 
    nextTick(() => {
      convertYesNoCells()
      convertImmigrantStatusCells()
      autoFillData(d)
      injectHeaderControls()
      if (props.mode === 'review' || props.mode === 'view') copyDataToNoteForReviewer()
      convertYesNoCells()
      convertImmigrantStatusCells()
      lockDataCellControlsForReview()
    }) 
  }
  else { nextTick(() => { resetTable(true) }) }
})
watch([() => props.selectedReviewer, () => props.reviewers, () => props.currentUser], () => {
  nextTick(() => injectHeaderControls())
})

async function loadFormHtml() {
  if (!props.formType) return
  try {
    const res = await fetch('/forms/n600.html')
    if (!res.ok) {
      rawHtml.value = `<div style="padding:40px;text-align:center;color:#94a3b8;">
        Không tìm thấy mẫu phiếu: <strong>n600.html</strong><br>
        Hãy đặt file HTML vào thư mục <code>public/forms/</code>
      </div>`
      return
    }
    rawHtml.value = await res.text()
    await nextTick()
    initInteractiveTable()
    makeHeaderCellsEditable()
    convertYesNoCells()
    convertImmigrantStatusCells()
    if (props.customerData) {
      autoFillData(props.customerData)
      injectHeaderControls()
      if (props.mode === 'review' || props.mode === 'view') copyDataToNoteForReviewer()
      convertYesNoCells()
      convertImmigrantStatusCells()
      lockDataCellControlsForReview()
    } else {
      injectHeaderControls()
      lockDataCellControlsForReview()
    }
  } catch (e) {
    console.error('Lỗi tải form:', e)
    rawHtml.value = '<div style="color:red;padding:40px;">Lỗi tải form!</div>'
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

  // ── Ô Submit: nút Save + Submit/Hoàn Tất
  if (submitCell) {
    const makeButton = (text, bg, hoverBg) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = text
      btn.style.cssText = `padding:6px 10px;background:${bg};color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex:1;min-width:0;`
      btn.addEventListener('mouseenter', () => { btn.style.background = hoverBg })
      btn.addEventListener('mouseleave', () => { btn.style.background = bg })
      return btn
    }

    if ((props.mode === 'create' || props.mode === 'review') && !submitCell.querySelector('.pkt-header-actions')) {
      const wrap = document.createElement('div')
      wrap.className = 'pkt-header-actions'
      wrap.style.cssText = 'display:flex;gap:6px;align-items:center;width:100%;'

      const saveBtn = makeButton('💾 Save', '#0ea5e9', '#0284c7')
      saveBtn.title = 'Lưu nháp ngay, auto save vẫn hoạt động song song'
      saveBtn.addEventListener('click', () => emit('manual-save'))
      wrap.appendChild(saveBtn)

      if (props.mode === 'create') {
        const submitBtn = makeButton('✅ Submit Phiếu', '#6366f1', '#818cf8')
        submitBtn.addEventListener('click', () => {
          const reviewer = resolveSelectedReviewer()
          emit('submit-form', reviewer)
        })
        wrap.appendChild(submitBtn)
      } else if (props.mode === 'review') {
        const completeBtn = makeButton('✅ Hoàn Tất KT', '#16a34a', '#15803d')
        completeBtn.addEventListener('click', () => emit('submit-form', { complete: true }))
        wrap.appendChild(completeBtn)
      }

      submitCell.innerHTML = ''
      submitCell.appendChild(wrap)
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

function applyPrintableValue(cell, value, sourceClass = '') {
  if (!cell || !value || value === '<br>') return
  if (cell.classList.contains('yesno-cell')) {
    cell.querySelectorAll('.yesno-check').forEach(chk => {
      const checked = chk.dataset.val === value
      chk.checked = checked
      if (checked) chk.setAttribute('checked', 'checked')
      else chk.removeAttribute('checked')
    })
  } else {
    cell.innerHTML = value
  }
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  if (sourceClass) cell.classList.add(sourceClass)
}

function restoreProcessLayoutForPdf(root) {
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

  // Giữ nguyên checkbox HTML như giao diện. Chỉ đồng bộ trạng thái checked/disabled.
  clone.querySelectorAll('.yesno-check, .immigrant-status-check').forEach(chk => {
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

function safePdfName(value) {
  return String(value || 'N600')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'N600'
}

function getPdfRowBreakpoints(root) {
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


function getAuditSnapshot() {
  return buildAuditSnapshot(paperRef.value)
}

async function exportPdf() {
  if (!paperRef.value) return false

  try {
    const baseName = safePdfName(props.customerData?.fullName || props.customerData?.customerName || 'N600')

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
    .yesno-check, .immigrant-status-check {
      width: 13px; height: 13px; margin: 0 3px 0 0; vertical-align: middle;
      accent-color: #9a3b0c;
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

function setColGroupWidth(cols, start, end, totalWidth) {
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

function normalizeChecklistColgroup(colgroup, hasConsultColumn) {
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

// Gắn sự kiện focus/blur cho 1 ô data-cell ở chế độ "create" (điền đơn). Tách riêng khỏi
// initInteractiveTable để tái sử dụng cho các dòng được thêm động sau này (vd: nút "+ Thêm giai
// đoạn cư trú" ở mục Part D), không cần lặp lại toàn bộ vòng lặp quét bảng.
function attachDataCellEditingHandlers(td) {
  td.addEventListener('focus', function () {
    if (this.innerHTML === this.dataset.originalHtml && !this.dataset.filled) {
      this.innerHTML = ''
    }
  })

  td.addEventListener('blur', function () {
    const val = this.innerHTML.trim()
    if (!val || val === '<br>') {
      this.innerHTML = this.dataset.originalHtml
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
        changes.value[this.dataset.cellId] = val
      }
    }
    emit('change', { ...changes.value })
  })
}

// Gắn sự kiện input cho 1 ô note-cell (cột Tư vấn) ở chế độ "review". Tách riêng tương tự
// attachDataCellEditingHandlers, dùng cho cả ô có sẵn trong template lẫn ô được thêm động.
function attachNoteCellEditingHandlers(reviewCell) {
  reviewCell.addEventListener('input', function () {
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
    updateCorrectionCountDisplay()
  })
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
  const thead = checklistTable.querySelector('thead') || checklistTable.querySelector('tr.header')
  if (thead) {
    const ths = thead.querySelectorAll('th')
    ths.forEach(th => {
      const text = th.textContent.trim().toUpperCase()
      if (text === 'NOTE') {
        th.style.display = 'none'
      }
      if ((text === 'XỬ LÝ' || text === 'THÔNG TIN') && (props.mode === 'review' || props.mode === 'view')) {
        if (props.logCompare) {
          th.innerHTML = '<strong>DATA GỐC</strong>'
          const th2 = th.cloneNode(true)
          th2.innerHTML = '<strong>ĐÃ SỬA</strong>'
          th.parentNode.insertBefore(th2, th.nextSibling)
        } else {
          th.innerHTML = '<strong>XỬ LÝ</strong>'
          const th2 = th.cloneNode(true)
          th2.innerHTML = '<strong>TƯ VẤN</strong>'
          th.parentNode.insertBefore(th2, th.nextSibling)
        }
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

  const rows = tbody.querySelectorAll('tr:not(.header)')
  let rowspans = new Array(26).fill(0)
  let cellId = 0

  rows.forEach(row => {
    let colIdx = 0
    let dataCellsToClone = []

    Array.from(row.children).forEach(td => {
      while (colIdx < 26 && rowspans[colIdx] > 0) { rowspans[colIdx]--; colIdx++ }

      const colspan = parseInt(td.getAttribute('colspan')) || 1
      const rowspan = parseInt(td.getAttribute('rowspan')) || 1
      // Luôn luôn ẩn cột NOTE cũ (từ cột 24 trở đi)
      let isHiddenPlaceholder = false
      if (colIdx + colspan > 24) {
        const newColspan = 24 - colIdx
        if (newColspan <= 0) {
          td.style.display = 'none'
          isHiddenPlaceholder = true
        } else {
          td.setAttribute('colspan', newColspan)
        }
      }

      const isData = colIdx >= 13 && colIdx < 24

      if (isData) {
        td.classList.add('data-cell')
        td.dataset.cellId = 'data_' + cellId
        td.dataset.originalHtml = td.innerHTML

        if (props.mode === 'create') {
          td.setAttribute('contenteditable', 'true')
          attachDataCellEditingHandlers(td)
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
      // Ô NOTE ẩn (cột dự phòng mới thêm cho canh lề Tư vấn) không được tính vào bộ đếm cellId,
      // nếu không sẽ làm lệch data_N của mọi ô sau đó -> mất khớp với fillerChanges/reviewChanges
      // đã lưu trước đây (dữ liệu cũ "biến mất" khi mở lại vì id không còn trùng khớp).
      if (!isHiddenPlaceholder) {
        cellId++
      }
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
          attachNoteCellEditingHandlers(reviewCell)
        }
      })
    }
  })
}



function lockDataCellControlsForReview() {
  if (!paperRef.value) return
  if (props.mode !== 'review' && props.mode !== 'view') return
  paperRef.value.querySelectorAll('.data-cell input, .data-cell select, .data-cell textarea, .data-cell button').forEach(el => {
    el.disabled = true
    el.setAttribute('disabled', 'disabled')
  })
}

function getCellPlainValue(cell) {
  return String(cell?.innerHTML || '')
    .replace(/<br\s*\/?/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getCellOriginalPlainValue(cell) {
  return String(cell?.dataset?.originalHtml || '')
    .replace(/<br\s*\/?/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function isYesNoValue(value) {
  const v = String(value || '').replace(/\s+/g, '').toUpperCase()
  return v === 'YES' || v === 'NO'
}

function isYesNoTemplateCell(cell) {
  // Chỉ dựa vào HTML gốc của ô trong template (bất biến từ lúc parse, không đổi theo dữ liệu điền vào)
  // để xác định đây có đúng là ô YES/NO hay không. Không được dựa vào giá trị HIỆN TẠI, vì các field
  // text thường (vd: "Other Given name used" lấy từ field tên gọi khác) có thể tình cờ có nội dung
  // trùng chữ "Yes"/"No" và sẽ bị nhận nhầm thành ô checkbox, đè mất giá trị text thật cần hiển thị.
  const original = getCellOriginalPlainValue(cell).replace(/\s+/g, '')
  return cell?.classList?.contains('yesno-cell') || original === 'YES/NO'
}

// ── CONVERT YES/NO CELLS TO CHECKBOXES ──
function convertYesNoCells() {
  if (!paperRef.value) return

  const renderYesNoCell = (td, selectedValue = '', isReadOnly = false, role = 'data') => {
    if (!td) return
    if (td.classList.contains('yesno-cell')) {
      const existingChecks = td.querySelectorAll('.yesno-check')
      if (existingChecks.length !== 2) {
        const existingValue = getCellPlainValue(td).replace(/\s+/g, '')
        selectedValue = isYesNoValue(selectedValue) ? selectedValue : existingValue
        td.classList.remove('yesno-cell')
      } else {
        existingChecks.forEach(chk => {
          if (isReadOnly) {
            chk.disabled = true
            chk.setAttribute('disabled', 'disabled')
          } else {
            chk.disabled = false
            chk.removeAttribute('disabled')
          }
        })
        return
      }
    }
    const upperSelected = isYesNoValue(selectedValue) ? String(selectedValue).trim().toUpperCase() : ''
    td.classList.add('yesno-cell')
    td.setAttribute('contenteditable', 'false')
    td.dataset.yesno = 'true'

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

    const checks = td.querySelectorAll('.yesno-check')
    if (upperSelected) {
      checks.forEach(chk => { chk.checked = chk.dataset.val === upperSelected })
      if (role === 'note') {
        td.classList.add('color-reviewer')
        td.dataset.filledValue = upperSelected
      } else {
        td.dataset.filled = 'true'
        td.dataset.filledValue = upperSelected
        td.classList.add('color-customer')
      }
    }

    if (!isReadOnly) {
      checks.forEach(chk => {
        chk.addEventListener('change', function () {
          checks.forEach(c => { if (c !== this) c.checked = false })
          const val = this.checked ? this.dataset.val : ''

          td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
          if (val) {
            if (props.mode === 'review' || role === 'note') {
              td.classList.add('color-reviewer')
              changes.value[td.dataset.cellId] = val
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
  }

  paperRef.value.querySelectorAll('.data-cell').forEach(td => {
    if (!isYesNoTemplateCell(td)) return

    const currentValue = getCellPlainValue(td).replace(/\s+/g, '')
    const selectedValue = isYesNoValue(currentValue) ? currentValue : ''
    const isReadOnly = props.mode === 'view' || props.mode === 'review'
    renderYesNoCell(td, selectedValue, isReadOnly, 'data')
  })

  // Convert matching note-cells (Tư vấn/kiểm tra) to checkboxes.
  // Trường hợp data-cell đã được autofill thành YES/NO thì original không còn là "YES/NO",
  // nên phải nhận diện cả YES/NO hiện tại để cột bên phải vẫn có checkbox.
  if (props.mode === 'review' || props.mode === 'view') {
    paperRef.value.querySelectorAll('.data-cell').forEach(dataCell => {
      if (!isYesNoTemplateCell(dataCell)) return

      const noteCellId = dataCell.dataset.cellId?.replace('data_', 'note_')
      if (!noteCellId) return
      const noteCell = paperRef.value.querySelector(`[data-cell-id="${noteCellId}"]`)
      if (!noteCell) return

      const currentValue = getCellPlainValue(noteCell).replace(/\s+/g, '')
      const selectedValue = isYesNoValue(currentValue) ? currentValue : ''
      const isReadOnly = props.mode === 'view'
      renderYesNoCell(noteCell, selectedValue, isReadOnly, 'note')
    })

    // Fallback: một số ô TƯ VẤN được nạp lại từ reviewChanges dưới dạng chữ YES/NO
    // sau khi đã tạo cột tư vấn. Nếu chỉ dựa theo data-cell thì các ô rowspan/colspan
    // đặc biệt như "Have you ever served in the military?" có thể còn hiện chữ trần.
    // Vì vậy cứ gặp note-cell có đúng giá trị YES hoặc NO thì render lại thành checkbox.
    paperRef.value.querySelectorAll('.note-cell').forEach(noteCell => {
      if (noteCell.classList.contains('yesno-cell')) return
      const currentValue = getCellPlainValue(noteCell).replace(/\s+/g, '')
      if (!isYesNoValue(currentValue)) return
      const isReadOnly = props.mode === 'view'
      renderYesNoCell(noteCell, currentValue, isReadOnly, 'note')
    })
  }
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

    const isReadOnly = props.mode === 'view' || props.mode === 'review';
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
function normalizeText(str) {
  if (typeof str !== 'string') return str
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toUpperCase()
            .replace(/VIET NAM/g, 'VIETNAM')
}

function getCheckedYesNoValue(cell) {
  const checked = cell?.querySelector('.yesno-check:checked')
  return checked?.dataset.val || ''
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizePlainPasteText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function plainTextToCellHtml(value) {
  const text = normalizePlainPasteText(value)
  if (!text) return ''
  return text.split('\n').map(escapeHtml).join('<br>')
}

function setCaretToEnd(element) {
  const selection = window.getSelection?.()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function updateEditedCellState(cell) {
  if (!cell?.dataset?.cellId) return
  const val = cell.innerHTML.trim()

  if (!val || val === '<br>') {
    cell.innerHTML = cell.dataset.originalHtml || ''
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
    changes.value[cell.dataset.cellId] = val
  } else if (cell.classList.contains('data-cell') && props.mode === 'create') {
    if (cell.dataset.filled === 'true' && val === cell.dataset.filledValue) {
      cell.classList.remove('color-filler', 'modified', 'color-reviewer')
      cell.classList.add('color-customer')
      delete changes.value[cell.dataset.cellId]
    } else {
      cell.classList.remove('color-customer', 'color-reviewer')
      cell.classList.add('color-filler', 'modified')
      changes.value[cell.dataset.cellId] = val
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function splitSocialMediaText(value) {
  return stripHtml(value)
    .split(/\r?\n|;|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

function uniqueSocialMediaItems(items) {
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

function getSocialMediaValues(...values) {
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

function getAllSocialMediaValue(...values) {
  return getSocialMediaValues(...values).join(', ')
}

function inferSocialMediaProvider(value) {
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

function getSocialMediaProvider(...values) {
  return uniqueSocialMediaItems(
    getSocialMediaValues(...values)
      .map(inferSocialMediaProvider)
      .filter(Boolean)
  ).join(', ')
}

function normalizeSocialMediaAccount(account) {
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

function getSocialMediaAccountsFromValue(value) {
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

function getSocialMediaAccounts(...values) {
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

function isAffirmativeValue(value) {
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

function yesNoOrBlank(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'boolean') return value ? 'YES' : 'NO'
  if (typeof value === 'number') return value ? 'YES' : 'NO'
  const raw = stripHtml(value).replace(/\s+/g, ' ').trim()
  if (!raw) return ''
  return isAffirmativeValue(raw) ? 'YES' : 'NO'
}

function splitPersonName(fullName) {
  const cleaned = stripHtml(fullName).replace(/\s+/g, ' ').trim()
  if (!cleaned) return { surname: '', givenName: '' }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map(part => part.trim()).filter(Boolean)
    return { surname: parts[0] || '', givenName: parts.slice(1).join(' ') }
  }
  const parts = cleaned.split(' ').filter(Boolean)
  return { surname: parts[0] || '', givenName: parts.slice(1).join(' ') }
}

function normalizeRelationship(value) {
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

// Helper: fill giá trị YES/NO vào checkbox cell
function fillYesNoCell(td, val) {
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
}

function fillImmigrantStatusCell(td, val) {
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

    const isDataCell = td.classList.contains('data-cell')
    const isReadOnly = props.mode === 'view' || (isDataCell && props.mode === 'review')
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
    if (td.classList.contains('yesno-cell')) {
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
  })
  changes.value = {}
  if (shouldEmit) emit('change', {})
}

function fillHeaderData(data) {
  if (!paperRef.value || !data) return
  const header = getN600HeaderValues(data)
  const values = {
    header_A_customer: header.customer,
    header_A_email: header.email,
    header_A_pass: header.pass,
    header_A_mshs: header.mshs
  }

  Object.entries(values).forEach(([cellId, value]) => {
    if (!value) return
    const cell = paperRef.value.querySelector(`[data-cell-id="${cellId}"]`)
    if (!cell) return
    const filledValue = normalizeText(value)
    cell.innerHTML = filledValue
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = filledValue
    cell.classList.add('color-customer')
  })
}

// ── HEADER INFO (Tên đương đơn, Email, Pass, MS) ──
// Cho phép click vào các ô trong bảng header để gõ tay, giống cách làm ở PKT I-90.
function makeHeaderCellsEditable() {
  if (!paperRef.value) return
  const tables = paperRef.value.querySelectorAll('table')
  if (tables.length < 2) return

  const headerTable = tables[1]
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
    // Luôn chốt lại "baseline" theo giá trị tự động điền hiện tại (trước khi áp fillerChanges/reviewChanges),
    // KHÔNG được guard bằng if(!originalHtml) vì chuỗi rỗng '' cũng falsy → sẽ chốt nhầm baseline
    // thành giá trị đã lưu ở lần gọi sau, khiến ô bị coi là "chưa từng điền" và xoá trắng khi click vào.
    td.dataset.originalHtml = td.innerHTML

    // Phân quyền sửa:
    // - Xử lý (create): sửa mọi ô header thông thường.
    // - Tư vấn (review): chỉ sửa Pass và MS theo yêu cầu.
    // - View: chỉ xem.
    const isReviewerEditableHeader = props.mode === 'review' && ['header_A_pass', 'header_A_mshs'].includes(td.dataset.cellId)
    const isEditableHeader = props.mode === 'create' || isReviewerEditableHeader

    if (!isEditableHeader || props.mode === 'view') {
      td.setAttribute('contenteditable', 'false')
      return
    }

    if (td.dataset.headerEditableBound) return
    td.dataset.headerEditableBound = 'true'
    td.setAttribute('contenteditable', 'true')

    td.addEventListener('focus', function () {
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
        this.classList.remove('color-filler', 'color-customer', 'color-reviewer')
        if (wasFilled) changes.value[this.dataset.cellId] = '__CLEARED__'
        else delete changes.value[this.dataset.cellId]
      } else if (this.dataset.filled && val === this.dataset.filledValue) {
        this.classList.remove('color-filler', 'color-reviewer')
        this.classList.add('color-customer')
        delete changes.value[this.dataset.cellId]
      } else {
        this.classList.remove('color-customer', 'color-filler', 'color-reviewer')
        this.classList.add(sourceClass)
        changes.value[this.dataset.cellId] = val
      }
      emit('change', { ...changes.value })
      updateCorrectionCountDisplay()
    })
  })
}

// Chuẩn hóa label để match được cả dấu nháy cong trong HTML và dấu nháy thẳng trong mapping.
function normalizeLabelForMatch(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[’‘`´]/g, "'")
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

// ── Part D: "What dates did your U.S. citizen parent live in the United States?" ──
// Phiếu tĩnh chỉ có sẵn 2 dòng "(1)/(2) To/From", nhưng form nhập liệu online cho khách khai
// không giới hạn số giai đoạn cư trú (mảng us_residence_periods). Các hàm dưới đây tự thêm đủ
// dòng theo đúng số giai đoạn có trong data, đồng thời cho người kiểm tra bấm nút "+" để thêm
// dòng trống thủ công khi cần bổ sung ngoài dữ liệu online.
const RESIDENCE_PERIOD_QUESTION_LABEL = 'What dates did your U.S. citizen parent live in the United States?'

function findResidencePeriodAnchorRow() {
  if (!paperRef.value) return null
  const target = normalizeLabelForMatch(RESIDENCE_PERIOD_QUESTION_LABEL)
  const anchorTd = Array.from(paperRef.value.querySelectorAll('td'))
    .find(td => normalizeLabelForMatch(td.textContent) === target)
  return anchorTd ? anchorTd.closest('tr') : null
}

// Danh sách <tr> "(N) To"/"(N) From" đang có ngay sau dòng câu hỏi, gồm cả dòng gốc trong
// template lẫn dòng đã thêm động trước đó.
function getResidencePeriodRows(anchorRow) {
  const rows = []
  let row = anchorRow?.nextElementSibling
  while (row) {
    const isPeriodRow = Array.from(row.children).some(td => /^\(\d+\)\s*(To|From)$/i.test(td.textContent.trim()))
    if (!isPeriodRow) break
    rows.push(row)
    row = row.nextElementSibling
  }
  return rows
}

function removeDynamicResidencePeriodRows() {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('tr[data-dynamic-residence-row="true"], tr[data-residence-add-row="true"]').forEach(row => row.remove())
}

function buildResidencePeriodRow(n, part) {
  const tr = document.createElement('tr')
  tr.dataset.dynamicResidenceRow = 'true'

  // Dòng gốc trong template nằm trong vùng rowspan của ô "#" (mục 12), còn dòng thêm động này
  // nằm ngoài vùng đó nên phải tự có ô "#" trống (colspan 2) để giữ đúng vị trí cột.
  const placeholderTd = document.createElement('td')
  placeholderTd.setAttribute('colspan', '2')
  tr.appendChild(placeholderTd)

  const labelTd = document.createElement('td')
  labelTd.setAttribute('colspan', '11')
  labelTd.textContent = `(${n}) ${part}`
  tr.appendChild(labelTd)

  const dataTd = document.createElement('td')
  dataTd.setAttribute('colspan', '11')
  dataTd.textContent = 'MM/DD/YYYY'
  dataTd.classList.add('data-cell')
  dataTd.dataset.cellId = `data_residence_period_${n}_${part.toLowerCase()}`
  dataTd.dataset.originalHtml = 'MM/DD/YYYY'
  tr.appendChild(dataTd)

  if (props.mode === 'create') {
    dataTd.setAttribute('contenteditable', 'true')
    attachDataCellEditingHandlers(dataTd)
  } else {
    dataTd.setAttribute('contenteditable', 'false')
  }

  if (props.mode === 'review' || props.mode === 'view') {
    const reviewCell = document.createElement('td')
    reviewCell.setAttribute('colspan', '11')
    reviewCell.classList.add('note-cell')
    reviewCell.dataset.cellId = `note_residence_period_${n}_${part.toLowerCase()}`
    reviewCell.dataset.submittedValue = ''
    reviewCell.dataset.originalHtml = ''
    reviewCell.setAttribute('contenteditable', props.mode === 'view' ? 'false' : 'true')
    if (props.mode === 'review') {
      attachNoteCellEditingHandlers(reviewCell)
    }
    tr.appendChild(reviewCell)
  }

  const noteTd = document.createElement('td')
  noteTd.setAttribute('colspan', '2')
  tr.appendChild(noteTd)

  return tr
}

function ensureResidencePeriodRows(minCount) {
  if (!paperRef.value) return
  const anchorRow = findResidencePeriodAnchorRow()
  if (!anchorRow) return

  const existingRows = getResidencePeriodRows(anchorRow)
  const currentCount = Math.floor(existingRows.length / 2)
  if (currentCount >= minCount) return

  let insertAfter = existingRows.length > 0 ? existingRows[existingRows.length - 1] : anchorRow
  for (let n = currentCount + 1; n <= minCount; n++) {
    const toRow = buildResidencePeriodRow(n, 'To')
    insertAfter.insertAdjacentElement('afterend', toRow)
    const fromRow = buildResidencePeriodRow(n, 'From')
    toRow.insertAdjacentElement('afterend', fromRow)
    insertAfter = fromRow
  }
}

// Số dòng "(N) To/From" mà người kiểm tra đã từng bấm "+" thêm thủ công ở lần lưu trước, suy ra
// từ chính các cellId đã lưu trong _fillerChanges/_reviewChanges — nhờ vậy dòng thêm tay vẫn được
// tái tạo đúng vị trí và giữ nguyên giá trị khi mở lại phiếu, dù data online không có đủ giai đoạn.
function getSavedResidencePeriodRowCount(data) {
  let maxN = 0
  const scan = (source) => {
    if (!source) return
    Object.keys(source).forEach(key => {
      const m = /^(?:data|note)_residence_period_(\d+)_(?:to|from)$/i.exec(key)
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
    })
  }
  scan(data?._fillerChanges)
  scan(data?._reviewChanges)
  return maxN
}

function ensureResidencePeriodAddButton() {
  if (!paperRef.value) return
  paperRef.value.querySelectorAll('tr[data-residence-add-row="true"]').forEach(row => row.remove())
  if (props.mode !== 'create' && props.mode !== 'review') return // chỉ cho thêm khi đang điền/tư vấn

  const anchorRow = findResidencePeriodAnchorRow()
  if (!anchorRow) return
  const existingRows = getResidencePeriodRows(anchorRow)
  const lastRow = existingRows.length > 0 ? existingRows[existingRows.length - 1] : anchorRow

  const btnRow = document.createElement('tr')
  btnRow.setAttribute('data-residence-add-row', 'true')

  const placeholderTd = document.createElement('td')
  placeholderTd.setAttribute('colspan', '13')
  btnRow.appendChild(placeholderTd)

  const btnTd = document.createElement('td')
  btnTd.setAttribute('colspan', '11')
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = '+ Thêm giai đoạn cư trú'
  btn.style.cssText = 'padding:4px 10px;background:#2563eb;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer;'
  btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8' })
  btn.addEventListener('mouseleave', () => { btn.style.background = '#2563eb' })
  btn.addEventListener('click', () => {
    const nextCount = Math.floor(getResidencePeriodRows(anchorRow).length / 2) + 1
    ensureResidencePeriodRows(nextCount)
    ensureResidencePeriodAddButton()
  })
  btnTd.appendChild(btn)
  btnRow.appendChild(btnTd)

  const noteTd = document.createElement('td')
  noteTd.setAttribute('colspan', '2')
  btnRow.appendChild(noteTd)

  lastRow.insertAdjacentElement('afterend', btnRow)
}

function autoFillData(data) {
  resetTable()
  if (!paperRef.value || !data) return

  removeDynamicResidencePeriodRows()
  ensureResidencePeriodRows(Math.max(
    getN600ResidencePeriodRowCount(data),
    getSavedResidencePeriodRowCount(data)
  ))

  fillHeaderData(data)

  const mappings = buildN600Mappings(data)
  const allTds = Array.from(paperRef.value.querySelectorAll('td'))
  const usedCells = new Set() // Track đã dùng cell nào để tránh fill trùng

  mappings.forEach(m => {
    const hasValue = !(m.val === undefined || m.val === null || String(m.val).trim() === '')
    if (!hasValue && !m.force) return

    const val = normalizeText(String(m.val ?? ''))

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

    // Tìm data-cell liền kề (sibling) để đổ giá trị vào
    let next = labelCell.nextElementSibling
    while (next && !next.classList.contains('data-cell')) {
      next = next.nextElementSibling
    }
    if (!next) return

    // Chỉ coi là "ô YES/NO thật" khi bản thân ô đích vốn là placeholder "YES/NO" trong template
    // (hoặc đã là yesno-cell). Tránh trường hợp field text thường (vd: tên gọi khác) tình cờ có
    // giá trị trùng chữ "Yes"/"No" rồi bị biến nhầm thành checkbox, đè mất giá trị thật cần hiển thị.
    const isRealYesNoCell = next.classList.contains('yesno-cell') || (next.dataset.originalHtml || '').trim() === 'YES/NO'

    if ((val === 'YES' || val === 'NO') && isRealYesNoCell) {
      ensureYesNoCell(next, val)
    } else if (next.classList.contains('yesno-cell') || next.classList.contains('immigrant-status-cell')) {
      // Dữ liệu không phải YES/NO nhưng ô đích là ô checkbox đặc biệt → bỏ qua, tránh phá cấu trúc checkbox.
    } else {
      next.innerHTML = val
      next.dataset.filled = 'true'
      next.dataset.filledValue = val
      next.classList.add('color-customer')
    }
  })

  // Chốt lại baseline (contenteditable + originalHtml) cho các ô header NGAY TẠI ĐÂY —
  // tức sau khi đã đổ xong dữ liệu tự động của khách hàng, nhưng TRƯỚC khi áp lại
  // _fillerChanges/_reviewChanges bên dưới. Nếu gọi sau applySavedFormChanges, originalHtml
  // sẽ bị chốt nhầm thành giá trị filler vừa gõ, làm ô bị coi là "trống" và mất trắng khi click lại.
  makeHeaderCellsEditable()

  applySavedFormChanges(data)

  ensureResidencePeriodAddButton()
}

// So sánh giá trị bỏ qua thẻ HTML/khoảng trắng, dùng để nhận biết
// "chỉnh sửa đã lưu" có thực sự khác với giá trị đang tự động đổ vào hay không.
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

function getPairedCell(cell, fromPrefix, toPrefix) {
  const cellId = cell?.dataset?.cellId || ''
  if (!cellId.startsWith(fromPrefix)) return null
  return paperRef.value?.querySelector(`[data-cell-id="${cellId.replace(fromPrefix, toPrefix)}"]`) || null
}

function fillSpecialOrPlainCell(cell, value, colorClass) {
  if (cell.classList.contains('yesno-cell')) {
    fillYesNoCell(cell, value)
  } else if (cell.classList.contains('immigrant-status-cell')) {
    fillImmigrantStatusCell(cell, value)
  } else {
    cell.innerHTML = value
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = value
  }
  cell.classList.remove('color-customer', 'color-filler', 'color-reviewer')
  cell.classList.add(colorClass)
}

// Khôi phục các chỉnh sửa của Điền đơn (_fillerChanges) và Tư vấn (_reviewChanges)
// đã lưu trước đó lên phiếu khi mở lại (draft hoặc phiếu đã submit).
// Thiếu bước này thì phiếu báo lưu thành công nhưng mở lại sẽ mất hết dữ liệu đã sửa.
function applySavedFormChanges(data) {
  if (!paperRef.value || !data) return

  const fillerChanges = data._fillerChanges
  if (fillerChanges && Object.keys(fillerChanges).length > 0) {
    paperRef.value.querySelectorAll('.data-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const fillerValue = fillerChanges[cellId]
      if (!cellId || fillerValue === undefined) return

      if (fillerValue !== '__CLEARED__') {
        const currentAutoFilledValue = getRenderedCompareValue(td)
        const incomingFillerValue = normalizeChangeCompareValue(fillerValue)
        if (currentAutoFilledValue && incomingFillerValue && currentAutoFilledValue === incomingFillerValue) {
          td.classList.remove('color-filler', 'color-reviewer')
          td.classList.add('color-customer')
          delete changes.value[cellId]
          return
        }
      }

      if (fillerValue === '__CLEARED__') {
        if (td.classList.contains('yesno-cell')) {
          td.querySelectorAll('.yesno-check').forEach(chk => { chk.checked = false })
        } else if (td.classList.contains('immigrant-status-cell')) {
          td.querySelectorAll('.immigrant-status-check').forEach(chk => { chk.checked = false })
        } else {
          td.innerHTML = ''
        }
        td.classList.remove('color-customer', 'color-filler', 'color-reviewer')
        delete td.dataset.filled
        delete td.dataset.filledValue
      } else {
        fillSpecialOrPlainCell(td, fillerValue, 'color-filler')
      }

      if (props.mode === 'create') {
        changes.value[cellId] = fillerValue
      }
    })
    if (props.mode === 'create') emit('change', { ...changes.value })
  }

  const reviewChanges = data._reviewChanges
  if (reviewChanges && Object.keys(reviewChanges).length > 0) {
    // 1. Áp dụng cho note-cell (cột TƯ VẤN)
    paperRef.value.querySelectorAll('.note-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const reviewValue = reviewChanges[cellId]
      if (!cellId || reviewValue === undefined) return

      const pairedDataCell = getPairedCell(td, 'note_', 'data_')
      const submittedValue = getRenderedCompareValue(pairedDataCell) || normalizeChangeCompareValue(td.dataset.submittedValue)
      const incomingReviewValue = normalizeChangeCompareValue(reviewValue)
      if (submittedValue && incomingReviewValue && submittedValue === incomingReviewValue) {
        delete changes.value[cellId]
        return
      }

      fillSpecialOrPlainCell(td, reviewValue, 'color-reviewer')
      changes.value[cellId] = reviewValue
    })

    // 2. Áp dụng cho data-cell không có note-cell tương ứng (ví dụ: 4 ô header mà Tư vấn sửa)
    paperRef.value.querySelectorAll('.data-cell').forEach(td => {
      const cellId = td.dataset.cellId
      const reviewValue = reviewChanges[cellId]
      if (!cellId || reviewValue === undefined) return

      const pairedNoteCell = getPairedCell(td, 'data_', 'note_')
      const targetCell = pairedNoteCell || td
      const submittedValue = getRenderedCompareValue(td)
      const incomingReviewValue = normalizeChangeCompareValue(reviewValue)
      if (submittedValue && incomingReviewValue && submittedValue === incomingReviewValue) {
        delete changes.value[cellId]
        return
      }

      fillSpecialOrPlainCell(targetCell, reviewValue, 'color-reviewer')
      const targetCellId = targetCell.dataset.cellId || cellId
      changes.value[targetCellId] = reviewValue
      if (targetCellId !== cellId) delete changes.value[cellId]
    })

    emit('change', { ...changes.value })
  }

  updateCorrectionCountDisplay()
}
</script>
