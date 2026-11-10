import { describe, it, expect } from 'vitest'
import {
  normalizeI130ACaseText, safeIsAffirmativeValue, isAffirmativeValue,
  isChildPetitionCase, isParentPetitionCase, isSiblingPetitionCase,
  escapeHtml, stripHtml, splitPersonName, normalizeRelationship,
  formatI130DateMMDDYYYY, normalizeText, getCellPrintableValue
} from './i130a-word-paper-helpers.js'

// Ô bảng giả lập: getCellPrintableValue chỉ dùng classList/querySelector/cloneNode/innerHTML
// nên không cần jsdom.
function fakeCell({ classes = [], html = '', widgets = 0 }) {
  return {
    classList: { contains: name => classes.includes(name) },
    innerHTML: html + '<button class="pkt-comment-btn pkt-ui-widget">💬</button>'.repeat(widgets),
    querySelector: selector => (selector === '.pkt-ui-widget' && widgets > 0 ? {} : null),
    cloneNode() {
      return {
        innerHTML: html,
        querySelectorAll: () => Array.from({ length: widgets }, () => ({ remove() {} }))
      }
    }
  }
}

describe('getCellPrintableValue bỏ qua widget app chèn vào ô', () => {
  it('ô TƯ VẤN trống nhưng có nút comment vẫn phải coi là trống', () => {
    expect(getCellPrintableValue(fakeCell({ classes: ['note-cell'], html: '', widgets: 1 }))).toBe('')
  })

  it('ô có nội dung thật thì trả về đúng nội dung, không kèm nút', () => {
    expect(getCellPrintableValue(fakeCell({ classes: ['note-cell'], html: 'NO', widgets: 1 }))).toBe('NO')
  })

  it('ô không có widget giữ nguyên hành vi cũ', () => {
    expect(getCellPrintableValue(fakeCell({ classes: ['note-cell'], html: 'NGUYEN' }))).toBe('NGUYEN')
  })
})

describe('normalizeI130ACaseText / safeIsAffirmativeValue', () => {
  it('normalizes accented Vietnamese text to plain lowercase', () => {
    expect(normalizeI130ACaseText('Vợ/Chồng')).toBe('vo chong')
  })

  it('recognizes common affirmative words', () => {
    expect(safeIsAffirmativeValue('Có')).toBe(true)
    expect(safeIsAffirmativeValue('yes')).toBe(true)
    expect(safeIsAffirmativeValue('Khong')).toBe(false)
    expect(safeIsAffirmativeValue('')).toBe(false)
  })
})

describe('isAffirmativeValue (rich yes/no interpreter)', () => {
  it('treats explicit negatives as false', () => {
    expect(isAffirmativeValue('KHONG')).toBe(false)
    expect(isAffirmativeValue('No')).toBe(false)
    expect(isAffirmativeValue('')).toBe(false)
  })

  it('treats common Vietnamese/English affirmatives as true', () => {
    expect(isAffirmativeValue('CO')).toBe(true)
    expect(isAffirmativeValue('YES')).toBe(true)
    expect(isAffirmativeValue('DA ROI')).toBe(true)
  })
})

describe('petition case detectors', () => {
  it('detect the case type from any of the recognized case-type fields', () => {
    expect(isChildPetitionCase({ caseType: 'con gai' })).toBe(true)
    expect(isParentPetitionCase({ caseType: 'cha me' })).toBe(true)
    expect(isSiblingPetitionCase({ caseType: 'anh chi em' })).toBe(true)
    expect(isChildPetitionCase({ caseType: 'vo chong' })).toBe(false)
  })
})

describe('escapeHtml / stripHtml', () => {
  it('escapeHtml escapes the 5 HTML-sensitive characters', () => {
    expect(escapeHtml(`<a href="x">O'Brien & Co</a>`))
      .toBe('&lt;a href=&quot;x&quot;&gt;O&#39;Brien &amp; Co&lt;/a&gt;')
  })

  it('stripHtml removes tags and converts <br> to newlines', () => {
    expect(stripHtml('Line1<br>Line2<b>bold</b>')).toBe('Line1\nLine2bold')
  })
})

describe('splitPersonName', () => {
  it('splits "Last, First" format on comma', () => {
    expect(splitPersonName('Nguyen, Van An')).toEqual({ surname: 'Nguyen', givenName: 'Van An' })
  })

  it('falls back to first-word-is-surname when there is no comma', () => {
    expect(splitPersonName('Nguyen Van An')).toEqual({ surname: 'Nguyen', givenName: 'Van An' })
  })
})

describe('normalizeRelationship', () => {
  it('maps Vietnamese/English relationship words to a fixed set of categories', () => {
    expect(normalizeRelationship('Vo/Chong')).toBe('SPOUSE')
    expect(normalizeRelationship('Con trai')).toBe('CHILD')
    expect(normalizeRelationship('Cha')).toBe('PARENT')
    expect(normalizeRelationship('Anh trai')).toBe('SIBLING')
  })
})

describe('formatI130DateMMDDYYYY (WordPaper copy)', () => {
  it('converts ISO and DD/MM/YYYY-style dates to MM/DD/YYYY', () => {
    expect(formatI130DateMMDDYYYY('2020-03-25')).toBe('03/25/2020')
    expect(formatI130DateMMDDYYYY('25/03/2020')).toBe('03/25/2020')
  })
})

describe('normalizeText', () => {
  it('uppercases and strips accents for comparison purposes', () => {
    expect(normalizeText('Việt Nam')).toContain('VIET')
  })
})
