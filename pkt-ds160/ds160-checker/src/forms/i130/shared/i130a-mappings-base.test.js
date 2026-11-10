import { describe, it, expect } from 'vitest'
import {
  optionKey, normalizeRelationshipText, firstItem, itemAt, hasRecordValue,
  countRecords, itemFromLists, translateCitizenshipType, isVNDistrictOrCity,
  isVNCommuneOrWard, addressLooksUS, isUSStateCode, isUSZipCode,
  isLocalAddressPart, joinAddressLine, translateGender, translateEthnicity,
  translateRace, translateColor, translateImmigrationStatus, formatHeight,
  formatWeight
} from './i130a-mappings-base.js'

describe('optionKey / normalizeRelationshipText', () => {
  it('strips accents and normalizes to a comparable key', () => {
    expect(optionKey('Việt Nam')).toBe('VIET NAM')
    expect(optionKey('  Hà Nội  ')).toBe('HA NOI')
    expect(normalizeRelationshipText('Vợ/Chồng')).toBe('vo chong')
  })
})

describe('firstItem / itemAt / hasRecordValue / countRecords / itemFromLists', () => {
  it('firstItem returns the first non-empty array or object', () => {
    expect(firstItem([], { a: 1 })).toEqual({ a: 1 })
    expect(firstItem([{ b: 2 }])).toEqual({ b: 2 })
  })

  it('itemAt indexes into an array or returns the object at index 0', () => {
    expect(itemAt([{ a: 1 }, { a: 2 }], 1)).toEqual({ a: 2 })
    expect(itemAt({ a: 1 }, 0)).toEqual({ a: 1 })
  })

  it('hasRecordValue recurses through nested objects/arrays', () => {
    expect(hasRecordValue({ a: { b: '' } })).toBe(false)
    expect(hasRecordValue({ a: { b: 'x' } })).toBe(true)
    expect(hasRecordValue([{ a: '' }, { a: 'x' }])).toBe(true)
  })

  it('countRecords counts non-empty entries in an array', () => {
    expect(countRecords([{ a: '' }, { a: 'x' }, { a: 'y' }])).toBe(2)
    expect(countRecords({ a: 'x' })).toBe(1)
  })

  it('itemFromLists returns the first list whose item at index has a value', () => {
    expect(itemFromLists(0, [{ a: '' }], [{ a: 'x' }])).toEqual({ a: 'x' })
  })
})

describe('translateCitizenshipType', () => {
  it('maps Vietnamese/English citizenship phrases to the 3 USCIS categories', () => {
    expect(translateCitizenshipType('Nhap tich')).toBe('NATURALIZATION')
    expect(translateCitizenshipType('Sinh o My')).toBe('Birth in the United States')
    expect(translateCitizenshipType('Theo cha me')).toBe('Parents')
  })
})

describe('VN address classifiers', () => {
  it('isVNDistrictOrCity / isVNCommuneOrWard / isLocalAddressPart', () => {
    expect(isVNDistrictOrCity('Quan 1')).toBe(true)
    expect(isVNCommuneOrWard('Phuong 5')).toBe(true)
    expect(isLocalAddressPart('Xa Tan Binh')).toBe(true)
    expect(isLocalAddressPart('California')).toBe(false)
  })
})

describe('US address helpers', () => {
  it('addressLooksUS / isUSStateCode / isUSZipCode', () => {
    expect(addressLooksUS('United States')).toBe(true)
    expect(isUSStateCode('CA')).toBe(true)
    expect(isUSStateCode('ZZ')).toBe(false)
    expect(isUSZipCode('90210')).toBe(true)
    expect(isUSZipCode('abc')).toBe(false)
  })
})

describe('joinAddressLine', () => {
  it('joins non-empty parts with a comma', () => {
    expect(joinAddressLine('123 Main St', '', 'Los Angeles', undefined, 'CA')).toBe('123 Main St, Los Angeles, CA')
  })
})

describe('translate* option normalizers', () => {
  it('translateGender', () => {
    expect(translateGender('Nu')).toBe('FEMALE')
    expect(translateGender('Nam')).toBe('MALE')
  })

  it('translateEthnicity', () => {
    expect(translateEthnicity('Khong')).toBe('NOT HISPANIC OR LATINO')
    expect(translateEthnicity('Co')).toBe('HISPANIC OR LATINO')
  })

  it('translateRace', () => {
    expect(translateRace('Chau A')).toBe('ASIAN')
    expect(translateRace('Da trang')).toBe('WHITE')
  })

  it('translateColor', () => {
    expect(translateColor('Den')).toBe('BLACK')
    expect(translateColor('Vang', 'hair')).toBe('BLOND')
    expect(translateColor('Vang', 'eye')).toBe('AMBER')
  })

  it('translateImmigrationStatus', () => {
    expect(translateImmigrationStatus('Cong dan')).toBe('U.S. Citizen')
    expect(translateImmigrationStatus('Thuong tru')).toBe('Lawful Permanent Resident')
  })
})

describe('formatHeight / formatWeight', () => {
  it('formatHeight converts meters to centimeters', () => {
    expect(formatHeight('1.75 M')).toBe('175 CM')
    expect(formatHeight('170 CM')).toBe('170 CM')
  })

  it('formatWeight strips the unit label and rounds the numeric value (no kg->lbs conversion in the original code)', () => {
    expect(formatWeight('70 KG')).toBe('70 LBS')
    expect(formatWeight('150 LBS')).toBe('150 LBS')
  })
})
