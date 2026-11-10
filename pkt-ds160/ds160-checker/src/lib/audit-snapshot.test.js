// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { buildAuditSnapshot, getAuditRowLabel, getAuditSectionLabel, getAuditItemNumber } from './audit-snapshot.js'

// Dựng lại đúng cấu trúc 1 dòng phiếu sau khi WordPaper khởi tạo bảng ở chế độ review:
// [ # ] [ câu hỏi ] [ ô XỬ LÝ (data_) ] [ ô TƯ VẤN (note_) ]
// Ô note_ được chèn NGAY SAU ô data_, nên trước đây nhãn của nó bị lấy nhầm
// thành giá trị người xử lý vừa điền.
function buildPaper({ filled = 'NGUYEN VAN A', reviewed = 'NGUYEN VAN B' } = {}) {
  const root = document.createElement('div')
  root.innerHTML = `
    <table><tbody>
      <tr><td colspan="26"><strong>THÔNG TIN CÁ NHÂN</strong></td></tr>
      <tr>
        <td colspan="2" rowspan="2"><strong>1</strong></td>
        <td colspan="11">Surnames</td>
        <td class="data-cell color-customer" data-cell-id="data_1_2" data-filled="true" data-filled-value="NGUYEN VAN GOC">${filled}</td>
        <td class="note-cell" data-cell-id="note_1_2" data-submitted-value="${filled}">${reviewed}</td>
      </tr>
      <tr>
        <td colspan="11">Given Names</td>
        <td class="data-cell" data-cell-id="data_1_3"></td>
        <td class="note-cell" data-cell-id="note_1_3"></td>
      </tr>
    </tbody></table>
  `
  return root
}

describe('nhãn ô dùng cho audit log', () => {
  it('lấy câu hỏi làm nhãn của ô cột XỬ LÝ', () => {
    const root = buildPaper()
    expect(getAuditRowLabel(root.querySelector('[data-cell-id="data_1_2"]'))).toBe('Surnames')
  })

  it('ô cột TƯ VẤN cũng lấy câu hỏi, KHÔNG lấy giá trị của ô XỬ LÝ bên cạnh', () => {
    const root = buildPaper({ filled: 'NGUYEN VAN A' })
    const label = getAuditRowLabel(root.querySelector('[data-cell-id="note_1_2"]'))
    expect(label).toBe('Surnames')
    expect(label).not.toContain('NGUYEN VAN A')
  })

  it('lấy được tên mục và số hạng mục, kể cả dòng dùng rowspan không có ô số', () => {
    const root = buildPaper()
    const secondRowCell = root.querySelector('[data-cell-id="note_1_3"]')
    expect(getAuditSectionLabel(secondRowCell)).toBe('THÔNG TIN CÁ NHÂN')
    expect(getAuditItemNumber(secondRowCell)).toBe('1')
    expect(getAuditRowLabel(secondRowCell)).toBe('Given Names')
  })
})

describe('snapshot data gốc', () => {
  it('ghi lại data gốc của ô đã được đổ sẵn, để log phân biệt sửa với xóa', () => {
    const snapshot = buildAuditSnapshot(buildPaper())
    expect(snapshot.data_1_2.base_value).toBe('NGUYEN VAN GOC')
    expect(snapshot.data_1_2.column).toBe('XỬ LÝ')
    expect(snapshot.note_1_2.column).toBe('TƯ VẤN')
    expect(snapshot.note_1_2.base_value).toBe('NGUYEN VAN A')
  })

  it('ô trống chưa ai đụng vào thì data gốc rỗng', () => {
    const snapshot = buildAuditSnapshot(buildPaper())
    expect(snapshot.data_1_3.base_value).toBe('')
    expect(snapshot.data_1_3.is_customer_prefilled).toBe(false)
  })

  it('phủ hết mọi ô có data-cell-id trong phiếu', () => {
    const snapshot = buildAuditSnapshot(buildPaper())
    expect(Object.keys(snapshot).sort()).toEqual(['data_1_2', 'data_1_3', 'note_1_2', 'note_1_3'])
  })
})
