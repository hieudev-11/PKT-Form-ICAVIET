// Các hàm dùng chung cho buildI130AMappings ở cả 5 diện
// (spouse/child/parent/sibling/fiance). CHỈ chứa những gì đã xác nhận
// giống hệt byte-for-byte ở cả 5 file gốc VÀ không phụ thuộc vào
// helpers do từng I130AWordPaper.vue tự truyền vào (firstValue, splitAddr,
// toUpperNoAccent, isAffirmativeValue) hay biến `data` của lời gọi cụ thể —
// những phần đó vẫn có thể khác nhau giữa các diện nên KHÔNG đưa vào đây
// (pickObjectValue, nameText, addressText, countryOnlyValue, zipOnlyValue,
// splitPlace, getParentResidenceParts, isCurrentlyMarried,
// translateMaritalStatus, v.v. — vẫn định nghĩa riêng trong từng file case).

const COMBINING_DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g')

export const optionKey = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(COMBINING_DIACRITICS_RE, '')
  .replace(/đ/gi, 'd')
  .toUpperCase()
  .replace(/[^A-Z0-9.,]+/g, ' ')
  .trim()

export const normalizeRelationshipText = (value) => String(value || '')
  .normalize('NFD')
  .replace(COMBINING_DIACRITICS_RE, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

export const firstItem = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value[0] || {}
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  }
  return {}
}

export const itemAt = (value, index = 0) => {
  if (Array.isArray(value)) return value[index] || {}
  if (index === 0 && value && typeof value === 'object') return value
  return {}
}

export const hasRecordValue = (source) => {
  if (!source || typeof source !== 'object') return false
  return Object.values(source).some(value => {
    if (Array.isArray(value)) return value.some(item => hasRecordValue(item))
    if (value && typeof value === 'object') return hasRecordValue(value)
    return value !== undefined && value !== null && String(value).trim() !== ''
  })
}

export const countRecords = (value) => {
  if (!Array.isArray(value)) return hasRecordValue(value) ? 1 : 0
  return value.filter(item => hasRecordValue(item)).length
}

export const itemFromLists = (index, ...values) => {
  for (const value of values) {
    const item = itemAt(value, index)
    if (hasRecordValue(item)) return item
  }
  return {}
}

export const translateCitizenshipType = (value) => {
  const key = optionKey(value)
  if (!key) return ''
  if (key.includes('NHAP TICH') || key.includes('NATURALIZATION') || key.includes('NATURALIZED')) return 'NATURALIZATION'
  if (key.includes('SINH O MY') || key.includes('BIRTH') || key.includes('USA') || key.includes('HOA KY')) return 'Birth in the United States'
  if (key.includes('THEO CHA ME') || key.includes('PARENTS') || key.includes('PARENT')) return 'Parents'
  return value
}

export const isVNDistrictOrCity = (value) => {
  const key = optionKey(value)
  return /\b(DISTRICT|QUAN|HUYEN|TOWN|THI XA|THANH PHO|TP)\b/.test(key) || /^(Q)\s*\d+$/.test(key)
}

export const isVNCommuneOrWard = (value) => {
  const key = optionKey(value)
  return /\b(XA|PHUONG|COMMUNE|WARD)\b/.test(key) || /^(P)\s*\d+$/.test(key)
}

export const addressLooksUS = (...values) => {
  return values.some(value => {
    const key = optionKey(value)
    return key.includes('UNITED STATES') || /\bU\.?S\.?A?\b/.test(key) || key === 'USA' || key === 'US'
  })
}

export const isUSStateCode = (value) => {
  const key = optionKey(value).replace(/[^A-Z]/g, '')
  return [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'
  ].includes(key)
}

export const isUSZipCode = (value) => /^\d{5}(?:-\d{4})?$/.test(String(value || '').trim())

export const isLocalAddressPart = (value) => {
  const key = optionKey(value)
  return /\b(WARD|PHUONG|COMMUNE|XA|DISTRICT|QUAN|HUYEN|TOWN|THI XA)\b/.test(key) || /^(P|Q)\s*\d+[A-Z]?$/.test(key)
}

export const joinAddressLine = (...values) => values
  .map(value => String(value || '').trim())
  .filter(Boolean)
  .join(', ')

export const translateGender = (value) => {
  const key = optionKey(value)
  if (!key) return ''
  if (['NU', 'FEMALE', 'WOMAN', 'GIRL'].includes(key)) return 'FEMALE'
  if (['NAM', 'MALE', 'MAN', 'BOY'].includes(key)) return 'MALE'
  return key
}

export const translateEthnicity = (value) => {
  const key = optionKey(value)
  if (!key) return ''
  if (key.includes('HISPANIC') || key.includes('LATINO')) {
    return key.includes('NOT') || key.includes('NO') ? 'NOT HISPANIC OR LATINO' : 'HISPANIC OR LATINO'
  }
  if (key.includes('KHONG') || key === 'NO') return 'NOT HISPANIC OR LATINO'
  if (key === 'YES' || key === 'CO') return 'HISPANIC OR LATINO'
  return key
}

export const translateRace = (value) => {
  const key = optionKey(value)
  if (!key) return ''
  if (key.includes('CHAU A') || key.includes('ASIAN')) return 'ASIAN'
  if (key.includes('DA TRANG') || key === 'WHITE') return 'WHITE'
  if (key.includes('DA DEN') || key.includes('BLACK') || key.includes('AFRICAN')) return 'BLACK OR AFRICAN AMERICAN'
  if (key.includes('AMERICAN INDIAN') || key.includes('ALASKA')) return 'AMERICAN INDIAN OR ALASKA NATIVE'
  if (key.includes('HAWAII') || key.includes('PACIFIC')) return 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER'
  return key
}

export const translateColor = (value, type = 'eye') => {
  const key = optionKey(value)
  if (!key) return ''
  if (key.includes('DEN') || key === 'BLACK') return 'BLACK'
  if (key.includes('NAU') || key === 'BROWN') return 'BROWN'
  if (key.includes('XANH LA') || key === 'GREEN') return 'GREEN'
  if (key.includes('XANH DUONG') || key === 'BLUE') return 'BLUE'
  if (key.includes('XAM') || key === 'GRAY' || key === 'GREY') return 'GRAY'
  if (key.includes('TRANG') || key === 'WHITE') return 'WHITE'
  if (key.includes('VANG') || key === 'BLOND' || key === 'BLONDE') return type === 'hair' ? 'BLOND' : 'AMBER'
  if (key === 'DO' || key === 'RED') return 'RED'
  if (key === 'HAZEL') return 'HAZEL'
  if (key === 'BALD') return 'BALD'
  return key
}

export const translateImmigrationStatus = (value) => {
  const key = optionKey(value)
  if (!key) return ''
  if (key.includes('CONGDAN') || key.includes('CONG DAN') || key.includes('CITIZEN')) return 'U.S. Citizen'
  if (key.includes('THUONGTRU') || key.includes('THUONG TRU') || key.includes('LPR') || key.includes('PERMANENT')) return 'Lawful Permanent Resident'
  return key
}

export const formatHeight = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const key = optionKey(raw)
  const meterMatch = key.match(/^(\d+)[.,]?(\d{1,2})?\s*M(?:ET|ETER|ETRE)?\s*(\d{1,2})?$/)
  if (meterMatch) {
    const meters = parseInt(meterMatch[1], 10)
    const cmPart = meterMatch[3] || meterMatch[2] || ''
    const centimeters = meters * 100 + (parseInt(cmPart.padEnd(2, '0'), 10) || 0)
    return `${centimeters} CM`
  }
  const cmMatch = key.match(/^(\d+(?:[.,]\d+)?)\s*CM$/)
  if (cmMatch) return `${cmMatch[1].replace(',', '.')} CM`
  return key
}

export const formatWeight = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const key = optionKey(raw)
  const weightMatch = key.match(/^(\d+(?:[.,]\d+)?)\s*(KG|KGS|KILOGRAMS?|LB|LBS|POUNDS?)?$/)
  let num;
  if (weightMatch) {
    num = parseFloat(weightMatch[1].replace(',', '.'))
  } else if (/^\d+(?:[.,]\d+)?$/.test(key)) {
    num = parseFloat(key.replace(',', '.'))
  } else {
    return key
  }
  return `${Math.round(num)} LBS`
}
