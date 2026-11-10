import { describe, it, expect } from 'vitest'
import {
  removeAccents, hasValue, recordHasValue, firstRecordList, mergeRecordValues,
  isUSZipCode, formatI130DateMMDDYYYY, isI130DateField, isSectionHeading,
  getDataCell, getNoteCell, isEmploymentSortDateField, isEmploymentSortTriggerField,
  COMMON_VN_FAMILIES, splitNameParts
} from './i130a-dynamic-sections-base.js'

describe('removeAccents', () => {
  it('strips Vietnamese diacritics down to plain ASCII', () => {
    expect(removeAccents('Nguyễn Văn An')).toBe('Nguyen Van An')
    expect(removeAccents('Đặng Văn Cường')).toBe('Dang Van Cuong')
    expect(removeAccents('')).toBe('')
  })
})

describe('hasValue / recordHasValue / firstRecordList', () => {
  it('treats empty string, null, undefined as no value', () => {
    expect(hasValue('')).toBe(false)
    expect(hasValue(null)).toBe(false)
    expect(hasValue(undefined)).toBe(false)
    expect(hasValue('x')).toBe(true)
  })

  it('recordHasValue checks any field on the object', () => {
    expect(recordHasValue({ a: '', b: null })).toBe(false)
    expect(recordHasValue({ a: '', b: 'x' })).toBe(true)
  })

  it('firstRecordList returns the first non-empty record/array', () => {
    expect(firstRecordList([], [{ a: 'x' }], [{ b: 'y' }])).toEqual([{ a: 'x' }])
    expect(firstRecordList({}, { a: 'x' })).toEqual([{ a: 'x' }])
  })
})

describe('mergeRecordValues', () => {
  it('primary overrides fallback field by field, dropping empty values', () => {
    expect(mergeRecordValues({ a: 'p', b: '' }, { a: 'f', b: 'f2', c: 'f3' }))
      .toEqual({ a: 'p', b: 'f2', c: 'f3' })
  })
})

describe('isUSZipCode', () => {
  it('accepts 5-digit and ZIP+4 formats only', () => {
    expect(isUSZipCode('90210')).toBe(true)
    expect(isUSZipCode('90210-1234')).toBe(true)
    expect(isUSZipCode('ABCDE')).toBe(false)
  })
})

describe('formatI130DateMMDDYYYY', () => {
  it('converts ISO date to MM/DD/YYYY', () => {
    expect(formatI130DateMMDDYYYY('2020-03-25')).toBe('03/25/2020')
  })

  it('assumes DD/MM/YYYY unless the second number could not be a month', () => {
    expect(formatI130DateMMDDYYYY('25/03/2020')).toBe('03/25/2020')
    expect(formatI130DateMMDDYYYY('03/25/2020')).toBe('03/25/2020')
  })

  it('passes through PRESENT and empty values', () => {
    expect(formatI130DateMMDDYYYY('PRESENT')).toBe('PRESENT')
    expect(formatI130DateMMDDYYYY('')).toBe('')
  })
})

describe('isI130DateField', () => {
  it('matches common date-like field key suffixes', () => {
    expect(isI130DateField('dateOfBirth')).toBe(true)
    expect(isI130DateField('employment_from')).toBe(true)
    expect(isI130DateField('fullName')).toBe(false)
  })
})

describe('isEmploymentSortDateField / isEmploymentSortTriggerField', () => {
  it('only from/to fields trigger a sort', () => {
    expect(isEmploymentSortDateField('from')).toBe(true)
    expect(isEmploymentSortDateField('to')).toBe(true)
    expect(isEmploymentSortDateField('employer')).toBe(false)
    expect(isEmploymentSortTriggerField('to')).toBe(true)
  })
})

describe('getDataCell / getNoteCell / isSectionHeading', () => {
  function makeRow(cells) {
    return {
      children: cells.map(c => ({
        classList: { contains: (cls) => (c.classes || []).includes(cls) },
        getAttribute: (name) => (name === 'colspan' ? c.colspan : undefined),
        colSpan: c.colspan,
        querySelector: () => (c.hasStrong ? {} : null)
      }))
    }
  }

  it('finds the data-cell and note-cell by class', () => {
    const row = makeRow([{ classes: ['data-cell'] }, { classes: ['note-cell'] }])
    expect(getDataCell(row)).toBe(row.children[0])
    expect(getNoteCell(row)).toBe(row.children[1])
  })

  it('detects a section heading row via wide colspan + <strong>', () => {
    const heading = makeRow([{ colspan: '24', hasStrong: true }])
    const normalRow = makeRow([{ colspan: '1' }])
    expect(isSectionHeading(heading)).toBe(true)
    expect(isSectionHeading(normalRow)).toBe(false)
  })
})

describe('splitNameParts + COMMON_VN_FAMILIES', () => {
  it('splits a 3-part Vietnamese name into family/middle/given', () => {
    expect(splitNameParts('Nguyen Van An')).toEqual({ family: 'Nguyen', middle: 'Van', given: 'An' })
  })

  it('uses western order when the last word is a recognized family name and the first is not', () => {
    expect(COMMON_VN_FAMILIES.has('NGUYEN')).toBe(true)
    expect(splitNameParts('John Nguyen')).toEqual({ family: 'Nguyen', middle: '', given: 'John' })
  })
})
