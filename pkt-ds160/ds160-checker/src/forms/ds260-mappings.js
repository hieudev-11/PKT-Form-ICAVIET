const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
]

// Câu hỏi hộ chiếu khác trong 15 năm qua, dùng làm neo cho khối (1)(2)... bên dưới nó.
// DS260WordPaper.vue import lại hằng này để dò đúng khối khi nhân dòng.
export const OTHER_PASSPORT_QUESTION_LABEL = 'Have you owned any other passports within the past fifteen years'

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function isPlaceholderValue(value) {
  const key = normalizeKey(value)
  if (!key) return false
  return [
    'THANH PHO HUYEN',
    'HUYEN THANH PHO',
    'BANG TINH',
    'TINH BANG',
    'TINH',
    'MA BUU DIEN',
    'ZIP CODE',
    'POSTAL ZONE ZIP CODE',
    'POSTAL CODE',
    'QUOC GIA',
    'COUNTRY',
    'COUNTRY REGION',
    'STATE PROVINCE',
    'CITY',
    'CITY TOWN'
  ].includes(key)
}

function cleanValue(value) {
  return isPlaceholderValue(value) ? '' : value
}

function firstRealValue(...values) {
  return firstValue(...values.map(cleanValue))
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function asYesNo(value, fallback = '') {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const key = normalizeKey(value)
  if (['YES', 'Y', 'TRUE', '1', 'CO', 'DA CO', 'CON SONG', 'SAME', 'GIONG'].includes(key)) return 'YES'
  if (['NO', 'N', 'FALSE', '0', 'KHONG', 'CHUA', 'DA MAT', 'MAT'].includes(key)) return 'NO'
  if (key.includes('KHONG')) return 'NO'
  if (key.includes('CO')) return 'YES'
  return fallback || String(value).trim()
}


function asYesNoStrict(value) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const key = normalizeKey(value)
  if (!key) return ''

  if ([
    'YES', 'Y', 'TRUE', '1', 'CO', 'DA CO', 'DA TUNG', 'TUNG', 'CO ROI'
  ].includes(key)) return 'YES'

  if ([
    'NO', 'N', 'FALSE', '0', 'KHONG', 'CHUA', 'CHUA TUNG', 'CHUA BAO GIO', 'KHONG CO'
  ].includes(key)) return 'NO'

  if (key.includes('CHUA TUNG') || key.includes('CHUA BAO GIO') || key.includes('KHONG')) return 'NO'
  if (key.includes('DA TUNG') || key.includes('DA CO')) return 'YES'

  return ''
}

function yesNoFromExplicitOrNumber(explicitValue, numberValue = '') {
  const explicit = asYesNoStrict(explicitValue)
  if (explicit) return explicit
  return firstValue(numberValue) ? 'YES' : ''
}

function isYes(value) {
  return asYesNo(value) === 'YES'
}

function stripVietnameseAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

function upper(value) {
  return String(value || '').trim().toUpperCase()
}

function upperNoAccent(value) {
  return stripVietnameseAccents(value).trim().toUpperCase()
}

function lowerValue(value) {
  return String(value || '').trim().toLowerCase()
}

function formatDS260MappingValue(mapping = {}) {
  const val = mapping.val
  if (val === undefined || val === null) return val

  // Ngoại lệ 1: Full Name in Native Language phải in hoa nhưng giữ dấu tiếng Việt.
  if (mapping.after === 'THÔNG TIN CÁ NHÂN' && mapping.label === 'Full Name in Native Language') {
    return upper(val)
  }

  // Ngoại lệ 2: Email Address phải để chữ thường.
  if (mapping.label === 'Email Address') {
    return lowerValue(val)
  }

  // Ngoại lệ 3: Social Media Identifier là username/link, giữ nguyên để tránh sai định danh.
  if (mapping.label === 'Social Media Identifier') {
    return String(val || '').trim()
  }

  // Mặc định toàn bộ data đưa vào PKT DS-260: in hoa và không dấu.
  return upperNoAccent(val)
}

function normalizeDS260Mappings(mappings = []) {
  return mappings.map(mapping => ({
    ...mapping,
    val: formatDS260MappingValue(mapping)
  }))
}

function normalizeMaritalStatus(value) {
  const key = normalizeKey(value)
  if (!key) return ''

  // Các giá trị như "Độc thân (chưa kết hôn lần nào)" vẫn có chữ "kết hôn".
  // Vì vậy phải nhận diện nhóm độc thân/chưa từng kết hôn trước nhóm MARRIED.
  if (
    key.includes('DOC THAN') ||
    key.includes('CHUA KET HON') ||
    key.includes('CHUA KET HON LAN NAO') ||
    key.includes('CHUA TUNG KET HON') ||
    key.includes('CHUA BAO GIO KET HON') ||
    key.includes('NEVER MARRIED') ||
    key.includes('SINGLE')
  ) return 'SINGLE'

  if (key.includes('GOA') || key.includes('WIDOW')) return 'WIDOWED'
  if (key.includes('LY HON') || key.includes('DIVOR')) return 'DIVORCED'
  if (key.includes('LY THAN') || key.includes('SEPAR')) return 'LEGALLY SEPARATED'
  if (key.includes('TAI HON') || key.includes('DA KET HON') || key.includes('KET HON') || key.includes('MARRIED') || key.includes('REMARRIED')) return 'MARRIED'

  return upper(value)
}

// Form DS-260 lưu lựa chọn bằng tiếng Việt ("Tự chi trả", "Công ty ở Mỹ"...), phiếu kiểm tra
// phải in đúng thuật ngữ của NVC. Thứ tự kiểm tra quan trọng: "Công ty hiện đang làm" và
// "Công ty ở Mỹ" phải đứng trước nhánh "công ty/tổ chức khác" vì đều chứa chữ "công ty".
function normalizeTripPayer(value) {
  const key = normalizeKey(value)
  if (!key) return ''

  if (key.includes('TU CHI TRA') || key.includes('TU TUC') || key.includes('BAN THAN') || key === 'SELF') return 'SELF'
  if (key.includes('CONG TY HIEN') || key.includes('DANG LAM') || key.includes('PRESENT EMPLOYER')) return 'PRESENT EMPLOYER'
  if (key.includes('CONG TY O MY') || key.includes('EMPLOYER IN THE U S') || key.includes('EMPLOYER IN THE US')) return 'EMPLOYER IN THE U.S.'
  if (key.includes('TO CHUC KHAC') || key.includes('CONG TY KHAC') || key.includes('CONG TY TO CHUC') || key.includes('OTHER COMPANY') || key.includes('ORGANIZATION')) return 'OTHER COMPANY/ORGANIZATION'
  if (key.includes('NGUOI KHAC') || key.includes('OTHER PERSON')) return 'OTHER PERSON'

  return upper(value)
}

// "10 ngày" -> "10 DAY" để fillDurationCells tách đúng 2 ô Số | DAY/WEEK/MONTH/YEAR.
function normalizeStayDuration(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  const key = normalizeKey(text)
  const amount = (key.match(/\d+/) || [''])[0]
  let unit = ''
  if (/NGAY|\bDAY/.test(key)) unit = 'DAY'
  else if (/TUAN|WEEK/.test(key)) unit = 'WEEK'
  else if (/THANG|MONTH/.test(key)) unit = 'MONTH'
  else if (/NAM|YEAR/.test(key)) unit = 'YEAR'

  const normalized = [amount, unit].filter(Boolean).join(' ')
  return normalized || upper(text)
}

// Phiếu ghi ANNULMENT / DEATH / DIVORCE / OTHER, form lưu Hủy hôn / Tử vong / Ly hôn / Khác.
function normalizeMarriageTermination(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('HUY HON') || key.includes('ANNUL')) return 'ANNULMENT'
  if (key.includes('TU VONG') || key.includes('QUA DOI') || key.includes('CHET') || key.includes('DEATH')) return 'DEATH'
  if (key.includes('LY HON') || key.includes('LY DI') || key.includes('DIVOR')) return 'DIVORCE'
  if (key.includes('KHAC') || key.includes('OTHER')) return 'OTHER'
  return upper(value)
}

function normalizeGender(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key === 'NAM' || key === 'MALE' || key === 'M') return 'MALE'
  if (key === 'NU' || key === 'FEMALE' || key === 'F') return 'FEMALE'
  return upper(value)
}

function buildOtherNamesUsed(data = {}) {
  const direct = firstValue(data.otherNamesUsed, data.otherNames, data.tenKhac, data.otherName)
  if (direct) return upper(direct)
  return upper([data.otherLastName, data.otherMiddleName, data.otherFirstName].filter(Boolean).join(' '))
}

function splitName(fullName = '') {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return { last: '', middle: '', first: '' }
  if (words.length === 1) return { last: words[0], middle: '', first: '' }
  if (words.length === 2) return { last: words[0], middle: '', first: words[1] }
  return { last: words[0], middle: words.slice(1, -1).join(' '), first: words[words.length - 1] }
}


function normalizeApplicantNameParts(data = {}) {
  const fullName = firstValue(
    data.fullName,
    [data.lastName, data.middleName, data.firstName].filter(Boolean).join(' '),
    data.customerName
  )
  const fromFullName = splitName(fullName)

  let lastName = firstValue(data.lastName, fromFullName.last)
  let middleName = firstValue(data.middleName, data.tenLot, data.tenDem, fromFullName.middle)
  let firstName = firstValue(data.firstName, fromFullName.first)

  // Một số hồ sơ cũ lưu toàn bộ Given Names vào firstName, ví dụ:
  // lastName = "Nguyễn", firstName = "Quốc Nam Phương", middleName trống.
  // Khi đó tách lại để PKT có riêng Tên lót, nhưng vẫn giữ Given Names đầy đủ khi đổ DS-260.
  if (!firstValue(data.middleName, data.tenLot, data.tenDem) && firstName) {
    const givenWords = String(firstName || '').trim().split(/\s+/).filter(Boolean)
    if (givenWords.length > 1) {
      middleName = givenWords.slice(0, -1).join(' ')
      firstName = givenWords[givenWords.length - 1]
    }
  }

  return {
    fullName: [lastName, middleName, firstName].filter(Boolean).join(' ') || fullName,
    lastName,
    middleName,
    firstName,
    givenNames: [middleName, firstName].filter(Boolean).join(' ')
  }
}

function fullNameFromParts(source, prefixes = []) {
  if (!source || typeof source !== 'object') return ''
  const names = []
  prefixes.forEach(prefix => {
    names.push(firstValue(source[`${prefix}FullName`], source[`${prefix}Name`]))
    names.push([source[`${prefix}LastName`], source[`${prefix}MiddleName`], source[`${prefix}FirstName`]].filter(Boolean).join(' '))
  })
  names.push(firstValue(source.fullName, source.customerName, source.hoTen, source.tenTrenGiayTo, source.name))
  return firstValue(...names)
}

function fullNameFromPrefixedParts(source, prefixes = []) {
  if (!source || typeof source !== 'object') return ''
  const names = []
  prefixes.forEach(prefix => {
    names.push(firstValue(source[`${prefix}FullName`], source[`${prefix}Name`]))
    names.push([source[`${prefix}LastName`], source[`${prefix}MiddleName`], source[`${prefix}FirstName`]].filter(Boolean).join(' '))
  })
  return firstValue(...names)
}

function dateValue(value) {
  if (value && typeof value === 'object') {
    const day = firstValue(value.day, value.ngay)
    const month = firstValue(value.month, value.thang)
    const year = firstValue(value.year, value.nam)
    return [day, month, year].filter(Boolean).join('/')
  }
  return value
}

function placeParts(value = '') {
  if (value && typeof value === 'object') {
    return {
      city: firstValue(value.city, value.town, value.district, value.huyen, value.thanhPho),
      province: firstValue(value.province, value.state, value.tinh, value.bang),
      country: firstValue(value.country, value.quocGia)
    }
  }
  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean)
  return {
    city: parts[0] || '',
    province: parts[1] || '',
    country: parts[2] || ''
  }
}

function addressParts(value = '', isUS = false) {
  if (value && typeof value === 'object') {
    return {
      street: firstValue(value.street, value.line1, value.addressLine1, value.address, value.diaChi),
      city: firstValue(value.city, value.town, value.district, value.huyen, value.thanhPho),
      province: firstValue(value.province, value.state, value.tinh, value.bang),
      zip: firstValue(value.zip, value.zipCode, value.postalCode, value.maZip),
      country: firstValue(value.country, value.quocGia)
    }
  }

  const parts = String(value || '').split(',').map(part => part.trim()).filter(Boolean)
  if (isUS) {
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      province: parts[2] || '',
      zip: parts[3] || '',
      country: parts[4] || ''
    }
  }

  return {
    street: parts[0] || '',
    city: parts[1] || '',
    province: parts[2] || '',
    zip: '',
    country: parts[3] || ''
  }
}

function phoneParts(value = '') {
  const digits = String(value || '').replace(/\D+/g, '')
  if (!digits) return ['', '', '']
  if (digits.length >= 10) return [digits.slice(-10, -7), digits.slice(-7, -4), digits.slice(-4)]
  return [digits, '', '']
}

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || '')
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function records(value) {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object' && Object.values(item).some(v => String(v || '').trim() !== ''))
  if (value && typeof value === 'object' && Object.values(value).some(v => String(v || '').trim() !== '')) return [value]
  return []
}

function recordAt(value, index) {
  return records(value)[index] || {}
}

function hasRecord(value) {
  return records(value).length > 0
}

function getCompositeAddress(data, key, isUS = false) {
  const direct = firstRealValue(data[key])
  const directParts = addressParts(direct, isUS)
  const explicit = {
    street: firstRealValue(data[`${key}Street`], data[`${key}Line1`], data[`${key}AddressLine1`], directParts.street),
    city: firstRealValue(data[`${key}City`], data[`${key}Town`], directParts.city),
    province: firstRealValue(data[`${key}Province`], data[`${key}State`], directParts.province),
    zip: firstRealValue(data[`${key}Zip`], data[`${key}ZipCode`], data[`${key}PostalCode`], directParts.zip),
    country: firstRealValue(data[`${key}Country`], directParts.country)
  }
  if (Object.values(explicit).some(Boolean)) return explicit
  return directParts
}

function getCompositeAddressFromKeys(data, keys = [], isUS = false) {
  const explicit = {
    street: firstValue(...keys.flatMap(key => [
      data[`${key}Street`],
      data[`${key}Line1`],
      data[`${key}AddressLine1`],
      data[`${key}Address`],
      data[`${key}DiaChi`]
    ])),
    city: firstValue(...keys.flatMap(key => [
      data[`${key}City`],
      data[`${key}Town`],
      data[`${key}District`],
      data[`${key}Huyen`],
      data[`${key}ThanhPho`]
    ])),
    province: firstValue(...keys.flatMap(key => [
      data[`${key}Province`],
      data[`${key}State`],
      data[`${key}Tinh`],
      data[`${key}Bang`]
    ])),
    zip: firstValue(...keys.flatMap(key => [
      data[`${key}Zip`],
      data[`${key}ZipCode`],
      data[`${key}PostalCode`],
      data[`${key}MaBuuDien`]
    ])),
    country: firstValue(...keys.flatMap(key => [
      data[`${key}Country`],
      data[`${key}QuocGia`]
    ]))
  }
  if (Object.values(explicit).some(Boolean)) return explicit

  const direct = firstValue(...keys.map(key => data[key]))
  return addressParts(direct, isUS)
}

function getCompositePlace(data, key) {
  const direct = firstValue(data[key])
  const explicit = {
    city: firstValue(data[`${key}City`], data[`${key}Town`]),
    province: firstValue(data[`${key}Province`], data[`${key}State`]),
    country: firstValue(data[`${key}Country`])
  }
  if (Object.values(explicit).some(Boolean)) return explicit
  return placeParts(direct)
}

function isVNLocalAddressPart(value) {
  const key = normalizeKey(value)
  if (!key) return false
  return /\b(PHUONG|P |WARD|XA|COMMUNE|THI TRAN|KHU PHO|AP)\b/.test(key) || /^P\s*\d+[A-Z]?$/.test(key)
}

function hasAddressContent(addr = {}) {
  return ['street', 'city', 'province', 'zip', 'country'].some(key => String(addr[key] || '').trim() !== '')
}

function normalizeVietnamCountry(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('VIET NAM') || key.includes('VIETNAM') || key === 'VN') return 'VIỆT NAM'
  if (key === 'USA' || key === 'US' || key.includes('UNITED STATES') || key.includes('HOA KY')) return 'USA'
  return value
}

function getFamilyCurrentAddress(data, key, birthPlace = {}) {
  const raw = firstRealValue(data[key])
  const parsed = getCompositeAddress(data, key)

  const city = firstRealValue(
    data[`${key}City`],
    data[`${key}Town`],
    data[`${key}District`],
    data[`${key}Huyen`],
    isVNLocalAddressPart(parsed.city) ? '' : parsed.city,
    birthPlace.city
  )

  const province = firstRealValue(
    data[`${key}Province`],
    data[`${key}State`],
    data[`${key}Tinh`],
    parsed.province,
    birthPlace.province
  )

  const street = firstRealValue(
    data[`${key}Street`],
    data[`${key}Line1`],
    data[`${key}AddressLine1`],
    parsed.street,
    raw
  )

  const zip = firstRealValue(
    data[`${key}Zip`],
    data[`${key}ZipCode`],
    data[`${key}PostalCode`],
    parsed.zip
  )

  const country = normalizeVietnamCountry(firstRealValue(
    data[`${key}Country`],
    parsed.country,
    birthPlace.country,
    (street || city || province || zip) ? 'VIỆT NAM' : ''
  ))

  return { street, city, province, zip, country }
}

function normalizeSocialRecord(item = {}) {
  if (item && typeof item === 'object') {
    return {
      platform: firstValue(item.platform, item.provider, item.name, item.socialMediaProvider, item.socialMediaPlatform, item.mangXaHoi, item.tenMXH),
      id: firstValue(item.id, item.identifier, item.username, item.accountId, item.socialMediaIdentifier, item.socialMediaId, item.taiKhoanMXH)
    }
  }

  const text = String(item || '').trim()
  const parts = text.split(/[:|-]/).map(part => part.trim()).filter(Boolean)
  return { platform: parts[0] || text, id: parts.slice(1).join(' - ') }
}

function parseSocial(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeSocialRecord).filter(item => firstValue(item.platform, item.id))
  }

  if (value && typeof value === 'object') {
    const item = normalizeSocialRecord(value)
    return firstValue(item.platform, item.id) ? [item] : []
  }

  return splitList(value)
    .map(normalizeSocialRecord)
    .filter(item => firstValue(item.platform, item.id))
}

function parseOtherSocial(data = {}) {
  const sources = [
    data.otherSocialNetworks,
    data.otherSocialMediaAccounts,
    data.otherSocialMediaList,
    data.listOtherSocialNetworks,
    data.otherSocials,
    data.otherSocialMediaDetails,
    data.otherSocialMediaEntries
  ]

  for (const source of sources) {
    const parsed = parseSocial(source)
    if (parsed.length) return parsed
  }

  return []
}

function normalizePreviousSpouseRecord(record = {}) {
  const source = record && typeof record === 'object' ? record : { fullName: record }
  const nameFromText = splitName(firstValue(
    source.fullName,
    source.name,
    source.spouseName,
    source.previousSpouseName,
    [source.lastName, source.middleName, source.firstName].filter(Boolean).join(' '),
    [source.surname, source.middle, source.givenName].filter(Boolean).join(' ')
  ))

  return {
    surname: firstValue(source.surname, source.surnames, source.lastName, source.familyName, source.ho, nameFromText.last),
    givenNames: firstValue(
      source.givenNames,
      source.givenName,
      source.firstName,
      [source.middleName, source.firstName].filter(Boolean).join(' '),
      [source.middle, source.givenName].filter(Boolean).join(' '),
      [nameFromText.middle, nameFromText.first].filter(Boolean).join(' ')
    ),
    birthDate: firstValue(source.birthDate, source.dateOfBirth, source.dob, source.ngaySinh),
    marriageDate: firstValue(source.marriageDate, source.dateOfMarriage, source.dateMarried, source.ngayKetHon),
    marriageEndDate: firstValue(source.marriageEndDate, source.dateMarriageEnded, source.divorceDate, source.endDate, source.ngayLyHon, source.ngayKetThuc),
    marriageEndReason: firstValue(source.marriageEndReason, source.howMarriageEnded, source.divorceReason, source.terminationReason, source.lyDoLyHon),
    terminatedCountry: firstValue(source.terminatedCountry, source.marriageTerminatedCountry, source.countryTerminated, source.divorceCountry, source.country, source.quocGia),
    nationality: firstValue(source.nationality, source.quocTich, source.spouseNationality)
  }
}

function previousSpouseHasData(spouse = {}) {
  return Object.values(spouse).some(value => String(value || '').trim() !== '')
}

function parsePreviousSpouses(data = {}) {
  const sources = [
    data.previousSpouses,
    data.previousSpousesList,
    data.honNhanCu,
    data.previousMarriages,
    data.previousMarriagesList
  ]

  for (const source of sources) {
    const parsed = records(source).map(normalizePreviousSpouseRecord).filter(previousSpouseHasData)
    if (parsed.length) return parsed
  }

  const first = normalizePreviousSpouseRecord({
    lastName: data.previousSpouseLastName,
    middleName: data.previousSpouseMiddleName,
    firstName: data.previousSpouseFirstName,
    birthDate: data.previousSpouseBirthDate,
    marriageDate: data.previousMarriageDate,
    marriageEndDate: data.divorceDate,
    marriageEndReason: firstValue(data.previousMarriageEndReason, data.divorceReason),
    terminatedCountry: firstValue(data.previousMarriageTerminatedCountry, data.divorceCountry),
    nationality: data.previousSpouseNationality
  })

  const second = normalizePreviousSpouseRecord({
    fullName: firstValue(data.formerSpouse2FullName, data.exSpouse2Name, data.previousSpouse2Name),
    lastName: data.previousSpouse2LastName,
    middleName: data.previousSpouse2MiddleName,
    firstName: data.previousSpouse2FirstName,
    birthDate: data.previousSpouse2BirthDate,
    marriageDate: firstValue(data.previousMarriage2Date, data.formerSpouse2MarriageDate),
    marriageEndDate: firstValue(data.formerSpouse2MarriageEndDate, data.formerSpouse2DivorceDate, data.divorceDate2, data.secondDivorceDate),
    marriageEndReason: firstValue(data.formerSpouse2MarriageEndReason, data.formerSpouse2DivorceReason, data.divorceReason2, data.secondDivorceReason),
    terminatedCountry: firstValue(data.previousMarriage2TerminatedCountry, data.divorceCountry2),
    nationality: firstValue(data.previousSpouse2Nationality, data.previousSpouseNationality_2)
  })

  return [first, second].filter(previousSpouseHasData)
}

function normalizeArrivalRecord(item = {}) {
  if (item && typeof item === 'object') {
    const durationValue = firstValue(item.stayDurationVal, item.stayDurationValue, item.durationValue, item.lengthValue)
    const durationUnit = firstValue(item.stayDurationUnit, item.durationUnit, item.unit)
    const durationText = firstValue(item.stayDuration, item.length, item.lengthOfStay, item.duration)
    return {
      date: firstValue(item.arrivalDate, item.date, item.dateArrived, item.usArrivalDate),
      length: firstValue(durationText, [durationValue, durationUnit].filter(Boolean).join(' '))
    }
  }

  const text = String(item || '').trim()
  if (!text) return { date: '', length: '' }

  const normalized = text
    .replace(/Ngày đến\s*:/gi, '')
    .replace(/Date Arrived\s*:/gi, '')
    .replace(/Thời gian ở\s*:/gi, '|')
    .replace(/Length of Stay\s*:/gi, '|')

  const parts = normalized.split(/[-|]/).map(part => part.trim()).filter(Boolean)
  return { date: parts[0] || text, length: parts[1] || '' }
}

function arrivalHasData(item = {}) {
  return Boolean(String(item.date || '').trim() || String(item.length || '').trim())
}

function parseArrivals(value) {
  if (Array.isArray(value)) return value.map(normalizeArrivalRecord).filter(arrivalHasData)
  if (value && typeof value === 'object') return [normalizeArrivalRecord(value)].filter(arrivalHasData)

  return String(value || '')
    .split(/\n+/)
    .map(line => normalizeArrivalRecord(line))
    .filter(arrivalHasData)
}

function normalizeChildRecord(item = {}) {
  const source = item && typeof item === 'object' ? item : {}
  const nameFromText = splitName(firstValue(source.fullName, source.childFullName, source.name))
  const birthPlace = source.birthPlace || source.childBirthPlace || {}
  const address = source.currentAddress || source.address || source.childCurrentAddress || {}
  const explicitMiddleName = firstValue(source.middleName, source.childMiddleName, source.middle)
  const explicitFirstName = firstValue(source.firstName, source.childFirstName, source.givenName, source.first)

  return {
    lastName: firstValue(source.lastName, source.childLastName, source.surname, source.last, nameFromText.last),
    // Nếu firstName đã có dữ liệu dạng Given Names đầy đủ mà middleName trống
    // thì không tách middleName từ fullName nữa để tránh bị lặp: Quốc Nam + Quốc Nam Phương.
    middleName: firstValue(explicitMiddleName, explicitFirstName ? '' : nameFromText.middle),
    firstName: firstValue(explicitFirstName, nameFromText.first),
    birthDate: firstValue(source.birthDate, source.childBirthDate),
    city: firstValue(source.city, source.birthCity, source.birthPlaceCity, source.childBirthCity, source.childBirthPlaceCity, birthPlace.city, birthPlace.town),
    province: firstValue(source.province, source.state, source.birthProvince, source.birthPlaceProvince, source.birthPlaceState, source.childBirthProvince, source.childBirthPlaceProvince, source.childBirthPlaceState, birthPlace.province, birthPlace.state),
    country: firstValue(source.country, source.birthCountry, source.birthPlaceCountry, source.childBirthCountry, source.childBirthPlaceCountry, birthPlace.country),
    isLivingWithYou: firstValue(source.isLivingWithYou, source.livesWithYou, source.childLivesWithYou),
    address: {
      street: firstValue(source.currentAddressStreet, source.addressStreet, source.childCurrentAddressStreet, address.street, address.line1, address.addressLine1),
      city: firstValue(source.currentAddressCity, source.addressCity, source.childCurrentAddressCity, address.city, address.town),
      province: firstValue(source.currentAddressProvince, source.currentAddressState, source.addressProvince, source.addressState, source.childCurrentAddressProvince, source.childCurrentAddressState, address.province, address.state),
      zip: firstValue(source.currentAddressZip, source.currentAddressPostalCode, source.addressZipCode, source.addressZip, source.childCurrentAddressZip, source.childCurrentAddressPostalCode, address.zip, address.zipCode, address.postalCode),
      country: firstValue(source.currentAddressCountry, source.addressCountry, source.childCurrentAddressCountry, address.country)
    },
    isImmigratingWithYou: firstValue(source.isImmigratingWithYou, source.immigratingWithYou, source.childImmigratingWithYou),
    isImmigratingLater: firstValue(source.isImmigratingLater, source.immigratingLater, source.childImmigratingLater)
  }
}

function childHasData(child = {}) {
  return Object.values(child).some(value => {
    if (value && typeof value === 'object') return Object.values(value).some(v => String(v || '').trim() !== '')
    return String(value || '').trim() !== ''
  })
}

function parseChildrenJson(value) {
  if (Array.isArray(value)) return value.map(normalizeChildRecord).filter(childHasData)
  if (value && typeof value === 'object') return [normalizeChildRecord(value)].filter(childHasData)

  const text = String(value || '').trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.map(normalizeChildRecord).filter(childHasData)
    if (parsed && typeof parsed === 'object') return [normalizeChildRecord(parsed)].filter(childHasData)
  } catch (error) {
    // Not JSON. Legacy parser will handle listChildrenInfo below.
  }

  return []
}

function parseLegacyChildrenText(value) {
  return String(value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(' - ').map(part => part.trim()).filter(Boolean)
      const offset = /^\d+$/.test(parts[0] || '') ? 1 : 0
      const name = parts[offset] || ''
      const birthDate = parts[offset + 1] || ''
      const place = placeParts(parts[offset + 2] || '')
      const out = { ...splitName(name), birthDate, ...place }
      parts.slice(offset + 3).forEach(part => {
        const [rawKey, ...rest] = part.split(':')
        const key = normalizeKey(rawKey)
        const val = rest.join(':').trim()
        if (key.includes('SONG CUNG')) out.isLivingWithYou = val
        if (key.includes('DIA CHI CON')) Object.assign(out, { address: addressParts(val, false) })
        if (key.includes('NHAP CU CUNG')) out.isImmigratingWithYou = val
        if (key.includes('NHAP CU SAU')) out.isImmigratingLater = val
      })
      return normalizeChildRecord(out)
    })
    .filter(childHasData)
}

export function parseChildrenFromData(data = {}) {
  const structured = parseChildrenJson(data?.childrenInfo)
  if (structured.length) return structured

  const jsonStructured = parseChildrenJson(data?.childrenInfoJson)
  if (jsonStructured.length) return jsonStructured

  return parseLegacyChildrenText(data?.listChildrenInfo)
}

function addDate(mappings, label, val, options = {}) {
  mappings.push({ label, val: dateValue(val), type: 'date', ...options })
}

function monthYearDateValue(value) {
  const raw = dateValue(value)
  const text = String(raw || '').trim()
  if (!text) return ''

  // DS-260 residence/address history only needs month + year.
  // Convert full dates like 20/10/1976 or 10/20/1976 to /10/1976
  // so the date renderer leaves the day cell blank.
  const parts = text.split(/[\/\-.]/).map(part => part.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const [a, b, c] = parts
    if (a.length === 4) return `/${b}/${a}`
    return `/${b}/${c}`
  }

  // Already month/year, for example /11/1997 or 11/1997.
  if (parts.length === 2) {
    return text.startsWith('/') ? text : `/${parts[0]}/${parts[1]}`
  }

  return text
}

function addMonthYearDate(mappings, label, val, options = {}) {
  mappings.push({ label, val: monthYearDateValue(val), type: 'date', ...options })
}


function parseSortDateScore(value) {
  const raw = dateValue(value)
  const text = String(raw || '').trim()
  if (!text) return Number.NEGATIVE_INFINITY

  const key = normalizeKey(text)
  if (['PRESENT', 'CURRENT', 'NOW', 'HIEN TAI', 'DEN NAY'].some(word => key.includes(word))) {
    return 99991231
  }

  const monthMap = MONTHS.reduce((acc, month, index) => {
    acc[month] = index + 1
    acc[month.slice(0, 3)] = index + 1
    return acc
  }, {})

  const normalized = text.replace(/,/g, ' ').trim()
  const upperText = normalized.toUpperCase()
  const monthWord = Object.keys(monthMap).find(name => upperText.includes(name))
  const numbers = normalized.match(/\d{1,4}/g) || []

  let year = 0
  let month = 0
  let day = 0

  if (monthWord) {
    month = monthMap[monthWord]
    const yearToken = numbers.find(num => num.length === 4)
    year = yearToken ? Number(yearToken) : 0
    const dayToken = numbers.find(num => num.length <= 2 && Number(num) >= 1 && Number(num) <= 31)
    day = dayToken ? Number(dayToken) : 0
  } else if (numbers.length >= 3) {
    const [aRaw, bRaw, cRaw] = numbers
    const a = Number(aRaw)
    const b = Number(bRaw)
    const c = Number(cRaw)

    if (aRaw.length === 4) {
      year = a
      month = b
      day = c
    } else if (cRaw.length === 4) {
      year = c
      if (a > 12 && b <= 12) {
        day = a
        month = b
      } else {
        month = a
        day = b
      }
    }
  } else if (numbers.length === 2) {
    const [aRaw, bRaw] = numbers
    const a = Number(aRaw)
    const b = Number(bRaw)

    if (aRaw.length === 4) {
      year = a
      month = b
    } else if (bRaw.length === 4) {
      month = a
      year = b
    }
  } else if (numbers.length === 1 && numbers[0].length === 4) {
    year = Number(numbers[0])
  }

  if (!year) return Number.NEGATIVE_INFINITY
  if (!month || month < 1 || month > 12) month = 1
  if (!day || day < 1 || day > 31) day = 1
  return year * 10000 + month * 100 + day
}

function sortByNewestPeriod(items = [], options = {}) {
  const startGetter = options.startGetter || periodStartDate
  const endGetter = options.endGetter || periodEndDate
  return [...items].sort((a, b) => {
    const bEnd = parseSortDateScore(endGetter(b))
    const aEnd = parseSortDateScore(endGetter(a))
    if (bEnd !== aEnd) return bEnd - aEnd

    const bStart = parseSortDateScore(startGetter(b))
    const aStart = parseSortDateScore(startGetter(a))
    if (bStart !== aStart) return bStart - aStart

    return 0
  })
}

function previousSpouseSortStartDate(spouse = {}) {
  return firstValue(spouse.marriageDate, spouse.birthDate)
}

function previousSpouseSortEndDate(spouse = {}) {
  return firstValue(spouse.marriageEndDate, spouse.marriageDate, spouse.birthDate)
}

function addPhone3(mappings, label, value, options = {}) {
  const parts = phoneParts(value)
  parts.forEach((part, index) => mappings.push({ label, val: part, cellIndex: index, ...options }))
}

function addAddress(mappings, anchor, addr, labels = {}) {
  const labelMap = {
    street: 'Street Address',
    city: 'City',
    province: 'State/Province',
    zip: 'Postal Zone/ZIP Code',
    country: 'Country/Region',
    ...labels
  }
  const force = !!labels.force
  mappings.push({ label: labelMap.street, val: addr.street, after: anchor, force })
  mappings.push({ label: labelMap.city, val: addr.city, after: anchor, force })
  mappings.push({ label: labelMap.province, val: addr.province, after: anchor, force })
  mappings.push({ label: labelMap.zip, val: addr.zip, after: anchor, force })
  mappings.push({ label: labelMap.country, val: addr.country, after: anchor, force })
}

function addFamilyCurrentAddress(mappings, afterLivingQuestion, addr) {
  // Các nhãn City/State/Country bị lặp nhiều lần trong DS-260.
  // Phải neo theo dòng "Is your father/mother still living" để ghi đúng cụm
  // Current Address của cha/mẹ, không ghi nhầm vào City of Birth hoặc cụm khác.
  mappings.push({ label: 'Current Address', val: addr.street, after: afterLivingQuestion, force: true })
  mappings.push({ label: 'City', val: addr.city, after: afterLivingQuestion, force: true })
  mappings.push({ label: 'State/Province', val: addr.province, after: afterLivingQuestion, force: true })
  mappings.push({ label: 'Postal Zone/ZIP Code', val: addr.zip, after: afterLivingQuestion, force: true })
  mappings.push({ label: 'Country/Region', val: addr.country, after: afterLivingQuestion, force: true })
}

function periodStartDate(item = {}) {
  return firstValue(item.dateFrom, item.fromDate, item.startDate, item.from, item.ngayBatDau, item.tuNgay)
}

function periodEndDate(item = {}) {
  return firstValue(item.dateTo, item.toDate, item.endDate, item.to, item.ngayKetThuc, item.denNgay)
}

function hasCompleteResidencePeriod(item = {}) {
  return Boolean(periodStartDate(item) && periodEndDate(item))
}

function residenceAddress(item = {}) {
  return {
    street: firstRealValue(item.street, item.address, item.addressLine1),
    city: firstRealValue(item.city, item.town, item.district),
    province: firstRealValue(item.province, item.state),
    zip: firstRealValue(item.zipCode, item.zip, item.postalCode),
    country: firstRealValue(item.country)
  }
}

function hasResidenceAddress(item = {}) {
  return Object.values(residenceAddress(item)).some(Boolean)
}

function isCurrentResidence(item = {}) {
  return hasResidenceAddress(item) && Boolean(periodStartDate(item)) && !periodEndDate(item)
}

function getCurrentResidence(items = []) {
  const currentItems = items.filter(isCurrentResidence)
  if (!currentItems.length) return null
  return sortByNewestPeriod(currentItems, {
    startGetter: periodStartDate,
    endGetter: () => 'PRESENT'
  })[0]
}

function mapPeriodAddress(mappings, anchor, item, occurrence = 1, prefixStreet = 'Street Address') {
  const repeatIndex = ['ĐỊA CHỈ CŨ', 'CÔNG VIỆC TRƯỚC ĐÂY'].includes(anchor) ? occurrence : undefined
  const addr = residenceAddress(item)
  mappings.push({ label: prefixStreet, val: addr.street, after: anchor, occurrence, repeatIndex })
  mappings.push({ label: 'City', val: addr.city, after: anchor, occurrence, repeatIndex })
  mappings.push({ label: 'State/Province', val: addr.province, after: anchor, occurrence, repeatIndex })
  mappings.push({ label: 'Postal Zone/ZIP Code', val: addr.zip, after: anchor, occurrence, repeatIndex })
  mappings.push({ label: 'Country/Region', val: addr.country, after: anchor, occurrence, repeatIndex })
}

export function buildDS260Mappings(data = {}) {
  const mappings = []
  const applicantName = normalizeApplicantNameParts(data)
  const fullName = applicantName.fullName
  const birthPlace = getCompositePlace(data, 'birthPlace')
  const residenceItems = records(data.residenceHistory)
  const currentResidence = getCurrentResidence(residenceItems)
  const currentAddress = currentResidence ? residenceAddress(currentResidence) : getCompositeAddress(data, 'currentAddressVN')
  const currentAddressStartDate = currentResidence ? periodStartDate(currentResidence) : data.currentAddressStartDate
  const mailingAddress = getCompositeAddress(data, 'mailingAddressVN')
  const plannedAddress = getCompositeAddress(data, 'plannedAddressUS', true)
  const greenCardAddress = getCompositeAddress(data, 'greenCardAddressUS', true)
  const sponsorAddress = getCompositeAddress(data, 'sponsorAddress', true)
  const maritalStatus = normalizeMaritalStatus(data.maritalStatus)

  // 1. Thông tin cá nhân
  mappings.push({ label: 'Surnames', val: upper(applicantName.lastName), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Given Names', val: upper(applicantName.givenNames), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Full Name in Native Language', val: upper(fullName), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Other Names Used', val: buildOtherNamesUsed(data), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Sex', val: normalizeGender(data.gender), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Current Marital Status', val: maritalStatus, after: 'THÔNG TIN CÁ NHÂN' })
  addDate(mappings, 'Date of Birth', data.birthDate, { after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'City of Birth', val: upper(birthPlace.city), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'State/Province of Birth', val: upper(birthPlace.province), after: 'THÔNG TIN CÁ NHÂN' })
  mappings.push({ label: 'Country/Region of Birth', val: upper(firstValue(birthPlace.country, 'VIETNAM')), after: 'THÔNG TIN CÁ NHÂN' })

  // 2. Quốc tịch / giấy tờ
  mappings.push({ label: 'Country/Region of Origin', val: upper(firstValue(data.nationality, 'VIETNAM')), after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Document Type', val: firstValue(data.documentType, data.passportNumber ? 'PASSPORT' : ''), after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Document ID', val: upper(firstValue(data.passportNumber, data.passportNumberVN, data.documentId)), after: 'QUỐC TỊCH' })
  addDate(mappings, 'Issuance Date', firstValue(data.passportIssueDate, data.documentIssueDate), { after: 'QUỐC TỊCH' })
  addDate(mappings, 'Expiration Date', firstValue(data.passportExpiryDate, data.documentExpiryDate), { after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Do you hold or have you held any nationality other than the one you have indicated above?', val: asYesNo(data.otherNationality), after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Other Country/Region of Origin', val: upper(data.otherCountryName), after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Do you hold a passport from the country/region of origin', val: data.otherCountryName ? asYesNo(data.otherPassportNumber ? 'YES' : 'NO') : '', after: 'QUỐC TỊCH' })
  mappings.push({ label: 'Passport Number', val: upper(data.otherPassportNumber), after: 'QUỐC TỊCH' })

  // Hộ chiếu khác trong 15 năm qua. Nhãn 'Passport Number' trùng với dòng của mục trên nên các dòng
  // này phải neo theo câu hỏi + repeatIndex (khối (1)(2)...) thay vì theo tiêu đề mục QUỐC TỊCH.
  const otherPassports = records(data.otherPassports15YearsList)
  mappings.push({
    label: OTHER_PASSPORT_QUESTION_LABEL,
    val: asYesNo(data.hasOtherPassports15Years, otherPassports.length ? 'YES' : ''),
    after: 'QUỐC TỊCH'
  })
  otherPassports.forEach((item, index) => {
    const occurrence = index + 1
    mappings.push({
      label: 'Country/Region of Issuance',
      val: upper(firstValue(item.issuingCountry, item.country, item.countryName)),
      after: OTHER_PASSPORT_QUESTION_LABEL,
      occurrence,
      repeatIndex: occurrence
    })
    mappings.push({
      label: 'Passport Number',
      val: upper(firstValue(item.passportNumber, item.number, item.passport)),
      after: OTHER_PASSPORT_QUESTION_LABEL,
      occurrence,
      repeatIndex: occurrence
    })
  })

  // 3. Địa chỉ hiện tại và địa chỉ cũ
  addAddress(mappings, 'ĐỊA CHỈ HIỆN TẠI', currentAddress, { zip: 'Postal Zone/ZIP Code' })
  mappings.push({ label: 'Postal Zone/ZIP Code', val: firstValue(currentAddress.zip, 'DOES NOT APPLY'), after: 'ĐỊA CHỈ HIỆN TẠI', force: true })
  addMonthYearDate(mappings, 'From', currentAddressStartDate, { after: 'ĐỊA CHỈ HIỆN TẠI' })

  const oldAddresses = sortByNewestPeriod(residenceItems.filter(hasCompleteResidencePeriod))
  mappings.push({ label: 'Have you lived anywhere other than this address since the age of sixteen?', val: asYesNo(oldAddresses.length ? 'YES' : data.foreignStayOver6Months, oldAddresses.length ? 'YES' : ''), after: 'ĐỊA CHỈ CŨ' })
  oldAddresses.forEach((item, index) => {
    const occurrence = index + 1
    mapPeriodAddress(mappings, 'ĐỊA CHỈ CŨ', item, occurrence)
    addMonthYearDate(mappings, 'From', periodStartDate(item), { after: 'ĐỊA CHỈ CŨ', occurrence, repeatIndex: occurrence })
    addMonthYearDate(mappings, 'To', periodEndDate(item), { after: 'ĐỊA CHỈ CŨ', occurrence, repeatIndex: occurrence })
  })

  // 4. Liên hệ
  mappings.push({ label: 'Primary Phone Number', val: data.primaryPhone, after: 'SỐ ĐIỆN THOẠI' })
  mappings.push({ label: 'Secondary Phone Number', val: data.secondaryPhone, after: 'SỐ ĐIỆN THOẠI' })
  const previousPhones = splitList(data.previousPhones)
  mappings.push({ label: 'Have you used any other telephone numbers during the last five years', val: previousPhones.length ? 'YES' : 'NO', after: 'SỐ ĐIỆN THOẠI' })
  previousPhones.forEach((phone, index) => {
    const occurrence = index + 1
    mappings.push({ label: 'Additional Phone Number', val: phone, after: 'SỐ ĐIỆN THOẠI', occurrence, repeatIndex: occurrence })
  })

  mappings.push({ label: 'Email Address', val: data.primaryEmail, after: 'ĐỊA CHỈ EMAIL' })
  const previousEmails = splitList(data.previousEmails)
  mappings.push({ label: 'Have you used any other email addresses during the last five years', val: previousEmails.length ? 'YES' : 'NO', after: 'ĐỊA CHỈ EMAIL' })
  previousEmails.forEach((email, index) => {
    const repeatIndex = index + 1
    mappings.push({ label: 'Email Address', val: email, after: 'ĐỊA CHỈ EMAIL', occurrence: index + 2, repeatIndex })
  })

  const socials = parseSocial(data.listSocialNetworks)
  socials.forEach((item, index) => {
    mappings.push({ label: 'Social Media Provider/Platform', val: upper(item.platform), after: 'MẠNG XÃ HỘI', occurrence: index + 1 })
    mappings.push({ label: 'Social Media Identifier', val: item.id, after: 'MẠNG XÃ HỘI', occurrence: index + 1 })
  })
  const otherSocials = parseOtherSocial(data)
  mappings.push({ label: 'Other Social Media', val: asYesNoStrict(data.otherSocialMedia) || (otherSocials.length ? 'YES' : ''), after: 'MẠNG XÃ HỘI', force: true })
  otherSocials.forEach((item, index) => {
    const occurrence = index + 1
    mappings.push({ label: 'Social Media Provider/Platform', val: upper(item.platform), after: 'Other Social Media', occurrence, repeatIndex: occurrence })
    mappings.push({ label: 'Social Media Identifier', val: item.id, after: 'Other Social Media', occurrence, repeatIndex: occurrence })
  })

  // 5. Địa chỉ nhận thư, địa chỉ Mỹ và thẻ xanh
  // Chọn YES (địa chỉ nhận thư trùng địa chỉ hiện tại) thì cả khối bên dưới để trống,
  // kể cả ô Phone Number - trước đây ô này luôn lấy primaryPhone nên vẫn hiện dù đã chọn YES.
  const mailingSameAsPresent = asYesNo(data.isMailingSameAsCurrent) === 'YES'
  mappings.push({ label: 'Is your Mailing Address the same as your Present Address?', val: asYesNo(data.isMailingSameAsCurrent), after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
  if (!mailingSameAsPresent) {
    mappings.push({ label: 'Address', val: mailingAddress.street, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
    mappings.push({ label: 'City', val: mailingAddress.city, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
    mappings.push({ label: 'State/Province', val: mailingAddress.province, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
    mappings.push({ label: 'Postal Zone/ZIP Code', val: mailingAddress.zip, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
    mappings.push({ label: 'Phone Number', val: data.primaryPhone, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
    mappings.push({ label: 'Country/Region', val: mailingAddress.country, after: 'ĐỊA CHỈ NHẬN THƯ Ở VN' })
  }

  mappings.push({ label: 'Name of person currently living at address', val: upper(firstValue(data.contactNameUS, data.sponsorFullName)), after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'U.S. Address', val: plannedAddress.street, after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'City', val: plannedAddress.city, after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'State', val: plannedAddress.province, after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'Zipcode', val: plannedAddress.zip, after: 'ĐỊA CHỈ Ở MỸ' })
  addPhone3(mappings, 'Phone Number', firstValue(data.contactPhoneUS, data.sponsorPhone), { after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'Is this address where you want your Permanent Residence Card', val: asYesNo(data.isGreenCardAddressSameAsPlanned), after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'Name of person currently living at address', val: upper(data.alternateContactNameUS), after: 'ĐỊA CHỈ Ở MỸ', occurrence: 2 })
  mappings.push({ label: 'U.S. Street Address', val: greenCardAddress.street, after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'City', val: greenCardAddress.city, after: 'ĐỊA CHỈ Ở MỸ', occurrence: 2 })
  mappings.push({ label: 'State', val: greenCardAddress.province, after: 'ĐỊA CHỈ Ở MỸ', occurrence: 2 })
  mappings.push({ label: 'ZIP Code', val: greenCardAddress.zip, after: 'ĐỊA CHỈ Ở MỸ' })
  mappings.push({ label: 'Phone Number', val: data.alternateContactPhoneUS, after: 'ĐỊA CHỈ Ở MỸ', occurrence: 2 })

  // 6. Cha mẹ
  const emptyAddress = { street: '', city: '', province: '', zip: '', country: '' }

  const fatherName = splitName(data.fatherFullName)
  const fatherBirth = getCompositePlace(data, 'fatherBirthPlace')
  const fatherLivingStatus = asYesNo(data.fatherIsAlive)
  const fatherAddress = fatherLivingStatus === 'YES'
    ? getFamilyCurrentAddress(data, 'fatherCurrentAddress', fatherBirth)
    : emptyAddress
  mappings.push({ label: "Father's Surnames", val: upper(fatherName.last), after: 'THÔNG TIN CHA' })
  mappings.push({ label: "Father's Given Names", val: upper([fatherName.middle, fatherName.first].filter(Boolean).join(' ')), after: 'THÔNG TIN CHA' })
  addDate(mappings, 'Date of Birth', data.fatherBirthDate, { after: 'THÔNG TIN CHA' })
  mappings.push({ label: 'City of Birth', val: fatherBirth.city, after: 'THÔNG TIN CHA' })
  mappings.push({ label: 'State/Province of Birth', val: fatherBirth.province, after: 'THÔNG TIN CHA' })
  mappings.push({ label: 'Country/Region of Birth', val: fatherBirth.country, after: 'THÔNG TIN CHA' })
  mappings.push({ label: 'Is your father still living', val: fatherLivingStatus, after: 'THÔNG TIN CHA' })
  addFamilyCurrentAddress(mappings, 'Is your father still living', fatherAddress)
  mappings.push({ label: 'Year of Death', val: data.fatherDeathYear, after: 'THÔNG TIN CHA' })

  const motherName = splitName(data.motherFullName)
  const motherBirth = getCompositePlace(data, 'motherBirthPlace')
  const motherLivingStatus = asYesNo(data.motherIsAlive)
  const motherAddress = motherLivingStatus === 'YES'
    ? getFamilyCurrentAddress(data, 'motherCurrentAddress', motherBirth)
    : emptyAddress
  mappings.push({ label: "Mother's Surnames at Birth", val: upper(motherName.last), after: 'THÔNG TIN MẸ' })
  mappings.push({ label: "Mother's Given Names", val: upper([motherName.middle, motherName.first].filter(Boolean).join(' ')), after: 'THÔNG TIN MẸ' })
  addDate(mappings, 'Date of Birth', data.motherBirthDate, { after: 'THÔNG TIN MẸ' })
  mappings.push({ label: 'City of Birth', val: motherBirth.city, after: 'THÔNG TIN MẸ' })
  mappings.push({ label: 'State/Province of Birth', val: motherBirth.province, after: 'THÔNG TIN MẸ' })
  mappings.push({ label: 'Country/Region of Birth', val: motherBirth.country, after: 'THÔNG TIN MẸ' })
  mappings.push({ label: 'Is your mother still living', val: motherLivingStatus, after: 'THÔNG TIN MẸ' })
  addFamilyCurrentAddress(mappings, 'Is your mother still living', motherAddress)
  mappings.push({ label: 'Year of Death', val: data.motherDeathYear, after: 'THÔNG TIN MẸ' })

  // 7. Hôn nhân hiện tại và hôn nhân cũ
  const hasCurrentSpouse = maritalStatus === 'MARRIED'
  // Chỉ lấy các field spouse*. Không fallback về fullName/customerName vì đó là tên đương đơn.
  const spouseName = hasCurrentSpouse ? splitName(fullNameFromPrefixedParts(data, ['spouse'])) : { last: '', middle: '', first: '' }
  const spouseBirth = hasCurrentSpouse ? getCompositePlace(data, 'spouseBirthPlace') : emptyAddress
  const spouseAddress = hasCurrentSpouse ? getCompositeAddress(data, 'spouseCurrentAddress') : emptyAddress
  const marriagePlace = hasCurrentSpouse ? getCompositePlace(data, 'marriagePlace') : emptyAddress
  mappings.push({ label: "Spouse or Civil/Domestic Partner's Surnames at Birth", val: upper(spouseName.last), after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: "Spouse or Civil/Domestic Partner's Given Names", val: upper([spouseName.middle, spouseName.first].filter(Boolean).join(' ')), after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  addDate(mappings, "Spouse or Civil/Domestic Partner's Date of Birth", data.spouseBirthDate, { after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: "Spouse or Civil/Domestic Partner's City of Birth", val: spouseBirth.city, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: "Spouse or Civil/Domestic Partner's State/Province of Birth", val: spouseBirth.province, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: "Spouse or Civil/Domestic Partner's Country/Region of Birth", val: spouseBirth.country, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Nationality', val: hasCurrentSpouse ? upper(data.spouseNationality) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: "Spouse or Civil/Domestic Partner's Address", val: hasRecord(spouseAddress) ? 'OTHER' : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  addAddress(mappings, "Spouse or Civil/Domestic Partner's Address", spouseAddress, { street: 'Current Address' })
  mappings.push({ label: 'Occupation', val: hasCurrentSpouse ? data.spouseOccupation : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  addDate(mappings, 'Date of Marriage', hasCurrentSpouse ? data.marriageDate : '', { after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Marriage City', val: marriagePlace.city, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Marriage State/Province', val: marriagePlace.province, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Marriage Country/Region', val: marriagePlace.country, after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Is your spouse or civil/domestic partner immigrating to the U.S. with you?', val: hasCurrentSpouse ? asYesNo(data.spouseImmigratingWithYou) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI' })
  mappings.push({ label: 'Is your spouse or civil/domestic partner immigrating to the U.S. at a later date to join you?', val: hasCurrentSpouse ? asYesNo(data.spouseImmigratingLater) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI' })

  const previousSpouses = sortByNewestPeriod(parsePreviousSpouses(data), {
    startGetter: previousSpouseSortStartDate,
    endGetter: previousSpouseSortEndDate
  })
  const previousSpouseCount = previousSpouses.length || (data.marriageCount ? Math.max(0, Number(data.marriageCount) - 1) : '')
  mappings.push({ label: 'Do you have any Previous Spouses?', val: previousSpouses.length ? 'YES' : asYesNo(data.hasPreviousSpouses), after: 'CUỘC HÔN NHÂN CŨ' })
  mappings.push({ label: 'Number of Previous spouses', val: previousSpouseCount, after: 'CUỘC HÔN NHÂN CŨ' })
  previousSpouses.forEach((spouse, index) => {
    const occurrence = index + 1
    const options = { after: 'CUỘC HÔN NHÂN CŨ', occurrence, ...(occurrence > 1 ? { repeatIndex: occurrence } : {}) }
    mappings.push({ label: 'Surnames', val: spouse.surname, ...options })
    mappings.push({ label: 'Given Names', val: spouse.givenNames, ...options })
    addDate(mappings, 'Date of birth', spouse.birthDate, options)
    mappings.push({ label: 'Nationality', val: upper(spouse.nationality), ...options })
    addDate(mappings, 'Date of Marriage', spouse.marriageDate, options)
    addDate(mappings, 'Date Marriage Ended', spouse.marriageEndDate, options)
    mappings.push({ label: 'How was your marriage terminated', val: normalizeMarriageTermination(spouse.marriageEndReason), ...options })
    mappings.push({ label: 'Country/Region where marriage was terminated', val: spouse.terminatedCountry, ...options })
  })

  // 8. Con cái
  const children = parseChildrenFromData(data)
  mappings.push({ label: 'Do you have any children', val: children.length ? 'YES' : asYesNo(data.hasChildren), after: 'CON CÁI' })
  mappings.push({ label: 'Number of Children', val: children.length || data.numberOfChildren, after: 'CON CÁI' })
  children.forEach((child, index) => {
    const occurrence = index + 1
    const childOptions = { after: 'CON CÁI', occurrence, repeatIndex: occurrence }
    const birthRepeat = { ...childOptions, repeatOccurrence: 1 }
    const addressRepeat = { ...childOptions, repeatOccurrence: 2 }

    mappings.push({ label: 'Child Surnames', val: child.lastName || child.last, ...childOptions })
    mappings.push({ label: 'Child Given Names', val: [child.middleName || child.middle, child.firstName || child.first].filter(Boolean).join(' '), ...childOptions })
    addDate(mappings, 'Date of Birth', child.birthDate, childOptions)
    mappings.push({ label: 'City', val: child.city, ...birthRepeat })
    mappings.push({ label: 'State/Province', val: child.province || child.state, ...birthRepeat })
    mappings.push({ label: 'Country/Region', val: child.country, ...birthRepeat })
    mappings.push({ label: 'Does this child live with you?', val: asYesNo(child.isLivingWithYou), ...childOptions })
    const childAddress = child.address || addressParts(child.addressText || '', false)
    mappings.push({ label: 'Current Address', val: childAddress.street, ...childOptions })
    mappings.push({ label: 'City', val: childAddress.city, ...addressRepeat })
    mappings.push({ label: 'State/Province', val: childAddress.province, ...addressRepeat })
    mappings.push({ label: 'Postal Zone/ZIP Code', val: childAddress.zip, ...childOptions })
    mappings.push({ label: 'Country/Region', val: childAddress.country, ...addressRepeat })
    mappings.push({ label: 'Is this child immigrating to the U.S. with you?', val: asYesNo(child.isImmigratingWithYou), ...childOptions })
    mappings.push({ label: 'Is this child immigrating to the U.S. at a later date to join you?', val: asYesNo(child.isImmigratingLater), ...childOptions })
  })

  // 9. Visa Mỹ trước đây
  // Dùng yes/no strict cho các checkbox phần này:
  // - Có dữ liệu rõ ràng Có/Đã từng/YES => YES
  // - Có dữ liệu rõ ràng Không/Chưa từng/NO => NO
  // - Trống/không rõ => để trống, không tự đoán NO
  const hasANumberAnswer = yesNoFromExplicitOrNumber(data.hasANumber, data.aNumber)
  const hasUSVisaAnswer = asYesNoStrict(data.hasBeenIssuedUSVisa)
  const visaLostOrStolenAnswer = asYesNoStrict(firstValue(data.visaLostStolenUS, data.usVisaLostStolen, data.visaLostRevokedUS))
  const visaCancelledOrRevokedAnswer = asYesNoStrict(firstValue(data.visaCancelledRevokedUS, data.usVisaCancelledRevoked, data.visaLostRevokedUS))
  const visaRefusedAnswer = asYesNoStrict(data.visaDeniedUS)

  mappings.push({ label: 'Have you ever been in the U.S.?', val: asYesNoStrict(data.enteredUSBefore), after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Were you issued an Alien Registration Number', val: hasANumberAnswer, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Alien Registration Number', val: data.aNumber, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  const arrivals = parseArrivals(data.usArrivalsList)
  const arrivalList = arrivals.length ? arrivals : [{}]
  arrivalList.forEach((arrival, index) => {
    const occurrence = index + 1
    const options = {
      after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY',
      occurrence,
      ...(occurrence > 1 ? { repeatIndex: occurrence } : {})
    }
    addDate(mappings, 'Date Arrived', arrival.date, options)
    mappings.push({ label: 'Length of Stay', val: normalizeStayDuration(arrival.length), ...options })
  })
  mappings.push({ label: 'Have you ever been issued a US Visa?', val: hasUSVisaAnswer, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  addDate(mappings, 'Date issued', data.issuedUSVisaDate, { after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Visa classification', val: data.issuedUSVisaClass, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Visa number', val: data.issuedUSVisaNumber, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Have any your US visa ever beeb lost or stolen?', val: visaLostOrStolenAnswer, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Explain', val: firstValue(data.visaLostStolenDetailsUS, data.visaLostRevokedDetailsUS), after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Have any of your U.S visas ever been cancelled or revoked', val: visaCancelledOrRevokedAnswer, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Have you ever been refused a US Visa', val: visaRefusedAnswer, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY' })
  mappings.push({ label: 'Explain', val: data.visaDeniedDetailsUS, after: 'THÔNG TIN VISA MỸ TRƯỚC ĐÂY', occurrence: 3 })

  // 10. Công việc, học vấn, du lịch, quân đội
  const jobs = records(data.jobsTenYears)
  const currentJob = jobs[0] || {}
  mappings.push({ label: 'Primary Occupation', val: currentJob.occupation, after: 'CÔNG VIỆC HIỆN TẠI' })
  mappings.push({ label: 'Present Employer or School Name', val: currentJob.employer, after: 'CÔNG VIỆC HIỆN TẠI' })
  mapPeriodAddress(mappings, 'CÔNG VIỆC HIỆN TẠI', currentJob, 1)
  mappings.push({ label: 'Do you have other occupations?', val: jobs.length > 1 ? 'YES' : asYesNo(data.hasOtherOccupations), after: 'CÔNG VIỆC HIỆN TẠI' })
  const otherJob = jobs[1] || {}
  mappings.push({ label: 'Primary Occupation', val: otherJob.occupation, after: 'CÔNG VIỆC HIỆN TẠI', occurrence: 2 })
  mappings.push({ label: 'Present Employer or School Name', val: otherJob.employer, after: 'CÔNG VIỆC HIỆN TẠI', occurrence: 2 })
  mapPeriodAddress(mappings, 'CÔNG VIỆC HIỆN TẠI', otherJob, 2)
  mappings.push({ label: 'In which occupation do you intend to work in the.US?', val: data.intendedOccupationUS, after: 'CÔNG VIỆC HIỆN TẠI' })

  const previousJobs = sortByNewestPeriod(records(data.previousJobs))
  mappings.push({ label: 'Were you previously employed?', val: previousJobs.length ? 'YES' : asYesNo(data.hasPreviousJobs), after: 'CÔNG VIỆC TRƯỚC ĐÂY' })
  previousJobs.forEach((job, index) => {
    const occurrence = index + 1
    mappings.push({ label: 'Employer Name', val: job.employer, after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence })
    mapPeriodAddress(mappings, 'CÔNG VIỆC TRƯỚC ĐÂY', job, occurrence, 'Employer Street Address')
    mappings.push({ label: 'Telephone Number', val: job.phone || data.primaryPhone, after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence })
    mappings.push({ label: 'Job Title', val: job.occupation, after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence })
    mappings.push({ label: "Supervisor's Surnames", val: 'DOES NOT APPLY', after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence, force: true })
    mappings.push({ label: "Supervisor's Given Names", val: 'DOES NOT APPLY', after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence, force: true })
    addDate(mappings, 'From', job.dateFrom, { after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence })
    addDate(mappings, 'To', job.dateTo, { after: 'CÔNG VIỆC TRƯỚC ĐÂY', occurrence, repeatIndex: occurrence })
  })

  const schools = sortByNewestPeriod(records(data.schoolList))
  mappings.push({ label: 'Have you attended any educational institutions at a secondary level or above?', val: schools.length ? 'YES' : '', after: 'CÁC TRƯỜNG ĐÃ HỌC' })
  mappings.push({ label: 'Number of Educational Institutions Attended', val: schools.length || '', after: 'CÁC TRƯỜNG ĐÃ HỌC' })
  // Khong cat con 2 truong nua: syncEducationRows() da dung du block theo schoolList,
  // truoc day slice(0, 2) lam o "Number of Educational Institutions Attended" ghi 3 nhung
  // chi 2 truong duoc fill.
  schools.forEach((school, index) => {
    const occurrence = index + 1
    mappings.push({ label: 'Name of Institution', val: school.name, after: 'CÁC TRƯỜNG ĐÃ HỌC', occurrence })
    mapPeriodAddress(mappings, 'CÁC TRƯỜNG ĐÃ HỌC', school, occurrence)
    mappings.push({ label: 'Course of Study', val: school.course, after: 'CÁC TRƯỜNG ĐÃ HỌC', occurrence })
    mappings.push({ label: 'Degree, Diploma or Certificate Received', val: school.degree, after: 'CÁC TRƯỜNG ĐÃ HỌC', occurrence })
    addDate(mappings, 'From', school.dateFrom, { after: 'CÁC TRƯỜNG ĐÃ HỌC', occurrence })
    addDate(mappings, 'To', school.dateTo, { after: 'CÁC TRƯỜNG ĐÃ HỌC', occurrence })
  })

  const countryTrips = records(data.countriesVisited5YearsList).length
    ? records(data.countriesVisited5YearsList)
    : splitList(data.countriesVisited5YearsList).map(name => ({ countryName: name }))
  mappings.push({ label: 'Have you traveled to any countries/regions', val: countryTrips.length ? 'YES' : asYesNo(data.hasVisitedOtherCountries5Years), after: 'DU LỊCH NƯỚC NGOÀI' })
  countryTrips.forEach((trip, index) => {
    const occurrence = index + 1
    const tripOptions = { after: 'DU LỊCH NƯỚC NGOÀI', occurrence, repeatIndex: occurrence }
    mappings.push({ label: 'Name of Country/Region', val: upper(firstValue(trip.countryName, trip.name, trip.country)), ...tripOptions })
    mappings.push({ label: 'Locations', val: upper(firstValue(trip.citiesVisited, trip.locations, trip.cities)), ...tripOptions })
    addDate(mappings, 'Date Arrived', firstValue(trip.arrivalDate, trip.dateArrived), tripOptions)
    mappings.push({ label: 'Length of Stay', val: normalizeStayDuration(firstValue(trip.lengthOfStay, trip.stayDuration, trip.duration)), type: 'duration', ...tripOptions })
    mappings.push({ label: 'Person/Entity Who Paid for Trip', val: normalizeTripPayer(firstValue(trip.tripPayer, trip.paidBy, trip.payer)), ...tripOptions })
  })

  // Anh chị em (mục mới theo bản Word VER02): form lưu ở siblingsList.
  const siblingRecords = records(data.siblingsList)
  mappings.push({ label: 'Do you have any siblings', val: siblingRecords.length ? 'YES' : asYesNo(data.hasSiblings), after: 'THÔNG TIN ANH CHỊ EM' })
  mappings.push({ label: 'Number of Siblings', val: siblingRecords.length || data.siblingsCount, after: 'THÔNG TIN ANH CHỊ EM' })
  siblingRecords.forEach((sibling, index) => {
    const occurrence = index + 1
    const siblingOptions = { after: 'THÔNG TIN ANH CHỊ EM', occurrence, repeatIndex: occurrence }
    const siblingName = splitName(firstValue(
      [sibling.lastName, sibling.middleName, sibling.firstName].filter(Boolean).join(' '),
      sibling.fullName,
      sibling.name
    ))
    mappings.push({ label: 'Siblings Surnames', val: upper(firstValue(sibling.lastName, siblingName.last)), ...siblingOptions })
    mappings.push({ label: 'Siblings Given Names', val: upper(firstValue([sibling.middleName, sibling.firstName].filter(Boolean).join(' '), [siblingName.middle, siblingName.first].filter(Boolean).join(' '))), ...siblingOptions })
    addDate(mappings, 'Date of Birth', firstValue(sibling.birthDate, sibling.dateOfBirth), siblingOptions)
    mappings.push({ label: 'Nationality', val: upper(firstValue(sibling.nationality, sibling.quocTich)), ...siblingOptions })
  })

  mappings.push({ label: 'Have you ever served in the military?', val: asYesNo(data.servedMilitary), after: 'ĐẢNG / QUÂN ĐỘI' })
  mappings.push({ label: 'Name of Country/Region', val: data.militaryCountry, after: 'ĐẢNG / QUÂN ĐỘI' })
  mappings.push({ label: 'Branch of Service', val: data.militaryBranch, after: 'ĐẢNG / QUÂN ĐỘI' })
  mappings.push({ label: 'Rank/Position', val: data.militaryRank, after: 'ĐẢNG / QUÂN ĐỘI' })
  mappings.push({ label: 'Military Specialty', val: data.militaryUnit, after: 'ĐẢNG / QUÂN ĐỘI' })
  addDate(mappings, 'From', data.militaryEnlistmentDate, { after: 'ĐẢNG / QUÂN ĐỘI' })
  addDate(mappings, 'To', data.militaryDischargeDate, { after: 'ĐẢNG / QUÂN ĐỘI' })
  mappings.push({ label: 'Organization Name', val: firstValue(data.partyRole, data.partyLeaveReason), after: 'CÂU HỎI THÊM CHO NAM' })
  mappings.push({ label: 'Do you have any specialized skills or training', val: 'NO', after: 'CÂU HỎI THÊM CHO NAM', force: true })
  mappings.push({ label: 'Have you ever served in, been a member of, or been involved with a paramilitary', val: 'NO', after: 'CÂU HỎI THÊM CHO NAM', force: true })
  mappings.push({ label: 'Can you speak and/or read language other than your native language', val: asYesNo(data.speakOtherLanguage), after: 'CÂU HỎI THÊM CHO NAM' })
  mappings.push({ label: 'List', val: data.otherLanguages, after: 'CÂU HỎI THÊM CHO NAM' })
  mappings.push({ label: 'Are you, or have you ever been a member of or affiliated with the Communist', val: asYesNo(data.communistPartyMember), after: 'CÂU HỎI THÊM CHO NAM' })
  mappings.push({ label: 'Are you or have you ever been a member or representative or a terrorist organization', val: asYesNo(data.terroristOrgMember), after: 'CÂU HỎI THÊM CHO NAM' })

  // 11. Người bảo lãnh
  const sponsorName = splitName(data.sponsorFullName)
  mappings.push({ label: 'Petitioner is my', val: data.sponsorRelationship, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Petitioner Surnames', val: sponsorName.last, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Petitioner Given Names', val: [sponsorName.middle, sponsorName.first].filter(Boolean).join(' '), after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Street Address', val: sponsorAddress.street, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'City', val: sponsorAddress.city, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'State/Province', val: sponsorAddress.province, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Postal Zone/ZIP Code', val: sponsorAddress.zip, after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Country/Region', val: sponsorAddress.country, after: 'NGƯỜI BẢO LÃNH' })
  addPhone3(mappings, 'Telephone', data.sponsorPhone, { after: 'NGƯỜI BẢO LÃNH' })
  addPhone3(mappings, 'Mobile/Cell Telephone', data.sponsorPhone, { after: 'NGƯỜI BẢO LÃNH' })
  mappings.push({ label: 'Email Address', val: data.sponsorEmail, after: 'NGƯỜI BẢO LÃNH' })

  return normalizeDS260Mappings(mappings)
    .filter(mapping => mapping.force || (mapping.val !== undefined && mapping.val !== null && String(mapping.val).trim() !== ''))
}

export function getDS260HeaderValues(data = {}) {
  return {
    customer: upperNoAccent(firstValue(
      data.fullName,
      [data.lastName, data.middleName, data.firstName].filter(Boolean).join(' '),
      data.customerName,
      data.applicantFullName
    )),
    hcm: firstValue(data.hcm, data.hcmNumber, data.HCM),
    id: firstValue(data.idNumber, data.caseId, data.caseNumber),
    mshs: firstValue(data.mshs, data.ms, data.receiptNumber, data.nvcCaseNumber)
  }
}
