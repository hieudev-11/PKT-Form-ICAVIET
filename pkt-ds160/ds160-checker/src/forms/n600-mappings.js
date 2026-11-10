// PKT N-600: map dữ liệu từ form online ICAVIET N-600 (icaviet-forms/forms/n-600/schema.json)
// sang các ô "THÔNG TIN" trong phiếu kiểm tra public/forms/n600.html.
//
// Cách hoạt động: mỗi phần tử trả về là { label, val, after, force }.
// - label: text (không phân biệt hoa/thường, không dấu) của ô HẠNG MỤC cần tìm trong n600.html.
// - after: text mỏ neo để bắt đầu tìm từ đó trở đi, dùng khi label bị lặp lại nhiều nơi trong phiếu
//   (ví dụ "Given name (first name)" xuất hiện ở rất nhiều khối: đương đơn, cha, mẹ, người hôn phối...).
// - force: true để vẫn ghi đè ô dữ liệu ngay cả khi val rỗng - bắt buộc dùng cho các field nằm trong
//   một chuỗi label lặp lại (tên/địa chỉ) để giữ đúng thứ tự khớp ô, tránh field sau "nhảy" lên ô của field trước.

function asText(value) {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.filter(v => v !== undefined && v !== null && String(v).trim() !== '').join(', ')
  if (typeof value === 'object') return value.value ?? value.label ?? ''
  return String(value).trim()
}

function pick(...values) {
  for (const value of values) {
    const text = asText(value)
    if (text) return text
  }
  return ''
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function normalizeKey(value) {
  return asText(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function mapValues(value, dict) {
  return toArray(value)
    .map(v => dict[String(v).trim().toLowerCase()] || '')
    .filter(Boolean)
    .join('; ')
}

// Một số field text tự do (vd: "Tên gọi khác (nếu có)") được nhân viên/khách gõ thẳng
// "No"/"Không"/"Không có"... để trả lời "không có" thay vì để trống ô. Phải nhận diện đúng các
// câu trả lời phủ định này (so khớp CHÍNH XÁC, không dùng includes) để không đẩy nhầm xuống ô tên
// thật (vd: "Other Given name used"), đồng thời tránh nhận nhầm tên thật (vd: "Ngọc") thành phủ định.
const NEGATIVE_FREE_TEXT_ANSWERS = new Set([
  'NO', 'N', 'KHONG', 'KHONG CO', 'CHUA CO', 'CHUA', 'KO', 'NONE', 'N A', 'NA', 'K CO'
])
function isNegativeFreeTextAnswer(value) {
  const key = normalizeKey(value)
  return NEGATIVE_FREE_TEXT_ANSWERS.has(key)
}

function yesNoAny(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (['YES', 'Y', 'CO', 'ROI', 'DA CO', 'PHAI', 'TRUE', '1'].includes(key)) return 'YES'
  if (['NO', 'N', 'KHONG', 'CHUA', 'FALSE', '0'].includes(key)) return 'NO'
  if (key.includes('KHONG') || key.includes('CHUA')) return 'NO'
  if (key.includes('CO') || key.includes('ROI') || key.includes('PHAI')) return 'YES'
  return ''
}

function yesNoFromArrayPresence(value) {
  return toArray(value).length > 0 ? 'YES' : ''
}

function dateFromParts(month, day, year, fallback = '') {
  const m = pick(month)
  const d = pick(day)
  const y = pick(year)
  if (m && d && y) return `${m}/${d}/${y}`
  if (y) return y
  return pick(fallback)
}

function genderText(value) {
  const key = normalizeKey(value)
  if (key === 'MALE' || key === 'NAM') return 'MALE'
  if (key === 'FEMALE' || key === 'NU') return 'FEMALE'
  return ''
}

function heightText(feet, inches) {
  const f = pick(feet)
  const i = pick(inches)
  if (!f && !i) return ''
  return [f && `${f} FT`, i && `${i} IN`].filter(Boolean).join(' ')
}

function maritalStatusVN(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('DOC THAN')) return 'SINGLE, NEVER MARRIED'
  if (key.includes('LY THAN')) return 'SEPARATED'
  if (key.includes('LY HON')) return 'DIVORCED'
  if (key.includes('GOA')) return 'WIDOWED'
  if (key.includes('HUY HON')) return 'MARRIAGE ANNULLED'
  if (key.includes('KET HON')) return 'MARRIED'
  return 'OTHER'
}

function maritalStatusEN(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key === 'MARRIED') return 'MARRIED'
  if (key === 'SINGLE') return 'SINGLE, NEVER MARRIED'
  if (key === 'WIDOWED') return 'WIDOWED'
  if (key === 'DIVORCED') return 'DIVORCED'
  if (key === 'SEPARATED') return 'SEPARATED'
  return 'OTHER'
}

const ACQUISITION_TEXT = {
  born_in_us: 'BIRTH IN THE UNITED STATES',
  acquired_through_parents: 'ACQUISITION AFTER BIRTH THROUGH NATURALIZATION OF ALIEN PARENTS',
  born_abroad_to_us_parents: 'BIRTH ABROAD TO U.S. CITIZEN PARENTS',
  naturalization: 'NATURALIZATION'
}
const acquisitionText = (value) => mapValues(value, ACQUISITION_TEXT)

const ENTRY_DOC_TEXT = { passport: 'PASSPORT', travel_document: 'TRAVEL DOCUMENT' }
const entryDocText = (value) => mapValues(value, ENTRY_DOC_TEXT)

const DISCHARGE_TEXT = {
  honorable: 'HONORABLE',
  other_than_honorable: 'OTHER THAN HONORABLE',
  dishonorable: 'DISHONORABLE'
}
const dischargeText = (value) => mapValues(value, DISCHARGE_TEXT)

const IMMIGRATION_STATUS_TEXT = {
  us_citizen: 'U.S. CITIZEN',
  permanent_resident: 'LAWFUL PERMANENT RESIDENT',
  other: 'OTHER'
}
const immigrationStatusText = (value) => mapValues(value, IMMIGRATION_STATUS_TEXT)

function filingConditionText(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'self_child_of_us_citizen') return 'I AM THE CHILD OF A U.S. CITIZEN AND I AM FILING FOR MYSELF'
  if (key === 'parent_guardian_for_child') return 'I AM A U.S. CITIZEN PARENT OR LEGAL GUARDIAN FILING FOR A CHILD'
  return ''
}

const RELATIONSHIP_TEXT = {
  biological_child: 'THE BIOLOGICAL CHILD OF A U.S. CITIZEN PARENT',
  adopted_child: 'THE ADOPTED CHILD OF A U.S. CITIZEN PARENT',
  other: 'OTHER',
  non_genetic_gestational_legal_parent: 'THE CHILD OF A NON-GENETIC GESTATIONAL U.S. CITIZEN PARENT WHO IS ALSO YOUR LEGAL PARENT',
  child_of_us_citizen_spouse_of_genetic_or_gestational_parent: 'THE CHILD OF A U.S. CITIZEN PARENT WHO WAS MARRIED TO YOUR GENETIC OR GESTATIONAL PARENT AT THE TIME OF YOUR BIRTH AND BOTH OF YOUR PARENTS ARE ALSO YOUR LEGAL PARENTS',
  vawa_self_petitioning_spouse: 'SELF-PETITIONING SPOUSE OF ABUSIVE U.S. CITIZEN OR LAWFUL PERMANENT RESIDENT',
  vawa_self_petitioning_child: 'SELF-PETITIONING CHILD OF ABUSIVE U.S. CITIZEN OR LAWFUL PERMANENT RESIDENT',
  vawa_self_petitioning_parent: 'VAWA SELF-PETITIONING PARENT OF A U.S. CITIZEN SON OR DAUGHTER'
}
function relationshipText(value) {
  return RELATIONSHIP_TEXT[String(value || '').trim().toLowerCase()] || ''
}

// Xác định cha hay mẹ là công dân Mỹ (Part D của form) để biết field nào đổ vào mục
// "THÔNG TIN CHA/MẸ QUỐC TỊCH MỸ" và field nào đổ vào "THÔNG TIN CHA/MẸ KHÁC".
function citizenParentIsFather(data) {
  const selection = toArray(data.parent_residence_relates_to).map(v => String(v).trim().toLowerCase())
  if (selection.includes('father')) return true
  if (selection.includes('mother')) return false
  const fatherHasAcquisition = toArray(data.father_us_citizenship_acquisition).length > 0
  const motherHasAcquisition = toArray(data.mother_us_citizenship_acquisition).length > 0
  if (motherHasAcquisition && !fatherHasAcquisition) return false
  return true
}

function pf(data, prefix, suffix) {
  return data[`${prefix}_${suffix}`]
}

function currentSpouseIsOtherParent(data, prefix) {
  return prefix === 'father' ? data.father_current_spouse_is_mother : data.mother_current_spouse_is_father
}

function periodsArray(value) {
  return Array.isArray(value) ? value : []
}

// Số dòng "(N) To/From" cần có trong phiếu cho mục "What dates did your U.S. citizen parent
// live in the United States?" — tối thiểu 2 dòng như phiếu tĩnh gốc, hoặc nhiều hơn nếu khách
// đã khai nhiều giai đoạn cư trú hơn qua form online. N600WordPaper.vue dùng số này để tự thêm
// đủ dòng trong DOM trước khi đổ dữ liệu.
export function getN600ResidencePeriodRowCount(data = {}) {
  return Math.max(2, periodsArray(data.us_residence_periods).length)
}

export function getN600HeaderValues(data = {}) {
  const fullName = pick(
    data.applicant_full_name,
    [data.legal_family_name, data.legal_last_name, data.legal_first_name].filter(Boolean).join(' '),
    data.customer_name
  )
  return {
    customer: fullName,
    email: pick(data.email, data.customer_email),
    pass: pick(data.pass, data.pass_number, data.passCode),
    mshs: pick(data.mshs, data.ms, data.receipt_number, data.receiptNumber)
  }
}

export function buildN600Mappings(data = {}) {
  const mailingIsSame = yesNoAny(data.mailing_same_as_current_us_address) !== 'NO'
  const mailingStreet = mailingIsSame ? data.current_us_address_street : data.us_mailing_address_street
  const mailingCity = mailingIsSame ? data.current_us_address_city : data.us_mailing_address_city
  const mailingState = mailingIsSame ? data.current_us_address_state : data.us_mailing_address_state
  const mailingZip = mailingIsSame ? data.current_us_address_zip : data.us_mailing_address_zip
  const mailingCountry = mailingIsSame ? data.current_us_address_country : data.us_mailing_address_country

  const entryDate = dateFromParts(data.previous_entry_date_month, data.previous_entry_date_day, data.previous_entry_date_year)
  const passportIssueDate = dateFromParts(data.passport_issue_month, data.passport_issue_day, data.passport_issue_year)
  const travelDocIssueDate = dateFromParts(data.travel_document_issue_month, data.travel_document_issue_day, data.travel_document_issue_year)
  const dob = dateFromParts(data.date_of_birth_month, data.date_of_birth_day, data.date_of_birth_year)

  const otherNamesRaw = pick(data.other_names)
  const hasOtherName = Boolean(otherNamesRaw) && !isNegativeFreeTextAnswer(otherNamesRaw)
  const otherNameAnswer = otherNamesRaw ? (hasOtherName ? 'YES' : 'NO') : ''

  const citizenIsFather = citizenParentIsFather(data)
  const P = citizenIsFather ? 'father' : 'mother' // cha/mẹ là công dân Mỹ
  const Q = citizenIsFather ? 'mother' : 'father' // cha/mẹ còn lại

  const militaryPeriods = periodsArray(data.military_service_periods)
  const residencePeriods = periodsArray(data.us_residence_periods)

  return [
    // ── ĐIỀU KIỆN NỘP ĐƠN ──
    { label: 'What is your basis for eligibility?', val: filingConditionText(data.filing_condition), force: true },
    { label: 'What is your relationship to your U.S. citizen parent?', val: relationshipText(data.relationship_to_us_citizen_parent), after: 'What is your basis for eligibility?', force: true },
    { label: 'Have you previously applied for a Certificate of Citizenship or a U.S. Passport?', val: yesNoAny(data.has_applied_us_citizenship_or_passport), after: 'What is your relationship to your U.S. citizen parent?' },

    // ── #1 THÔNG TIN CÁ NHÂN ──
    { label: 'Given name (first name)', val: pick(data.legal_first_name), after: 'THÔNG TIN CÁ NHÂN', force: true },
    { label: 'Middle name', val: pick(data.legal_last_name), after: 'THÔNG TIN CÁ NHÂN', force: true },
    { label: 'Family name (last name)', val: pick(data.legal_family_name), after: 'THÔNG TIN CÁ NHÂN', force: true },

    { label: 'Given name (first name)', val: pick(data.green_card_first_name), after: 'What is your name exactly as it appears on your Permanent Resident Card?', force: true },
    { label: 'Middle name', val: pick(data.green_card_middle_name), after: 'What is your name exactly as it appears on your Permanent Resident Card?', force: true },
    { label: 'Family name (last name)', val: pick(data.green_card_family_name), after: 'What is your name exactly as it appears on your Permanent Resident Card?', force: true },

    { label: 'Have you used any other names since birth?', val: otherNameAnswer, after: 'What is your name exactly as it appears on your Permanent Resident Card?' },
    { label: 'Other Given name used', val: hasOtherName ? otherNamesRaw : '', after: 'Have you used any other names since birth?' },

    // ── #2 SĐT + EMAIL ──
    { label: 'Daytime telephone number', val: pick(data.phone_number), after: 'SĐT + EMAIL', force: true },
    { label: 'Mobile telephone number', val: pick(data.phone_number), after: 'SĐT + EMAIL', force: true },
    { label: 'Email address', val: pick(data.email), after: 'SĐT + EMAIL', force: true },

    // ── #3 ĐỊA CHỈ NHẬN THƯ ──
    { label: 'Country', val: pick(mailingCountry), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },
    { label: 'Address line 1', val: pick(mailingStreet), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },
    { label: 'City or town', val: pick(mailingCity), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },
    { label: 'State/Province', val: pick(mailingState), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },
    { label: 'ZIP code/Postal code', val: pick(mailingZip), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },

    // ── #4 THÔNG TIN CƯ TRÚ ──
    { label: 'Country', val: pick(data.current_us_address_country), after: 'THÔNG TIN CƯ TRÚ', force: true },
    { label: 'Address line 1', val: pick(data.current_us_address_street), after: 'THÔNG TIN CƯ TRÚ', force: true },
    { label: 'City or town', val: pick(data.current_us_address_city), after: 'THÔNG TIN CƯ TRÚ', force: true },

    // ── #5 THÔNG TIN THÊM ──
    { label: 'Date of birth', val: dob, after: 'THÔNG TIN THÊM', force: true },
    { label: 'Country of birth', val: pick(data.birth_country), after: 'THÔNG TIN THÊM', force: true },

    // ── #6 THÔNG TIN NHẬP CƯ ──
    { label: 'What is your prior country of citizenship or nationality?', val: pick(data.previous_citizenship_country), after: 'THÔNG TIN NHẬP CƯ', force: true },
    { label: 'City or Town', val: pick(data.previous_entry_city), after: 'What was the port-of-entry that you used to enter the United States?', force: true },
    { label: 'State', val: pick(data.previous_entry_state), after: 'What was the port-of-entry that you used to enter the United States?', force: true },
    { label: 'What date did you enter?', val: entryDate, after: 'What was the port-of-entry that you used to enter the United States?', force: true },

    { label: 'Given name (first name)', val: pick(data.previous_entry_used_first_name), after: 'What name did you use when you entered?', force: true },
    { label: 'Middle name', val: pick(data.previous_entry_used_middle_name), after: 'What name did you use when you entered?', force: true },
    { label: 'Family name (last name)', val: pick(data.previous_entry_used_family_name), after: 'What name did you use when you entered?', force: true },

    { label: "What travel document did you use to be admitted to the United States?", val: entryDocText(data.entry_documents), after: 'What name did you use when you entered?', force: true },
    { label: 'What was your passport number?', val: pick(data.passport_number), after: "What travel document did you use to be admitted to the United States?" },
    { label: 'What was your travel document number?', val: pick(data.travel_document_visa_number), after: "What travel document did you use to be admitted to the United States?" },
    { label: 'What country issued your passport or travel document?', val: pick(data.passport_issue_country, data.travel_document_issue_country), after: "What travel document did you use to be admitted to the United States?" },
    { label: 'What date was your passport or travel document issued?', val: pick(passportIssueDate, travelDocIssueDate), after: "What travel document did you use to be admitted to the United States?" },

    { label: 'Have you ever been a lawful permanent resident (LPR)?', val: (toArray(data.current_us_residence_status).includes('lpr') || data.date_become_lpr) ? 'YES' : '', after: 'THÔNG TIN NHẬP CƯ' },
    { label: 'When did you become a LPR?', val: pick(data.date_become_lpr), after: 'Have you ever been a lawful permanent resident (LPR)?' },
    { label: 'What was the USCIS office that granted your LPR status or location where you were admitted?', val: pick(data.uscis_office_adjusted), after: 'Have you ever been a lawful permanent resident (LPR)?' },
    { label: 'Have you ever abandoned or lost your LPR status?', val: yesNoAny(data.lost_or_abandoned_lpr_status), after: 'Have you ever been a lawful permanent resident (LPR)?' },
    { label: 'Have you previously applied for a U.S. Passport?', val: yesNoAny(data.has_applied_us_citizenship_or_passport), after: 'Have you ever abandoned or lost your LPR status?' },

    // ── #7 THÔNG TIN NHẬN NUÔI ──
    { label: 'Were you adopted?', val: yesNoAny(data.is_adopted_child), after: 'THÔNG TIN NHẬN NUÔI', force: true },
    { label: 'Where was the place of your adoption?', val: [data.adoption_place_city, data.adoption_place_state, data.adoption_place_country].filter(Boolean).join(', '), after: 'Were you adopted?' },
    { label: 'When were you adopted?', val: pick(data.adoption_date), after: 'Were you adopted?' },
    { label: 'When did legal custody begin?', val: pick(data.legal_guardianship_date), after: 'Were you adopted?' },
    { label: 'When did physical custody begin?', val: pick(data.legal_guardianship_start_date), after: 'Were you adopted?' },

    // ── #8 MÔ TẢ BẢN THÂN ──
    { label: 'What is your A-Number?', val: pick(data.a_number), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'U.S. Social Security number', val: pick(data.ssn), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your USCIS Online Account Number?', val: pick(data.uscis_number), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your current marital status?', val: maritalStatusVN(data.current_marital_status), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your gender?', val: genderText(data.gender), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your height?', val: heightText(data.height_feet, data.height_inches), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'Are you a member or veteran of any branch of the U.S. Armed Forces?', val: yesNoAny(data.us_armed_forces), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'Do you regularly reside in the legal and physical custody of your U.S. citizen parent', val: yesNoAny(data.regular_residence_under_us_citizen_parent), after: 'MÔ TẢ BẢN THÂN', force: true },

    // ── #9 THÔNG TIN GIA ĐÌNH ──
    { label: 'Were your parents married to each other when you were born (or adopted)?', val: yesNoAny(data.parents_married_before_birth_or_adoption), after: 'THÔNG TIN GIA ĐÌNH', force: true },
    { label: 'Did your parents marry after you were born?', val: yesNoAny(data.parents_married_after_birth), after: 'THÔNG TIN GIA ĐÌNH', force: true },

    // ── #10 THÔNG TIN CHA/MẸ QUỐC TỊCH MỸ (cha/mẹ là công dân Mỹ, prefix P) ──
    { label: 'Given name (first name)', val: pick(pf(data, P, 'first_name')), after: "What is your U.S. citizen mother or father's current legal name?", force: true },
    { label: 'Middle name', val: pick(pf(data, P, 'middle_name')), after: "What is your U.S. citizen mother or father's current legal name?", force: true },
    { label: 'Family name (last name)', val: pick(pf(data, P, 'family_name')), after: "What is your U.S. citizen mother or father's current legal name?", force: true },
    { label: 'This parent is my', val: citizenIsFather ? 'FATHER' : 'MOTHER', after: "What is your U.S. citizen mother or father's current legal name?", force: true },

    { label: 'Country', val: pick(pf(data, P, 'current_address_country')), after: "What is your U.S. citizen mother or father's current physical address?", force: true },
    { label: 'Address line 1', val: pick(pf(data, P, 'current_address_street')), after: "What is your U.S. citizen mother or father's current physical address?", force: true },
    { label: 'City or town', val: pick(pf(data, P, 'current_address_city')), after: "What is your U.S. citizen mother or father's current physical address?", force: true },
    { label: 'Province', val: pick(pf(data, P, 'current_address_state')), after: "What is your U.S. citizen mother or father's current physical address?", force: true },
    { label: 'ZIP code/Postal code', val: pick(pf(data, P, 'current_address_zip')), after: "What is your U.S. citizen mother or father's current physical address?", force: true },

    { label: 'When was your U.S. citizen mother or father born?', val: pick(pf(data, P, 'date_of_birth')), after: "What is your U.S. citizen mother or father's current physical address?" },
    { label: "What is your U.S. citizen mother or father's country of birth?", val: pick(pf(data, P, 'place_of_birth')), after: 'When was your U.S. citizen mother or father born?' },
    { label: 'How did your father obtain U.S. citizenship?', val: acquisitionText(pf(data, P, 'us_citizenship_acquisition')), after: "What is your U.S. citizen mother or father's country of birth?" },

    { label: '(1) Name of court or USCIS office location', val: pick(pf(data, P, 'naturalization_court_or_uscis')), after: 'Where was your father naturalized?', force: true },
    { label: '(1) City or town', val: pick(pf(data, P, 'naturalization_city')), after: 'Where was your father naturalized?', force: true },
    { label: '(1) State', val: pick(pf(data, P, 'naturalization_state')), after: 'Where was your father naturalized?', force: true },
    { label: '(1) What is your father’s Certificate of Naturalization number?', val: pick(pf(data, P, 'naturalization_certificate_number')), after: 'Where was your father naturalized?' },
    { label: '(1) What date was your father naturalized?', val: pick(pf(data, P, 'naturalization_date')), after: 'Where was your father naturalized?' },
    { label: '(2) What is your father’s Certificate of Citizenship number?', val: pick(pf(data, P, 'certificate_of_citizenship_number'), pf(data, P, 'acquired_certificate_of_citizenship_number'), pf(data, P, 'born_abroad_certificate_of_citizenship_number')), after: 'Where was your father naturalized?' },
    { label: "What is your father's A-Number?", val: pick(pf(data, P, 'a_number'), pf(data, P, 'acquired_a_number'), pf(data, P, 'born_abroad_a_number')), after: 'Where was your father naturalized?' },
    { label: 'Has your U.S. citizen mother or father ever lost U.S. citizenship', val: yesNoAny(pf(data, P, 'lost_citizenship')), after: "What is your father's A-Number?" },
    { label: 'How many times has your U.S. citizen father been married?', val: pick(pf(data, P, 'number_of_marriages')), after: "What is your father's A-Number?" },
    { label: "What is your U.S. citizen father's current marital status?", val: maritalStatusEN(pf(data, P, 'current_marital_status')), after: "What is your father's A-Number?" },
    { label: "Is your U.S. citizen mother or father's current spouse also your other mother or father?", val: yesNoAny(currentSpouseIsOtherParent(data, P)), after: "What is your father's A-Number?" },

    { label: 'Given name (first name)', val: pick(pf(data, P, 'spouse_first_name')), after: "What is the name of your U.S citizen father's current spouse?", force: true },
    { label: 'Middle name', val: pick(pf(data, P, 'spouse_middle_name')), after: "What is the name of your U.S citizen father's current spouse?", force: true },
    { label: 'Family name (last name)', val: pick(pf(data, P, 'spouse_family_name')), after: "What is the name of your U.S citizen father's current spouse?", force: true },
    { label: 'What date did your U.S citizen father marry his current spouse?', val: pick(pf(data, P, 'spouse_marriage_date')), after: "What is the name of your U.S citizen father's current spouse?" },

    { label: 'Country', val: pick(pf(data, P, 'spouse_marriage_place')), after: 'Where were your U.S citizen father and his current spouse married?', force: true },
    { label: "What is your father's spouse's date of birth?", val: pick(pf(data, P, 'spouse_naturalization_date')), after: 'Where were your U.S citizen father and his current spouse married?' },
    { label: "What is your father's spouse's country of birth?", val: pick(pf(data, P, 'spouse_birth_country')), after: 'Where were your U.S citizen father and his current spouse married?' },
    { label: "What is your father's spouse's country of citizenship or nationality?", val: pick(pf(data, P, 'spouse_nationality')), after: 'Where were your U.S citizen father and his current spouse married?' },
    { label: "What is your father's spouse's immigration status?", val: immigrationStatusText(pf(data, P, 'spouse_immigration_status')), after: 'Where were your U.S citizen father and his current spouse married?' },

    { label: 'Country', val: pick(pf(data, P, 'spouse_current_address_country')), after: "Where does your father's spouse live now?", force: true },
    { label: 'Address line 1', val: pick(pf(data, P, 'spouse_current_address_street')), after: "Where does your father's spouse live now?", force: true },
    { label: 'City or town', val: pick(pf(data, P, 'spouse_current_address_city')), after: "Where does your father's spouse live now?", force: true },
    { label: 'State', val: pick(pf(data, P, 'spouse_current_address_state')), after: "Where does your father's spouse live now?", force: true },
    { label: 'ZIP code', val: pick(pf(data, P, 'spouse_current_address_zip')), after: "Where does your father's spouse live now?", force: true },

    { label: 'Has your U.S. citizen mother or father served in the U.S. Armed Forces?', val: yesNoAny(data.parents_served_military), after: "Where does your father's spouse live now?" },
    { label: '(1) From', val: pick(militaryPeriods[0]?.from_date), after: 'When did your U.S. citizen mother or father serve in the U.S. Armed Forces?' },
    { label: '(1) To', val: pick(militaryPeriods[0]?.to_date), after: 'When did your U.S. citizen mother or father serve in the U.S. Armed Forces?' },
    { label: 'How was your U.S. citizen mother or father discharged?', val: dischargeText(data.discharge_type), after: 'When did your U.S. citizen mother or father serve in the U.S. Armed Forces?' },

    // ── #11 THÔNG TIN CHA/MẸ KHÁC (cha/mẹ còn lại, prefix Q) ──
    { label: 'Given name (first name)', val: pick(pf(data, Q, 'first_name')), after: "What is your other mother or father's current legal name?", force: true },
    { label: 'Middle name', val: pick(pf(data, Q, 'middle_name')), after: "What is your other mother or father's current legal name?", force: true },
    { label: 'Family name (last name)', val: pick(pf(data, Q, 'family_name')), after: "What is your other mother or father's current legal name?", force: true },
    { label: 'This parent is my:', val: citizenIsFather ? 'MOTHER' : 'FATHER', after: "What is your other mother or father's current legal name?", force: true },

    { label: 'Country', val: pick(pf(data, Q, 'current_address_country')), after: "What is your other mother or father's current physical address?", force: true },
    { label: 'Address line 1', val: pick(pf(data, Q, 'current_address_street')), after: "What is your other mother or father's current physical address?", force: true },
    { label: 'City or town', val: pick(pf(data, Q, 'current_address_city')), after: "What is your other mother or father's current physical address?", force: true },
    { label: 'Province', val: pick(pf(data, Q, 'current_address_state')), after: "What is your other mother or father's current physical address?", force: true },
    { label: 'ZIP code/Postal code', val: pick(pf(data, Q, 'current_address_zip')), after: "What is your other mother or father's current physical address?", force: true },

    { label: 'When was your other mother or father born?', val: pick(pf(data, Q, 'date_of_birth')), after: "What is your other mother or father's current physical address?" },
    { label: "What is your other mother or father's country of birth?", val: pick(pf(data, Q, 'place_of_birth')), after: 'When was your other mother or father born?' },
    { label: "What is your other mother or father's country of citizenship or nationality?", val: pick(pf(data, Q, 'citizenship')), after: 'When was your other mother or father born?' },
    { label: 'Is your other mother or father a U.S. citizen?', val: yesNoFromArrayPresence(pf(data, Q, 'us_citizenship_acquisition')), after: 'When was your other mother or father born?' },
    { label: 'How did your other mother or father obtain U.S. citizenship?', val: acquisitionText(pf(data, Q, 'us_citizenship_acquisition')), after: 'When was your other mother or father born?' },

    { label: 'Name of court or USCIS office location', val: pick(pf(data, Q, 'naturalization_court_or_uscis')), after: 'Where was your other mother or father naturalized?', force: true },
    { label: 'City or town', val: pick(pf(data, Q, 'naturalization_city')), after: 'Where was your other mother or father naturalized?', force: true },
    { label: 'State', val: pick(pf(data, Q, 'naturalization_state')), after: 'Where was your other mother or father naturalized?', force: true },
    { label: "What is your father's Certificate of Naturalization number?", val: pick(pf(data, Q, 'naturalization_certificate_number')), after: 'Where was your other mother or father naturalized?' },
    { label: 'What date was your father naturalized?', val: pick(pf(data, Q, 'naturalization_date')), after: 'Where was your other mother or father naturalized?' },
    { label: "What is your father's Certificate of Citizenship number?", val: pick(pf(data, Q, 'certificate_of_citizenship_number'), pf(data, Q, 'acquired_certificate_of_citizenship_number'), pf(data, Q, 'born_abroad_certificate_of_citizenship_number')), after: 'Where was your other mother or father naturalized?' },
    { label: 'Has your other mother or father ever lost U.S. citizenship', val: yesNoAny(pf(data, Q, 'lost_citizenship')), after: 'Where was your other mother or father naturalized?' },
    { label: 'How many times has your U.S. citizen mother been married?', val: pick(pf(data, Q, 'number_of_marriages')), after: 'Where was your other mother or father naturalized?' },
    { label: "What is your U.S. citizen mother's current marital status?", val: maritalStatusEN(pf(data, Q, 'current_marital_status')), after: 'Where was your other mother or father naturalized?' },
    { label: "Is your other mother or father's current spouse also your U.S. citizen mother or father?", val: yesNoAny(currentSpouseIsOtherParent(data, Q)), after: 'Where was your other mother or father naturalized?' },

    { label: 'Given name (first name)', val: pick(pf(data, Q, 'spouse_first_name')), after: "What is the name of your U.S citizen mother's current spouse?", force: true },
    { label: 'Middle name', val: pick(pf(data, Q, 'spouse_middle_name')), after: "What is the name of your U.S citizen mother's current spouse?", force: true },
    { label: 'Family name (last name)', val: pick(pf(data, Q, 'spouse_family_name')), after: "What is the name of your U.S citizen mother's current spouse?", force: true },
    { label: "What date did your U.S citizen mother marry his current spouse?", val: pick(pf(data, Q, 'spouse_marriage_date')), after: "What is the name of your U.S citizen mother's current spouse?" },

    { label: 'Country', val: pick(pf(data, Q, 'spouse_marriage_place')), after: 'Where were your U.S citizen mother and his current spouse married?', force: true },
    { label: "What is your mother's spouse's date of birth?", val: pick(pf(data, Q, 'spouse_naturalization_date')), after: 'Where were your U.S citizen mother and his current spouse married?' },
    { label: "What is your mother's spouse's country of birth?", val: pick(pf(data, Q, 'spouse_birth_country')), after: 'Where were your U.S citizen mother and his current spouse married?' },
    { label: "What is your mother's spouse's country of citizenship or nationality?", val: pick(pf(data, Q, 'spouse_nationality')), after: 'Where were your U.S citizen mother and his current spouse married?' },
    { label: "What is your mother's spouse's immigration status?", val: immigrationStatusText(pf(data, Q, 'spouse_immigration_status')), after: 'Where were your U.S citizen mother and his current spouse married?' },

    { label: 'Country', val: pick(pf(data, Q, 'spouse_current_address_country')), after: "Where does your mother's spouse live now?", force: true },
    { label: 'Address line 1', val: pick(pf(data, Q, 'spouse_current_address_street')), after: "Where does your mother's spouse live now?", force: true },
    { label: 'City or town', val: pick(pf(data, Q, 'spouse_current_address_city')), after: "Where does your mother's spouse live now?", force: true },
    { label: 'State', val: pick(pf(data, Q, 'spouse_current_address_state')), after: "Where does your mother's spouse live now?", force: true },
    { label: 'ZIP code', val: pick(pf(data, Q, 'spouse_current_address_zip')), after: "Where does your mother's spouse live now?", force: true },

    // ── #12 THÔNG TIN CHUNG CỦA BA/MẸ CÔNG DÂN MỸ ──
    { label: 'Which parent you will be providing information for', val: citizenIsFather ? 'U.S. CITIZEN FATHER' : 'U.S. CITIZEN MOTHER', after: 'THÔNG TIN CHUNG CỦA BA/MẸ CÔNG DÂN MỸ', force: true },
    // Phiếu tĩnh chỉ có sẵn 2 dòng (1)/(2), nhưng khách có thể khai nhiều giai đoạn cư trú hơn qua
    // form online (mảng us_residence_periods không giới hạn số dòng). N600WordPaper.vue sẽ tự thêm
    // đủ dòng "(N) To/From" trong DOM trước khi đổ dữ liệu, nên ở đây phải sinh mapping cho TẤT CẢ
    // các giai đoạn thực tế, không chỉ 2 dòng đầu, tránh rớt mất dữ liệu khách đã khai.
    ...residencePeriodMappings(residencePeriods)
  ]
}

function residencePeriodMappings(residencePeriods) {
  const count = Math.max(2, residencePeriods.length)
  const mappings = []
  for (let i = 0; i < count; i++) {
    const n = i + 1
    mappings.push(
      { label: `(${n}) To`, val: pick(residencePeriods[i]?.to_date), after: 'What dates did your U.S. citizen parent live in the United States?', force: true },
      { label: `(${n}) From`, val: pick(residencePeriods[i]?.from_date), after: 'What dates did your U.S. citizen parent live in the United States?', force: true }
    )
  }
  return mappings
}
