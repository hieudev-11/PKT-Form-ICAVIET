// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderI130ADynamicSections as renderSpouse } from './spouse/i130a-dynamic-sections.js'
import { renderI130ADynamicSections as renderChild } from './child/i130a-dynamic-sections.js'
import { renderI130ADynamicSections as renderParent } from './parent/i130a-dynamic-sections.js'
import { renderI130ADynamicSections as renderSibling } from './sibling/i130a-dynamic-sections.js'
import { renderI130ADynamicSections as renderFiance } from './fiance/i130a-dynamic-sections.js'

// Hồi quy: khách khai "UNEMPLOYED" ở ô employer thì mục VIỆC LÀM TRONG 5 NĂM QUA
// chỉ được giữ lại tên employer, các ô địa chỉ/nghề nghiệp phải trống.
// Bug thật: normalizeUnemployedBlockRows() xoá các ô đó trên màn hình nhưng chỉ
// `delete changeRef.value[cellId]`, không ghi marker __CLEARED__. Mode create/review
// chạy lại hàm này mỗi lần dựng phiếu nên nhìn vẫn trống, còn mục "Đã kiểm tra"
// (mode view) thì không chạy -> data gốc của khách sống lại trên phiếu đã submit.

const CLEARED_FIELDS = ['country', 'line1', 'city', 'state', 'zip', 'occupation']

const CASES = [
  ['spouse', renderSpouse],
  ['child', renderChild],
  ['parent', renderParent],
  ['sibling', renderSibling],
  ['fiance', renderFiance]
]

const JOB_LABELS = [
  'What is the name of the employer?',
  'Country',
  'Address line 1',
  'Address line 2',
  'City or town',
  'State/Province',
  'ZIP code/Postal code',
  'What was your occupation?',
  'From',
  'To'
]

// Hồ sơ như của khách thật: employer = UNEMPLOYED nhưng vẫn khai đủ địa chỉ công ty.
const UNEMPLOYED_JOB = {
  employer: 'UNEMPLOYED',
  country: 'USA',
  addressLine1: '9113 COLUMBINE AVE',
  city: 'FOUNTAIN VALLEY',
  state: 'CALIFORNIA',
  zipCode: '92708',
  occupation: 'KHONG',
  from: '08/05/2026',
  to: 'PRESENT'
}

function buildPaper() {
  const paper = document.createElement('div')
  // renderI130ADynamicSections chỉ đụng tới bảng checklist = tables[2].
  paper.innerHTML = '<table><tbody></tbody></table><table><tbody></tbody></table><table><tbody></tbody></table>'
  const tbody = paper.querySelectorAll('table')[2].querySelector('tbody')

  const heading = document.createElement('tr')
  heading.innerHTML = '<td colspan="24"><strong>VIỆC LÀM TRONG 5 NĂM QUA</strong></td>'
  tbody.appendChild(heading)

  // 2 khối gốc x 10 dòng, đúng như phiếu in sẵn.
  for (let blockNumber = 1; blockNumber <= 2; blockNumber += 1) {
    JOB_LABELS.forEach(label => {
      const row = document.createElement('tr')
      row.innerHTML = `<td>(${blockNumber}) ${label}</td><td class="data-cell"></td><td class="note-cell"></td>`
      tbody.appendChild(row)
    })
  }

  return paper
}

function renderPaper(render, mode) {
  const paper = buildPaper()
  const changes = { value: {} }
  const sections = render({
    paperEl: paper,
    data: { jobs5Years: [UNEMPLOYED_JOB] },
    mode,
    changes
  })
  return { paper, changes, sections }
}

const dataCell = (paper, fieldKey) =>
  paper.querySelector(`[data-cell-id="data_i130a_employment_1_${fieldKey}"]`)

// Ô employer bị cleanEmployerName() lọc rỗng (UNEMPLOYED không phải tên công ty),
// nên người xử lý phải tự gõ lại. Đây là lúc khối trở thành "khối thất nghiệp".
function typeEmployerAsFiller(paper, changes) {
  const cell = dataCell(paper, 'employer')
  cell.innerHTML = 'UNEMPLOYED'
  changes.value[cell.dataset.cellId] = 'UNEMPLOYED'
}

describe('khối việc làm UNEMPLOYED: thao tác xoá phải lưu lại được', () => {
  it.each(CASES)('%s: ô địa chỉ của khách bị xoá được ghi __CLEARED__ chứ không mất dấu', (_name, render) => {
    const { paper, changes, sections } = renderPaper(render, 'create')

    // Trước khi gõ UNEMPLOYED, các ô địa chỉ vẫn là data gốc màu nâu của khách.
    expect(dataCell(paper, 'city').dataset.filledValue).toBe('FOUNTAIN VALLEY')

    typeEmployerAsFiller(paper, changes)
    sections.sortEmploymentBlocksByDate()

    CLEARED_FIELDS.forEach(fieldKey => {
      expect(changes.value[`data_i130a_employment_1_${fieldKey}`]).toBe('__CLEARED__')
      expect(dataCell(paper, fieldKey).innerHTML).toBe('')
    })
  })

  it.each(CASES)('%s: ô vốn trống thì không sinh marker thừa', (_name, render) => {
    const { paper, changes, sections } = renderPaper(render, 'create')
    typeEmployerAsFiller(paper, changes)
    sections.sortEmploymentBlocksByDate()

    // Address line 2 không có trong hồ sơ khách -> không có gì để "xoá".
    expect(changes.value['data_i130a_employment_1_line2']).toBeUndefined()
    expect(dataCell(paper, 'line2').innerHTML).toBe('')
  })

  it.each(CASES)('%s: giữ dataset.filled để lần blur sau không xoá mất marker', (_name, render) => {
    const { paper, changes, sections } = renderPaper(render, 'create')
    typeEmployerAsFiller(paper, changes)
    sections.sortEmploymentBlocksByDate()

    const cell = dataCell(paper, 'city')
    expect(cell.dataset.filled).toBe('true')
    expect(cell.dataset.filledValue).toBe('FOUNTAIN VALLEY')
  })

  it.each(CASES)('%s: mode view cũng dọn khối thất nghiệp, không đổ lại data gốc', (_name, render) => {
    const { paper, changes, sections } = renderPaper(render, 'view')

    // Mode view: WordPaper áp _fillerChanges lên ô employer rồi mới gọi sort.
    dataCell(paper, 'employer').innerHTML = 'UNEMPLOYED'
    sections.sortEmploymentBlocksByDate()

    CLEARED_FIELDS.forEach(fieldKey => {
      expect(dataCell(paper, fieldKey).innerHTML).toBe('')
    })
    // Phiếu đã kiểm tra là read-only: không được ghi gì vào bản nháp.
    expect(Object.keys(changes.value)).toHaveLength(0)
  })

  it.each(CASES)('%s: mode review không chép khối thất nghiệp sang review_changes', (_name, render) => {
    const { paper, changes, sections } = renderPaper(render, 'review')

    dataCell(paper, 'employer').innerHTML = 'UNEMPLOYED'
    sections.sortEmploymentBlocksByDate()

    CLEARED_FIELDS.forEach(fieldKey => {
      expect(changes.value[`data_i130a_employment_1_${fieldKey}`]).toBeUndefined()
      expect(dataCell(paper, fieldKey).innerHTML).toBe('')
    })
  })
})
