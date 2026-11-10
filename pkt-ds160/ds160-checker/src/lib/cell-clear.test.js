// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { clearCellContent, recordClearedChange } from './cell-clear.js'

function yesNoCell({ checked = 'NO', filledValue = 'NO', isNote = false } = {}) {
  const cell = document.createElement('td')
  cell.className = isNote ? 'note-cell yesno-cell' : 'data-cell yesno-cell'
  cell.dataset.cellId = isNote ? 'note_39_2' : 'data_39_2'
  if (filledValue) {
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = filledValue
  }
  cell.innerHTML = `
    <label class="yesno-label"><input type="checkbox" class="yesno-check" data-val="YES"><span>YES</span></label>
    <label class="yesno-label"><input type="checkbox" class="yesno-check" data-val="NO"><span>NO</span></label>
  `
  const target = cell.querySelector(`.yesno-check[data-val="${checked}"]`)
  if (target) target.checked = true
  return cell
}

describe('clearCellContent', () => {
  it('ô YES/NO: bỏ tick chứ KHÔNG xoá luôn 2 ô tick', () => {
    const cell = yesNoCell({ checked: 'NO' })
    clearCellContent(cell)

    // Markup phải còn nguyên, nếu không thì ô trống trơn và không tick lại được nữa.
    expect(cell.querySelectorAll('.yesno-check')).toHaveLength(2)
    expect(cell.querySelector('.yesno-check:checked')).toBeNull()
  })

  it('ô có select: đưa về lựa chọn đầu, không xoá select', () => {
    const cell = document.createElement('td')
    cell.innerHTML = '<select><option value="">SELECT ONE</option><option value="A">A</option></select>'
    cell.querySelector('select').value = 'A'

    clearCellContent(cell)

    expect(cell.querySelector('select')).not.toBeNull()
    expect(cell.querySelector('select').value).toBe('')
  })

  it('ô chữ thường: xoá sạch nội dung', () => {
    const cell = document.createElement('td')
    cell.innerHTML = 'NGUYEN VAN A'
    clearCellContent(cell)
    expect(cell.innerHTML).toBe('')
  })
})

describe('recordClearedChange', () => {
  it('ô có data khách hàng: ghi marker __CLEARED__ để lần mở lại không bị đổ data cũ về', () => {
    const changes = {}
    recordClearedChange(changes, yesNoCell({ filledValue: 'NO' }))
    expect(changes.data_39_2).toBe('__CLEARED__')
  })

  it('ô vốn trống: xoá key, vì không có data gốc nào để đổ về', () => {
    const changes = { data_39_2: 'NO' }
    recordClearedChange(changes, yesNoCell({ filledValue: '' }))
    expect('data_39_2' in changes).toBe(false)
  })

  it('ô cột TƯ VẤN: xoá key chứ không đánh dấu __CLEARED__', () => {
    const changes = { note_39_2: 'NO' }
    recordClearedChange(changes, yesNoCell({ filledValue: 'NO', isNote: true }))
    expect('note_39_2' in changes).toBe(false)
  })

  it('bỏ qua khi ô không có cellId', () => {
    const changes = {}
    const cell = document.createElement('td')
    expect(() => recordClearedChange(changes, cell)).not.toThrow()
    expect(Object.keys(changes)).toHaveLength(0)
  })
})

describe('vòng đời: tick -> bỏ tick -> tải lại phiếu', () => {
  it('bỏ tick rồi khôi phục từ bản nháp thì ô vẫn trống, không quay về data cũ', () => {
    const changes = {}

    // 1. Khách khai NO, phiếu tự đổ vào ô.
    const cell = yesNoCell({ checked: 'NO', filledValue: 'NO' })
    expect(cell.querySelector('.yesno-check:checked').dataset.val).toBe('NO')

    // 2. Người xử lý bỏ tick và bấm Save.
    cell.querySelector('.yesno-check[data-val="NO"]').checked = false
    recordClearedChange(changes, cell)
    expect(changes.data_39_2).toBe('__CLEARED__')

    // 3. Tải lại trang: autofill đổ NO về trước, rồi bản nháp áp lên.
    const reloaded = yesNoCell({ checked: 'NO', filledValue: 'NO' })
    if (changes[reloaded.dataset.cellId] === '__CLEARED__') clearCellContent(reloaded)

    expect(reloaded.querySelector('.yesno-check:checked')).toBeNull()
    expect(reloaded.querySelectorAll('.yesno-check')).toHaveLength(2)
  })
})
