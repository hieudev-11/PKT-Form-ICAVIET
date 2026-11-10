import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Mỗi phiếu có hàng chục khối lặp (mạng xã hội, chuyến đi Mỹ, trường học, việc làm,
// vợ/chồng cũ, con cái...) và mỗi khối tự copy-paste một blur handler riêng cho ô XỬ LÝ.
// Bản gốc của các handler đó chỉ `delete changes.value[cellId]` khi ô bị bỏ trống, nên
// thao tác xoá data khách hàng không để lại dấu vết: mở lại phiếu là autofill đổ data cũ
// về, và mục "Đã kiểm tra" hiện lại đúng ô vừa xoá. Đúng quy ước trong cell-clear.js,
// ô từng có data khách hàng phải ghi marker __CLEARED__.
//
// Test này quét mã nguồn thay vì dựng DOM: 51 bản sao nằm rải trong 10 file .vue cỡ
// vài nghìn dòng, chặn ngay ở mức mẫu mã nguồn là cách duy nhất giữ cho bản sao thứ 52
// không lặp lại lỗi cũ.

const COMPONENTS_DIR = join(process.cwd(), 'src', 'components')

// Nhánh "ô bị bỏ trống" của blur handler: khôi phục HTML gốc, gỡ màu, rồi xử lý changes.
// Mã nguồn đọc vào được chuẩn hoá về LF trước khi so khớp: máy Windows có core.autocrlf
// nên cùng một file có thể nằm trên đĩa dưới dạng CRLF, mẫu khớp theo \n sẽ trượt sạch
// và test âm thầm luôn xanh.
const EMPTIED_CELL_BRANCH =
  /this\.innerHTML = this\.dataset\.originalHtml(?: \|\| '')?\n\s*this\.classList\.remove\([^\n]*\)\n\s*([^\n]+)/g

const readSource = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

function listVueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listVueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

describe('blur handler của khối lặp không được làm mất thao tác xoá', () => {
  const files = listVueFiles(COMPONENTS_DIR)

  it('tìm thấy các file phiếu để quét', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  // Chốt chặn cho chính test này: nếu mẫu khớp không còn bắt được handler nào
  // (đổi line-ending, đổi cách viết handler...) thì mọi assert dưới đều xanh một
  // cách vô nghĩa. Hiện có 51 bản sao, giữ ngưỡng thấp hơn để còn chỗ refactor.
  it('mẫu khớp vẫn bắt được các blur handler của khối lặp', () => {
    const matched = files.reduce(
      (total, file) => total + [...readSource(file).matchAll(EMPTIED_CELL_BRANCH)].length,
      0
    )
    expect(matched).toBeGreaterThanOrEqual(40)
  })

  it.each(files.map(f => [f.slice(process.cwd().length + 1), f]))(
    '%s: ô XỬ LÝ bị xoá trắng luôn ghi __CLEARED__ chứ không xoá trống key',
    (_label, file) => {
      const src = readSource(file)
      const offenders = []

      for (const match of src.matchAll(EMPTIED_CELL_BRANCH)) {
        const nextStatement = match[1].trim()
        if (nextStatement !== 'delete changes.value[this.dataset.cellId]') continue
        offenders.push(src.slice(0, match.index).split('\n').length)
      }

      expect(offenders).toEqual([])
    }
  )
})
