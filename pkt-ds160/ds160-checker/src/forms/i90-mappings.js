function asText(value) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'object') return value.value ?? value.label ?? value.text ?? ''
  return String(value).trim()
}

function pick(...values) {
  for (const value of values) {
    const text = asText(value)
    if (text) return text
  }
  return ''
}

function normalizeKey(value) {
  return asText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function yesNo(value, isAffirmativeValue) {
  const raw = asText(value)
  if (!raw) return ''
  return isAffirmativeValue(raw) ? 'YES' : 'NO'
}

function iNeverReceivedCard(value, isAffirmativeValue) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('NEVER RECEIVED') || key.includes('KHONG BIET') || key.includes('KHONG NHAN DUOC')) {
    return 'I NEVER RECEIVED MY PREVIOUS CARD'
  }
  return yesNo(value, isAffirmativeValue)
}

function dateFromParts(month, day, year, fallback = '') {
  const m = pick(month)
  const d = pick(day)
  const y = pick(year)
  if (m && d && y) return `${m}/${d}/${y}`
  if (m && y) return `${m}/${y}`
  if (y) return y
  return pick(fallback)
}

function currentStatus(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('COMMUTER') || key.includes('DI LAM') || key.includes('CANADA') || key.includes('MEXICO')) {
    return 'PERMANENT RESIDENT IN COMMUTER STATUS'
  }
  if (key.includes('CONDITIONAL') || key.includes('CO DIEU KIEN') || key.includes('2 NAM')) {
    return 'CONDITIONAL PERMANENT RESIDENT'
  }
  if (key.includes('LAWFUL') || key.includes('PERMANENT') || key.includes('THUONG TRU')) {
    return 'LAWFUL PERMANENT RESIDENT'
  }
  return value
}

function reasonText(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('LOST') || key.includes('STOLEN') || key.includes('DESTROY') || key.includes('HU HAI') || key.includes('MAT') || key.includes('DANH CAP')) {
    return 'MY CARD HAS BEEN LOST, STOLEN, OR DESTROYED'
  }
  if (key.includes('NEVER RECEIVED') || key.includes('KHONG NHAN DUOC')) {
    return 'DHS ISSUED MY CARD BUT I NEVER RECEIVED IT'
  }
  if (key.includes('MUTILATED') || key.includes('CUT XEN') || key.includes('CAT XEN')) {
    return 'MY CARD HAS BEEN MUTILATED OR PARTIALLY DESTROYED'
  }
  if (key.includes('DHS') || key.includes('INCORRECT') || key.includes('SAI LECH')) {
    return 'MY CARD IS INCORRECT BECAUSE OF A DEPARTMENT OF HOMELAND SECURITY (DHS) ERROR'
  }
  if (key.includes('NAME') || key.includes('BIOGRAPHIC') || key.includes('THONG TIN') || key.includes('THAY DOI')) {
    return 'MY NAME OR OTHER BIOGRAPHIC INFORMATION HAS LEGALLY CHANGED'
  }
  if (key.includes('EXPIRED') || key.includes('EXPIRE') || key.includes('HET HAN') || key.includes('6 THANG')) {
    return 'MY CARD HAS EXPIRED OR WILL EXPIRE WITHIN 6 MONTHS'
  }
  if (key.includes('14') && key.includes('SAU') || key.includes('AFTER MY 16')) {
    return 'I AM 14 YEARS OLD AND MY CURRENT CARD WILL EXPIRE AFTER MY 16TH BIRTHDAY'
  }
  if (key.includes('14') && key.includes('TRUOC') || key.includes('BEFORE MY 16')) {
    return 'I AM 14 YEARS OLD AND MY CURRENT CARD WILL EXPIRE BEFORE MY 16TH BIRTHDAY'
  }
  if (key.includes('TAKING UP COMMUTER') || key.includes('DANG KY DIEN DI LAM')) {
    return 'I AM A PERMANENT RESIDENT WHO IS TAKING UP COMMUTER STATUS'
  }
  if (key.includes('ACTUAL RESIDENCE') || key.includes('DINH CU O MY')) {
    return 'I AM A COMMUTER AND I AM GOING TO TAKE UP RESIDENCE IN THE UNITED STATES'
  }
  if (key.includes('AUTOMATICALLY CONVERTED') || key.includes('TU DONG CHUYEN')) {
    return 'I HAVE BEEN AUTOMATICALLY CONVERTED TO A LAWFUL PERMANENT RESIDENT'
  }
  if (key.includes('OLD VERSION') || key.includes('PRIOR EDITION') || key.includes('PHIEN BAN CU') || key.includes('LY DO KHAC')) {
    return 'I HAVE A PRIOR EDITION OF THE ALIEN REGISTRATION CARD, OR I AM APPLYING TO REPLACE MY CURRENT PERMANENT RESIDENT CARD FOR A REASON THAT IS NOT SPECIFIED ABOVE'
  }
  return value
}

function gender(value) {
  const key = normalizeKey(value)
  if (key.includes('NU') || key.includes('FEMALE')) return 'FEMALE'
  if (key.includes('NAM') || key.includes('MALE')) return 'MALE'
  return value
}

function ethnicity(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('KHONG') || key.includes('NOT')) return 'NOT HISPANIC OR LATINO'
  if (key.includes('LATIN') || key.includes('HISPANIC')) return 'HISPANIC OR LATINO'
  return value
}

function race(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('ASIAN') || key.includes('CHAU A') || key.includes('DA VANG')) return 'ASIAN'
  if (key.includes('WHITE') || key.includes('DA TRANG')) return 'WHITE'
  if (key.includes('BLACK') || key.includes('AFRICAN') || key.includes('DA DEN')) return 'BLACK OR AFRICAN AMERICAN'
  if (key.includes('AMERICAN INDIAN') || key.includes('ALASKA')) return 'AMERICAN INDIAN OR ALASKA NATIVE'
  if (key.includes('HAWAII') || key.includes('PACIFIC')) return 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER'
  return value
}

function eyeColor(value) {
  const key = normalizeKey(value)
  if (key.includes('DEN') || key.includes('BLACK')) return 'BLACK'
  if (key.includes('NAU HAT DE') || key.includes('HAZEL')) return 'HAZEL'
  if (key.includes('NAU') || key.includes('BROWN')) return 'BROWN'
  if (key.includes('XANH DUONG') || key.includes('BLUE')) return 'BLUE'
  if (key.includes('XANH LA') || key.includes('GREEN')) return 'GREEN'
  if (key.includes('XAM') || key.includes('GRAY')) return 'GRAY'
  if (key.includes('HONG') || key.includes('PINK')) return 'PINK'
  if (key.includes('LUC VANG') || key.includes('MAROON')) return 'MAROON'
  if (key.includes('KHONG BIET') || key.includes('OTHER') || key.includes('UNKNOWN')) return 'UNKNOWN/OTHER'
  return value
}

function hairColor(value) {
  const key = normalizeKey(value)
  if (key.includes('DEN') || key.includes('BLACK')) return 'BLACK'
  if (key.includes('NAU') || key.includes('BROWN')) return 'BROWN'
  if (key.includes('VANG CAT') || key.includes('SANDY')) return 'SANDY BLONDE'
  if (key.includes('VANG') || key.includes('BLONDE')) return 'BLONDE'
  if (key.includes('DO') || key.includes('RED')) return 'RED'
  if (key.includes('TRANG') || key.includes('WHITE')) return 'WHITE'
  if (key.includes('XAM') || key.includes('GRAY')) return 'GRAY'
  if (key.includes('TROC') || key.includes('BALD')) return 'BALD (NO HAIR)'
  if (key.includes('KHONG BIET') || key.includes('OTHER') || key.includes('UNKNOWN')) return 'UNKNOWN/OTHER'
  return value
}

function splitHeight(value) {
  const raw = asText(value)
  const nums = raw.match(/\d+(?:\.\d+)?/g) || []
  if (!nums.length) return { feet: '', inches: '' }
  return { feet: nums[0] || '', inches: nums[1] || '' }
}

function fillHeightCells(firstCell, value) {
  if (!firstCell) return
  const parts = splitHeight(value)
  const isUnitCell = (cell) => {
    const text = normalizeKey(cell?.textContent || '')
    return text === 'FEET' || text === 'FOOT' || text === 'INCHES' || text === 'INCH'
  }
  const fill = (cell, val) => {
    if (!cell || val === undefined || val === null || String(val).trim() === '') return
    cell.innerHTML = val
    cell.dataset.filled = 'true'
    cell.dataset.filledValue = val
    cell.classList.add('color-customer')
  }

  // Row trong i90.html có cấu trúc: [ô nhập Feet] [chữ Feet] [ô nhập Inches] [chữ Inches].
  // Vì các ô label Feet/Inches cũng nằm trong vùng THÔNG TIN nên bị gắn class data-cell.
  // Do đó phải bỏ qua ô unit label, không được ghi đè làm mất chữ Feet/Inches.
  fill(firstCell, parts.feet)

  let next = firstCell.nextElementSibling
  while (next && (!next.classList.contains('data-cell') || isUnitCell(next))) {
    next = next.nextElementSibling
  }
  if (next) fill(next, parts.inches)
}

function fullName(data) {
  return [pick(data.legal_last_name, data.lastName, data.last_name), pick(data.legal_middle_name, data.middleName, data.middle_name), pick(data.legal_first_name, data.firstName, data.first_name)]
    .filter(Boolean)
    .join(' ')
}

export function buildI90Mappings(data = {}, helpers = {}) {
  const { fillDateCells, isAffirmativeValue = () => false } = helpers
  const birthDate = dateFromParts(data.date_of_birth_month, data.date_of_birth_day, data.date_of_birth_year, data.birthDate, data.dateOfBirth)
  const entryDate = dateFromParts(data.date_of_entry_month, data.date_of_entry_day, data.date_of_entry_year, data.dateOfAdmission, data.admissionDate)
  const reason = reasonText(pick(data.reason_lpr, data.reason_cpr, data.application_reason, data.reason))
  const hasDisability = yesNo(data.has_disability, isAffirmativeValue)
  const currentNameChanged = iNeverReceivedCard(data.has_name_changed_since_green_card, isAffirmativeValue)
  const currentNameChangedYes = currentNameChanged === 'YES'

  return [
    { label: 'What is your current immigration status?', val: currentStatus(pick(data.current_status, data.currentImmigrationStatus, data.immigrationStatus)), force: true },
    { label: 'Why are you applying to replace your permanent resident card?', val: reason, force: true },
    { label: 'Where is the port-of-entry that you will use to enter and exit the United States?', val: pick(data.intended_port_of_entry_city_state, data.port_of_entry_city_state) },

    { label: 'Are you requesting an accommodation because of your disabilities and/or impairments?', val: hasDisability, force: true },
    { label: 'I am deaf or hard of hearing', val: pick(data.disability_details, data.disability_deaf_details), after: 'Select all that apply' },
    { label: 'I am blind or have low vision', val: pick(data.disability_details, data.disability_blind_details), after: 'I am deaf or hard of hearing' },
    { label: 'I have another type of disability and/or impairment', val: pick(data.disability_details, data.disability_other_details), after: 'I am blind or have low vision' },
    { label: 'Is someone assisting you with completing this application?', val: yesNo(data.is_someone_assisting, isAffirmativeValue) },

    { label: 'Family name (last name)', val: pick(data.legal_last_name, data.lastName, data.last_name), force: true },
    { label: 'Given name (first name)', val: pick(data.legal_first_name, data.firstName, data.first_name), force: true },
    { label: 'Middle name', val: pick(data.legal_middle_name, data.middleName, data.middle_name), force: true },
    { label: 'Has your name legally changed since you received your Permanent Resident Card?', val: currentNameChanged, force: true },
    { label: 'Family name (last name)', val: currentNameChangedYes ? pick(data.current_gc_last_name, data.previous_last_name) : '', after: 'Has your name legally changed since you received your Permanent Resident Card?', force: currentNameChangedYes },
    { label: 'Given name (first name)', val: currentNameChangedYes ? [pick(data.current_gc_middle_name, data.previous_middle_name), pick(data.current_gc_first_name, data.previous_first_name)].filter(Boolean).join(' ') : '', after: 'Has your name legally changed since you received your Permanent Resident Card?', force: currentNameChangedYes },
    { label: 'Middle name', val: currentNameChangedYes ? fullName(data) : '', after: 'Has your name legally changed since you received your Permanent Resident Card?', force: currentNameChangedYes },

    { label: 'Primary Phone Number', val: pick(data.phone_primary, data.contactPrimary, data.phone), force: true },
    { label: 'Secondary Phone Number', val: pick(data.phone_secondary, data.contactSecondary, data.otherPhone), force: true },
    { label: 'Email Address', val: pick(data.email, data.emailAddress), force: true },

    { label: 'In care of name (if any)', val: pick(data.mailing_in_care_of_name, data.in_care_of_name) },
    { label: 'Country/Region', val: pick(data.mailing_address_country, data.mailingCountry), after: 'In care of name (if any)', force: true },
    { label: 'Address line 1', val: pick(data.mailing_address_street, data.mailingAddressStreet), after: 'In care of name (if any)', force: true },
    { label: 'Address line 2', val: pick(data.mailing_address_line2, data.mailingAddressLine2), after: 'Address line 1' },
    { label: 'City or town', val: pick(data.mailing_address_city, data.mailingCity), after: 'In care of name (if any)', force: true },
    { label: 'State/Province', val: pick(data.mailing_address_province, data.mailingProvince), after: 'In care of name (if any)', force: true },
    { label: 'ZIP Code', val: pick(data.mailing_address_zip, data.mailingZip), after: 'In care of name (if any)', force: true },
    { label: 'Is your current mailing address the same as your physical address?', val: yesNo(data.lives_at_mailing_address, isAffirmativeValue), force: true },
    { label: 'Country/Region', val: pick(data.physical_address_country, data.physicalCountry), after: 'Is your current mailing address the same as your physical address?' },
    { label: 'Address line 1', val: pick(data.physical_address_street, data.physicalAddressStreet), after: 'Is your current mailing address the same as your physical address?' },
    { label: 'Address line 2', val: pick(data.physical_address_line2, data.physicalAddressLine2), after: 'Is your current mailing address the same as your physical address?' },
    { label: 'City or town', val: pick(data.physical_address_city, data.physicalCity), after: 'Is your current mailing address the same as your physical address?' },
    { label: 'State/Province', val: pick(data.physical_address_province, data.physicalProvince), after: 'Is your current mailing address the same as your physical address?' },
    { label: 'ZIP Code', val: pick(data.physical_address_zip, data.physicalZip), after: 'Is your current mailing address the same as your physical address?' },

    { label: 'What is your gender?', val: gender(data.gender), force: true },
    { label: 'What is your ethnicity?', val: ethnicity(data.ethnicity), force: true },
    { label: 'What is your race?', val: race(data.race), force: true },
    { label: 'What is your height?', val: pick(data.height, data.height_feet_inches), handler: fillHeightCells },
    { label: 'What is your weight?', val: pick(data.weight, data.weight_pounds) },
    { label: 'What is the color of your eyes?', val: eyeColor(data.eye_color), force: true },
    { label: 'What is the color of your hair?', val: hairColor(data.hair_color), force: true },

    { label: 'Date of Birth', val: birthDate, handler: fillDateCells, force: true },
    { label: 'City of Birth', val: pick(data.place_of_birth_city, data.birthCity), force: true },
    { label: 'Country/Region of Birth', val: pick(data.place_of_birth_country, data.birthCountry), force: true },

    { label: 'What is your class of admission?', val: pick(data.sponsorship_category, data.class_of_admission, data.classOfAdmission), force: true },
    { label: 'What was your date of admission?', val: entryDate, handler: fillDateCells, force: true },
    { label: 'Where did you apply for your immigrant visa or adjustment of status?', val: pick(data.place_submitted_immigrant_visa_or_adjustment, data.placeSubmittedImmigrantVisaOrAdjustment), force: true },
    { label: 'Where was your immigrant visa or adjustment of status granted?', val: pick(data.place_issued_immigrant_visa_or_approved_adjustment, data.placeIssuedImmigrantVisaOrApprovedAdjustment), force: true },
    { label: 'Did you enter the United States with an immigrant visa?', val: yesNo(data.entered_with_immigrant_visa, isAffirmativeValue), force: true },
    { label: 'What was the port-of-entry that you used to enter the United States?', val: pick(data.port_of_entry_city_state, data.portOfEntryCityState), force: true },
    { label: 'What was your destination when you entered the United States?', val: pick(data.first_us_state_of_residence, data.firstUSStateOfResidence), force: true },
    { label: 'Have you ever been in exclusion, deportation, or removal proceedings or ordered removed from the United States?', val: yesNo(data.ever_in_removal_proceedings, isAffirmativeValue), force: true },
    { label: 'Explain', val: pick(data.removal_reason, data.removalReason), after: 'Have you ever been in exclusion' },
    { label: 'Have you ever abandoned your permanent resident status or been determined to have abandoned your status?', val: yesNo(data.ever_filed_i407_or_intended_abandon_lpr, isAffirmativeValue), force: true },
    { label: 'Explain', val: pick(data.i407_detail_reason, data.i407DetailReason), after: 'Have you ever abandoned your permanent resident status' },

    { label: 'What is your A-Number?', val: pick(data.alien_number, data.a_number, data.aNumber), force: true },
    { label: 'What is your USCIS Online Account Number?', val: pick(data.uscis_online_account_number, data.uscisOnlineAccountNumber), force: true },
    { label: 'What is your U.S. Social Security number?', val: pick(data.ssn, data.social_security_number), force: true },
    { label: "What is your mother's first name?", val: pick(data.mother_first_name, data.motherFirstName), force: true },
    { label: "What is your father's first name?", val: pick(data.father_first_name, data.fatherFirstName), force: true }
  ]
}
