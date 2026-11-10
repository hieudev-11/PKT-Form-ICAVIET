import { describe, it, expect } from 'vitest'
import { buildI130AMappings as buildSpouse } from './spouse/i130a-mappings.js'
import { buildI130AMappings as buildChild } from './child/i130a-mappings.js'
import { buildI130AMappings as buildParent } from './parent/i130a-mappings.js'
import { buildI130AMappings as buildSibling } from './sibling/i130a-mappings.js'
import { buildI130AMappings as buildFiance } from './fiance/i130a-mappings.js'

// Hồi quy: "Chưa kết hôn" (chưa từng kết hôn) chứa chuỗi con "KET HON" nên
// dễ bị nhận nhầm thành MARRIED nếu kiểm tra "married" trước "single".
// Bug thật: spouse/parent/fiance từng hiển thị "Married" cho người độc thân.
describe('translateMaritalStatus never confuses "Chưa kết hôn" (single) with married', () => {
  const cases = [
    ['spouse', buildSpouse],
    ['child', buildChild],
    ['parent', buildParent],
    ['sibling', buildSibling],
    ['fiance', buildFiance]
  ]

  it.each(cases)('%s: "Chưa kết hôn" -> SINGLE, not MARRIED', (_name, build) => {
    const mappings = build({ maritalStatus: 'Chưa kết hôn', fullName: 'Test Person' }, {})
    const field = mappings.find(m => m.label === 'What is your current marital status?')
    expect(field).toBeTruthy()
    expect(field.val).toBe('SINGLE')
  })

  it.each(cases)('%s: "Đã kết hôn" still correctly maps to MARRIED', (_name, build) => {
    const mappings = build({ maritalStatus: 'Đã kết hôn', fullName: 'Test Person' }, {})
    const field = mappings.find(m => m.label === 'What is your current marital status?')
    expect(field.val).toBe('MARRIED')
  })
})

// Hồi quy: câu hỏi "How many times have you been married?" của NGƯỜI BẢO LÃNH
// từng bị rớt xuống dùng nhầm biến đếm của NGƯỜI ĐƯỢC BẢO LÃNH (copy-paste bug)
// ở spouse/parent/fiance — khiến người bảo lãnh độc thân vẫn hiện "1" vì
// người được bảo lãnh đang có hôn nhân hiện tại.
describe('petitioner marriage count never leaks the beneficiary\'s count', () => {
  const cases = [
    ['spouse', buildSpouse],
    ['parent', buildParent],
    ['fiance', buildFiance]
  ]

  it.each(cases)('%s: single petitioner + married beneficiary -> petitioner count is 0, not 1', (_name, build) => {
    const data = {
      maritalStatus: 'Chưa kết hôn',
      fullName: 'Petitioner Test',
      beneficiaryFullName: 'Beneficiary Test',
      beneficiaryMaritalStatus: 'Đã kết hôn',
      honPhoiHienTai: [{ ten: 'Some Spouse' }]
    }
    const mappings = build(data, {})
    const field = mappings.find(m => m.label === 'How many times have you been married?')
    expect(field.val).toBe('0')
  })

  it.each(cases)('%s: genuinely married petitioner still counts at least 1', (_name, build) => {
    const data = {
      maritalStatus: 'Đã kết hôn',
      fullName: 'Petitioner Test',
      honPhoiHienTai: [{ ten: 'Petitioner Spouse' }],
      beneficiaryFullName: 'Beneficiary Test',
      beneficiaryMaritalStatus: 'Chưa kết hôn'
    }
    const mappings = build(data, {})
    const field = mappings.find(m => m.label === 'How many times have you been married?')
    expect(Number(field.val)).toBeGreaterThanOrEqual(1)
  })
})
