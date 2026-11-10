// In comment (bình luận theo dòng của cột TƯ VẤN) vào bản clone dùng để xuất PDF.
// Trên màn hình comment chỉ nằm trong popover (teleport ra body) nên clone của phiếu
// không có; phải dựng lại từ dữ liệu API.
//
// Comment được in ở một cột BÌNH LUẬN riêng, ngoài cùng bên phải, để không lẫn với
// nội dung tư vấn trong cột TƯ VẤN. Phiếu không có comment thì PDF giữ nguyên bố cục.

// Tỉ lệ bề rộng cột BÌNH LUẬN; chỗ trống lấy chủ yếu từ cột HẠNG MỤC để tổng vẫn 100%.
const COMMENT_COLUMN_PERCENT = 18

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCommentTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function buildCommentItemHtml(comment) {
  const meta = [comment.userName || 'Không rõ', formatCommentTime(comment.createdAt)]
    .filter(Boolean)
    .join(' · ')
  return `<div style="margin:2px 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.3;color:#1e3a8a;text-transform:none;font-weight:400;text-align:left;">` +
    `<div style="font-weight:700;">${escapeHtml(meta)}</div>` +
    `<div style="white-space:pre-wrap;">${escapeHtml(comment.content)}</div>` +
    `</div>`
}

// Ô bị ẩn bằng inline style (VD: cột NOTE cũ) không chiếm chỗ trong bảng khi render.
function isHidden(el) {
  return el?.style?.display === 'none'
}

// Dựng lưới ô của bảng (tính cả colspan/rowspan) để biết mỗi dòng đang kết thúc ở
// cột nào -> ô BÌNH LUẬN thêm vào luôn rơi đúng cột ngoài cùng, kể cả khi dòng đó
// bị rowspan từ dòng trên che mất vài cột.
function measureRows(rows) {
  const occupied = []
  const cellStarts = new Map()
  const isTaken = (r, c) => !!occupied[r]?.[c]
  const take = (r, c) => {
    if (!occupied[r]) occupied[r] = []
    occupied[r][c] = true
  }

  const rowEnds = rows.map((row, r) => {
    let col = 0
    Array.from(row.cells).forEach(cell => {
      if (isHidden(cell)) return
      while (isTaken(r, col)) col += 1
      const colspan = Math.max(1, cell.colSpan || 1)
      const rowspan = Math.max(1, cell.rowSpan || 1)
      cellStarts.set(cell, col)
      for (let dr = 0; dr < rowspan; dr += 1) {
        for (let dc = 0; dc < colspan; dc += 1) take(r + dr, col + dc)
      }
      col += colspan
    })
    while (isTaken(r, col)) col += 1
    return col
  })

  return { rowEnds, cellStarts }
}

// Các cột thuộc tiêu đề HẠNG MỤC: nhãn câu hỏi tự xuống dòng được, nên lấy chỗ cho cột
// BÌNH LUẬN từ đây. XỬ LÝ/TƯ VẤN có ô nowrap (Feet/Inches/Pounds...) — co lại là tràn chữ.
function findLabelColumnRange(rows, cellStarts) {
  for (const row of rows) {
    for (const cell of Array.from(row.cells)) {
      if (cell.tagName !== 'TH' || isHidden(cell)) continue
      if (String(cell.textContent || '').trim().toUpperCase() !== 'HẠNG MỤC') continue
      const start = cellStarts.get(cell)
      if (start === undefined) continue
      return { start, end: start + Math.max(1, cell.colSpan || 1) }
    }
  }
  return null
}

function parsePercent(col) {
  const width = String(col.style.width || '')
  if (!width.endsWith('%')) return null
  const value = parseFloat(width)
  return Number.isFinite(value) ? value : null
}

function addCommentColgroupColumn(table, insertIndex, labelRange) {
  const colgroup = table.querySelector(':scope > colgroup')
  if (!colgroup) return

  const cols = Array.from(colgroup.querySelectorAll('col'))
  const scaleCols = (targetCols, factor) => {
    targetCols.forEach(col => {
      const value = parsePercent(col)
      if (value !== null) col.style.width = `${(value * factor).toFixed(4)}%`
    })
  }

  const labelCols = labelRange ? cols.slice(labelRange.start, labelRange.end) : []
  const labelTotal = labelCols.reduce((sum, col) => sum + (parsePercent(col) || 0), 0)
  // HẠNG MỤC giữ tối thiểu 25%; phần thiếu (nếu có) mới chia đều cho mọi cột.
  const fromLabel = Math.min(COMMENT_COLUMN_PERCENT, Math.max(0, labelTotal - 25))
  if (fromLabel > 0) scaleCols(labelCols, (labelTotal - fromLabel) / labelTotal)
  const remaining = COMMENT_COLUMN_PERCENT - fromLabel
  if (remaining > 0) scaleCols(cols, (100 - remaining) / 100)

  const newCol = document.createElement('col')
  newCol.style.width = `${COMMENT_COLUMN_PERCENT}%`
  // Chèn đúng vị trí cột lưới mới; các <col> thừa (đã ẩn) phía sau không được chiếm chỗ.
  colgroup.insertBefore(newCol, cols[insertIndex] || null)
}

function isColumnHeaderRow(row) {
  return Array.from(row.cells).some(cell => {
    const text = String(cell.textContent || '').trim().toUpperCase()
    return cell.tagName === 'TH' && (text === 'TƯ VẤN' || text === 'XỬ LÝ' || text === 'HẠNG MỤC')
  })
}

function addCommentColumnToTable(table, byCell, usedIds) {
  const rows = Array.from(table.rows)
  if (!rows.length) return

  const { rowEnds, cellStarts } = measureRows(rows)
  const gridWidth = Math.max(...rowEnds)

  addCommentColgroupColumn(table, gridWidth, findLabelColumnRange(rows, cellStarts))

  rows.forEach((row, index) => {
    const isHeader = isColumnHeaderRow(row)
    const cell = document.createElement(isHeader ? 'th' : 'td')
    cell.className = 'pkt-pdf-comment-cell'
    cell.colSpan = Math.max(1, gridWidth - rowEnds[index] + 1)
    cell.style.verticalAlign = 'top'

    if (isHeader) {
      cell.innerHTML = '<strong>BÌNH LUẬN</strong>'
      cell.style.textAlign = 'center'
      cell.style.verticalAlign = 'middle'
    } else {
      const items = []
      row.querySelectorAll('.note-cell[data-cell-id]').forEach(noteCell => {
        const cellId = noteCell.dataset.cellId
        if (!byCell.has(cellId)) return
        items.push(...byCell.get(cellId))
        usedIds.add(cellId)
      })
      cell.innerHTML = items.map(buildCommentItemHtml).join('')
    }

    row.appendChild(cell)
  })
}

export function appendCommentsToClone(clone, comments) {
  if (!clone || !Array.isArray(comments)) return

  const byCell = new Map()
  comments.forEach(comment => {
    if (!comment || !String(comment.content || '').trim()) return
    const key = String(comment.cellId || '')
    if (!byCell.has(key)) byCell.set(key, [])
    byCell.get(key).push(comment)
  })
  if (!byCell.size) return

  // Chỉ thêm cột vào bảng checklist (bảng có ô TƯ VẤN), không đụng bảng tiêu đề/thông tin hồ sơ.
  const usedIds = new Set()
  Array.from(clone.querySelectorAll('table'))
    .filter(table => table.querySelector('.note-cell'))
    .forEach(table => addCommentColumnToTable(table, byCell, usedIds))

  // Dòng không còn trên phiếu (VD: khối động bị bớt) -> gom vào bảng cuối để không mất comment.
  const orphans = []
  byCell.forEach((items, cellId) => {
    if (!usedIds.has(cellId)) orphans.push(...items)
  })
  if (!orphans.length) return

  const rows = orphans.map(comment => `
    <tr>
      <td style="width:35%;border:1px solid #000;padding:4px 6px;vertical-align:top;">${escapeHtml(comment.rowLabel || '')}</td>
      <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;">${buildCommentItemHtml(comment)}</td>
    </tr>`).join('')

  clone.insertAdjacentHTML('beforeend', `
    <table class="pkt-comment-appendix" style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:10px;">
      <tbody>
        <tr><td colspan="2" style="border:1px solid #000;padding:4px 6px;font-weight:700;text-align:center;">BÌNH LUẬN (DÒNG KHÔNG CÒN TRÊN PHIẾU)</td></tr>
        ${rows}
      </tbody>
    </table>`)
}
