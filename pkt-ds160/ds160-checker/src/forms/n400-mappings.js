// PKT N-400: map dữ liệu từ form online ICAVIET N-400 (icaviet-forms/forms/n-400/schema.json)
// sang các ô "XỬ LÝ" trong phiếu kiểm tra public/forms/n400.html.
//
// Cách hoạt động: mỗi phần tử trả về là { label, val, after, force }.
// - label: text (không phân biệt hoa/thường) của ô HẠNG MỤC cần tìm trong n400.html.
// - after: text mỏ neo để bắt đầu tìm từ đó trở đi, dùng khi label bị lặp lại nhiều nơi trong phiếu
//   (ví dụ "Given name (first name)" hay "Provide an explanation" xuất hiện ở rất nhiều khối).
// - force: true để vẫn ghi đè ô dữ liệu ngay cả khi val rỗng - bắt buộc dùng cho các field nằm trong
//   một chuỗi label lặp lại (tên/địa chỉ) để giữ đúng thứ tự khớp ô, tránh field sau "nhảy" lên ô của field trước.
//
// QUAN TRỌNG: mọi anchor tiếng Việt bên dưới phải gõ ĐÚNG NGUYÊN VĂN có dấu như trong n400.html.
// N600 từng có bug nghiêm trọng do anchor viết không dấu khiến so khớp luôn thất bại và điền nhầm ô
// (xem lịch sử sửa n600-mappings.js) - không lặp lại lỗi đó ở đây.

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

// Dữ liệu ngày tháng của N-400 do component DateSelect.vue lưu theo thứ tự NGÀY/THÁNG/NĂM
// (vd "16/04/2020"), khác với N-600 (vốn có 3 select month/day/year riêng theo chuẩn Mỹ).
// Phiếu kiểm tra hiển thị theo chuẩn Mỹ MM/DD/YYYY nên phải đảo lại ở đây.
function formatDate(value) {
  const text = asText(value)
  if (!text) return ''
  const full = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (full) {
    const day = full[1].padStart(2, '0')
    const month = full[2].padStart(2, '0')
    return `${month}/${day}/${full[3]}`
  }
  return text
}

// Ô "To" (ngày kết thúc) của Việc làm/Học tập và Địa chỉ 5 năm: nếu có entry thật (đã bắt đầu)
// nhưng chưa có ngày kết thúc thì hiểu là vẫn đang tiếp diễn -> ghi PRESENT thay vì để trống.
// Nếu bản thân entry không tồn tại (không có dữ liệu) thì vẫn để trống, tránh hiện "PRESENT" khống.
function endDateOrPresent(entry, endDateValue) {
  if (!entry) return ''
  return endDateValue || 'PRESENT'
}

function genderText(value) {
  const key = normalizeKey(value)
  if (key === 'NAM' || key === 'MALE') return 'MALE'
  if (key === 'NU' || key === 'FEMALE') return 'FEMALE'
  return ''
}

function hispanicText(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key === 'YES' || key.includes('CO')) return 'Hispanic or Latino'
  if (key === 'NO' || key.includes('KHONG')) return 'Not Hispanic or Latino'
  return ''
}

const RACE_TEXT = {
  white: 'White',
  asian: 'Asian',
  black_or_african_american: 'Black or African American',
  american_indian_or_alaska_native: 'American Indian or Alaska Native',
  native_hawaiian_or_pacific_islander: 'Native Hawaiian or Other Pacific Islander'
}
const raceText = (value) => mapValues(value, RACE_TEXT)

const EYE_COLOR_TEXT = {
  'đen': 'BLACK',
  'nâu': 'BROWN',
  'xanh lá': 'GREEN',
  'xanh dương': 'BLUE',
  'nâu đỏ': 'HAZEL',
  'xám': 'GRAY',
  'đỏ sẫm': 'MAROON',
  'hồng': 'PINK',
  'khác': 'OTHER'
}
const eyeColorText = (value) => mapValues(value, EYE_COLOR_TEXT)

const HAIR_COLOR_TEXT = {
  'trọc': 'BALD',
  'vàng': 'BLOND',
  'xám': 'GRAY',
  'nâu đỏ': 'SANDY',
  'nâu': 'BROWN',
  'đen': 'BLACK',
  'đỏ': 'RED',
  'trắng': 'WHITE',
  'khác': 'OTHER'
}
const hairColorText = (value) => mapValues(value, HAIR_COLOR_TEXT)

function maritalStatusVN(value) {
  const key = normalizeKey(value)
  if (!key) return ''
  if (key.includes('DOC THAN')) return 'SINGLE'
  if (key.includes('LY THAN')) return 'SEPARATED'
  if (key.includes('LY HON')) return 'DIVORCED'
  if (key.includes('GOA')) return 'WIDOWED'
  if (key.includes('KET HON')) return 'MARRIED'
  return 'OTHER'
}

function spouseCitizenshipMethodText(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'born_in_us') return 'BY BIRTH IN THE UNITED STATES'
  if (key === 'other') return 'OTHER'
  return ''
}

const LIVING_LOCATION_TEXT = {
  with_me: 'Resides with me',
  not_with_me: 'Does not reside with me',
  unknown_missing: 'Unknown/Missing'
}
function childLivingLocationText(value) {
  return LIVING_LOCATION_TEXT[String(value || '').trim().toLowerCase()] || ''
}

const CHILD_RELATIONSHIP_TEXT = {
  biological: 'Biological Child',
  step: 'Stepchild',
  adopted: 'Legally adopted child',
  other: 'Other'
}
function childRelationshipText(value) {
  return CHILD_RELATIONSHIP_TEXT[String(value || '').trim().toLowerCase()] || ''
}

// address_us / mailing_address / current_spouse_current_residence đôi khi chỉ là 1 field text tự do
// (không tách street/city/state/zip riêng). Một số bản submit lại có kèm các field parts riêng
// (vd address_usStreet/City/Province/Zip) - ưu tiên dùng parts nếu có, không thì mới dùng cả chuỗi.
function addressParts(fullText, street, city, province, zip, country) {
  const hasParts = pick(street, city, province, zip, country)
  if (hasParts) {
    return { street: pick(street), city: pick(city), province: pick(province), zip: pick(zip), country: pick(country) }
  }
  return { street: pick(fullText), city: '', province: '', zip: '', country: '' }
}

function mailingSameAsCurrent(sameFlag, addressUs, mailingAddress) {
  const explicit = yesNoAny(sameFlag)
  if (explicit) return explicit
  const a = asText(addressUs).trim().toLowerCase()
  const m = asText(mailingAddress).trim().toLowerCase()
  if (!a || !m) return ''
  return a === m ? 'YES' : 'NO'
}

// height_feet/height_inches (nếu form gửi kèm) chính xác hơn field height dạng text tự do.
function heightText(feet, inches, fallback) {
  const f = pick(feet)
  const i = pick(inches)
  if (f || i) return [f && `${f} ft`, i && `${i} in`].filter(Boolean).join(' ')
  return pick(fallback)
}

// Một số bản submit cũ lưu danh sách con dưới field "__children" với key tiếng Việt
// (ho/ten/ten_lot/ngay_sinh/quan_he/noi_song_value/chu_cap) thay vì children_info_list chuẩn.
function normalizedChildren(children_info_list, legacyChildren) {
  const primary = toArray(children_info_list)
  if (primary.length) return primary
  return toArray(legacyChildren).map(c => ({
    firstName: c.ten,
    lastName: c.ho,
    middleName: c.ten_lot,
    birthDate: c.ngay_sinh,
    childLivingLocation: c.noi_song_value,
    relationship: c.quan_he,
    providingSupport: c.chu_cap
  }))
}

function periodsArray(value) {
  return Array.isArray(value) ? value : []
}

// Parse ngày thành số YYYYMMDD để so sánh trước/sau. Hỗ trợ "DD/MM/YYYY" (DateSelect.vue),
// "MM/YYYY", hoặc chỉ năm trơn "YYYY". Trả về null nếu không có dữ liệu/không parse được.
function parseDateForSort(value) {
  const text = asText(value)
  if (!text) return null

  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return parseInt(m[3], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[1], 10)

  m = text.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) return parseInt(m[2], 10) * 10000 + parseInt(m[1], 10) * 100

  m = text.match(/^(\d{4})$/)
  if (m) return parseInt(m[1], 10) * 10000

  return null
}

// Sắp xếp chuyến đi theo "Date you returned the United States" gần nhất -> xa nhất.
// Chuyến đi thiếu ngày về (dữ liệu chưa đầy đủ) bị đẩy XUỐNG CUỐI, không được ưu tiên lên đầu -
// khác với mục việc làm/địa chỉ (không có khái niệm "đang tiếp diễn/PRESENT" ở đây, thiếu ngày về
// nghĩa là thiếu dữ liệu, tuyệt đối không được coi là chuyến đi gần nhất).
function sortTripsByReturnDate(list) {
  return [...list].sort((a, b) => {
    const endA = parseDateForSort(a?.endDate)
    const endB = parseDateForSort(b?.endDate)
    if (endA === null && endB === null) return 0
    if (endA === null) return 1
    if (endB === null) return -1
    return endB - endA
  })
}

// Mục #11 trên phiếu chỉ có 2 slot việc làm/việc học dùng chung 1 bảng (không tách riêng).
// Form online lại tách 2 danh sách riêng: work_5year (việc làm) và education_5year (việc học).
// Quyết định mapping: ưu tiên liệt kê việc làm trước, nếu chưa đủ 2 dòng thì lấy tiếp từ học vấn.
function combinedEmploymentEducation(workList, eduList) {
  const work = toArray(workList).map(w => ({
    name: pick(w.companyName),
    country: pick(w.addressCountry),
    city: pick(w.addressCity),
    state: pick(w.addressProvince),
    zip: pick(w.addressZip),
    occupation: pick(w.profession),
    from: formatDate(w.startDate),
    to: formatDate(w.endDate)
  }))
  const edu = toArray(eduList).map(e => ({
    name: pick(e.schoolName),
    country: pick(e.addressCountry),
    city: pick(e.addressCity),
    state: pick(e.addressProvince),
    zip: pick(e.addressZip),
    occupation: pick(e.program),
    from: formatDate(e.startDate),
    to: formatDate(e.endDate)
  }))
  return [...work, ...edu]
}

function offenseHistoryText(list) {
  return toArray(list)
    .map(o => [pick(o.offense), formatDate(o.date), pick(o.location), pick(o.outcome)].filter(Boolean).join(' - '))
    .filter(Boolean)
    .join('; ')
}

export function getN400HeaderValues(data = {}) {
  const fullName = pick(
    data.applicant_full_name,
    data.ten_nguoi_dien,
    [data.last_name, data.middle_name, data.first_name].filter(Boolean).join(' '),
    data.customer_name
  )
  return {
    customer: fullName,
    email: pick(data.email, data.customer_email),
    pass: pick(data.pass, data.pass_number, data.passCode),
    mshs: pick(data.mshs, data.ms, data.receipt_number, data.receiptNumber)
  }
}

// Map lựa chọn "applicant_age_status" (radio, form online N-400 -
// icaviet-forms/forms/n-400/schema.json) sang value của 7 ô "ĐIỀU KIỆN ĐỂ THI QUỐC TỊCH"
// trong public/forms/n400.html (data-eligibility-value).
const ELIGIBILITY_VALUE_MAP = {
  five_year_resident: 'GENERAL',
  three_year_spouse: 'SPOUSE_USC',
  vawa: 'VAWA',
  uscis_office: 'SPOUSE_EMPLOYMENT',
  military_wartime: 'HOSTILITIES',
  military_honorable_service: 'HONORABLE_SERVICE',
  other: 'OTHER'
}

export function getN400EligibilityValue(data = {}) {
  const raw = asText(pick(data.applicant_age_status)).toLowerCase().trim()
  return ELIGIBILITY_VALUE_MAP[raw] || ''
}

export function buildN400Mappings(data = {}) {
  // Một số bản submit (đặc biệt bản cũ) lưu dữ liệu dưới bộ field tên tiếng Việt song song với
  // field tên chuẩn schema.json (2 bộ field có thể cùng tồn tại với giá trị giống hệt nhau, hoặc
  // chỉ 1 trong 2 bộ tồn tại tùy đợt submit) - luôn pick() cả 2 để không mất dữ liệu.
  const firstName = pick(data.first_name, data.ten_hop_phap)
  const lastName = pick(data.last_name, data.ho_hop_phap)
  const middleName = pick(data.middle_name, data.ten_lot_hop_phap)
  const dob = pick(data.date_of_birth, data.ngay_sinh)
  const birthProvince = pick(data.birth_province, data.noi_sinh_tinh)
  const birthCountry = pick(data.birth_country, data.noi_sinh_quoc_gia)
  const phone = pick(data.phone, data.dien_thoai)
  const additionalPhones = toArray(data.additional_phone_numbers).length ? data.additional_phone_numbers : data.so_dien_thoai_khac
  const addressUsFull = pick(data.address_us, data.dia_chi_my)
  const addressUsPart = addressParts(addressUsFull, data.address_usStreet, data.address_usCity, data.address_usProvince, data.address_usZip, data.address_usCountry)
  const lprDate = pick(data.lpr_date, data.ngay_thuong_tru)
  const gender = pick(data.gender, data.gioi_tinh)
  const isHispanic = pick(data.is_hispanic_latino, data.dan_toc_my_latinh)
  const race = pick(data.race, data.chung_toc)
  const uscisOnlineAccount = pick(data.uscis_online_account_number, data.so_tai_khoan_uscis_online)
  const spouseCitizenshipMethod = pick(data.current_spouse_citizenship_method, data.sp_cach_tro_thanh_cong_dan_my)
  const spouseCitizenshipDate = pick(data.current_spouse_citizenship_date, data.sp_ngay_tro_thanh_cong_dan_my)
  const spouseAlienNumber = pick(data.current_spouse_alien_number, data.sp_a_number)
  const spouseMarriageCount = pick(data.current_spouse_marriage_count, data.sp_so_lan_ket_hon)
  const spouseSameAddress = pick(data.current_spouse_same_address, data.sp_dia_chi_giong_duong_don)
  const spouseResidenceFull = pick(data.current_spouse_current_residence, data.sp_dia_chi)
  const spouseResidencePart = addressParts(spouseResidenceFull, data.current_spouse_current_residenceStreet, data.current_spouse_current_residenceCity, data.current_spouse_current_residenceProvince, data.current_spouse_current_residenceZip, data.current_spouse_current_residenceCountry)
  const hasForeignTitle = pick(data.has_foreign_hereditary_title, data.co_tuoc_hieu_cha_truyen_con_noi)
  const willingRenounceTitle = pick(data.willing_to_renounce_foreign_titles, data.san_sang_tu_bo_tuoc_hieu)
  const titlesToRenounce = toArray(data.foreign_titles_to_renounce).filter(Boolean).length ? data.foreign_titles_to_renounce : data.danh_sach_tuoc_hieu_tu_bo
  const claimedUsCitizen = pick(data.claimed_us_citizen, data.tu_nhan_cong_dan_my)
  const claimedUsCitizenExpl = pick(data.claimed_us_citizen_explanation, data.giai_thich_tu_nhan_cong_dan_my)
  const registeredVoted = pick(data.registered_voted_us, data.dang_ky_bau_cu_my)
  const registeredVotedExpl = pick(data.registered_voted_us_explanation, data.giai_thich_dang_ky_bau_cu_my)
  const filedTaxesLate = pick(data.filed_taxes_late, data.dong_thue_qua_han)
  const filedTaxesLateExpl = pick(data.filed_taxes_late_explanation, data.giai_thich_dong_thue_qua_han)
  const nonResidentTax = pick(data.non_resident_tax_since_lpr, data.khai_khong_cu_tru_my_sau_khi_thanh_thuong_tru_nhan)
  const nonResidentTaxExpl = pick(data.non_resident_tax_since_lpr_explanation, data.giai_thich_khai_khong_cu_tru_my_sau_khi_thanh_thuong_tru_nhan)
  const militaryTraining = pick(data.military_training, data.huan_luyen_quan_su)
  const militaryTrainingExpl = pick(data.military_training_explanation, data.giai_thich_huan_luyen_quan_su)
  const arrestedDetained = pick(data.arrested_detained, data.bi_bat_giu_phat_giam_giu)
  const arrestedDetainedExpl = pick(data.arrested_detained_explanation, data.giai_thich_bi_bat_giu_phat_giam_giu)
  const maleLived1826 = pick(data.male_lived_us_18_26, data.nam_song_o_my_18_26)
  const selectiveServiceRegistered = pick(data.selective_service_registered, data.da_dang_ky_selective_service)
  const everServedMilitary = pick(data.ever_served_us_military, data.da_tung_phuc_vu_quan_doi_my)
  const militaryRegDate = pick(data.military_registration_date, data.ngay_dang_ky_selective_service)
  const militaryRegNumber = pick(data.military_registration_number, data.so_dang_ky_selective_service)
  const childrenCount = pick(data.children_count, data.tong_so_con)

  const address5 = periodsArray(data.address_5year)
  const trips = sortTripsByReturnDate(periodsArray(data.travel_history))
  const children = normalizedChildren(data.children_info_list, data.__children)
  // n400.html không có ô "Middle name" riêng cho con (chỉ có Given name/Family name) nên
  // ghép Tên lót + Tên vào chung ô "Given name (first name)".
  const childGivenName = [pick(children[0]?.middleName), pick(children[0]?.firstName)].filter(Boolean).join(' ')
  const eduList = toArray(data.education_5year).length ? data.education_5year : data.lich_su_hoc_van
  const jobs = combinedEmploymentEducation(data.work_5year, eduList)
  const mobilePhone = pick(periodsArray(additionalPhones)[0])
  const otherNamesGiven = pick(data.other_first, data.other_last, data.other_middle) ? 'YES' : ''
  const newNameGiven = pick(data.new_first, data.new_last, data.new_middle) ? 'YES' : ''
  const disabilityText = pick(data.medical_condition_details, data.health_accommodation_request) ? 'YES' : ''

  return [
    // ── #1 THÔNG TIN HỌ TÊN ──
    { label: 'Given name (first name)', val: firstName, after: 'THÔNG TIN HỌ TÊN', force: true },
    { label: 'Middle name', val: middleName, after: 'THÔNG TIN HỌ TÊN', force: true },
    { label: 'Family name (last name)', val: lastName, after: 'THÔNG TIN HỌ TÊN', force: true },
    { label: 'Have you used any other names since birth?', val: otherNamesGiven, after: 'THÔNG TIN HỌ TÊN' },
    { label: 'Other Given name used', val: pick(data.other_first), after: 'Have you used any other names since birth?', force: true },
    { label: 'Other Middle name used', val: pick(data.other_middle), after: 'Have you used any other names since birth?', force: true },
    { label: 'Other Family name used', val: pick(data.other_last), after: 'Have you used any other names since birth?', force: true },
    { label: 'Would you like to legally change your name?', val: newNameGiven, after: 'Other Family name used' },
    { label: 'Given name (first name)', val: pick(data.new_first), after: 'Would you like to legally change your name?', force: true },
    { label: 'Middle name', val: pick(data.new_middle), after: 'Would you like to legally change your name?', force: true },
    { label: 'Family name (last name)', val: pick(data.new_last), after: 'Would you like to legally change your name?', force: true },

    // ── #2 THÔNG TIN LIÊN LẠC ──
    { label: 'Daytime telephone number', val: phone, after: 'THÔNG TIN LIÊN LẠC', force: true },
    { label: 'Mobile telephone number (if any)', val: mobilePhone, after: 'THÔNG TIN LIÊN LẠC', force: true },
    { label: 'Email address', val: pick(data.email), after: 'THÔNG TIN LIÊN LẠC', force: true },

    // ── #3 ĐỊA CHỈ ĐANG Ở HIỆN TẠI (ưu tiên parts address_usStreet/City/Province/Zip nếu form gửi kèm) ──
    { label: 'Country', val: addressUsPart.country, after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },
    { label: 'Address line 1', val: addressUsPart.street, after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },
    { label: 'City or town', val: addressUsPart.city, after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },
    { label: 'State/Province', val: addressUsPart.province, after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },
    { label: 'ZIP code/Postal code', val: addressUsPart.zip, after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },
    { label: 'From', val: formatDate(data.address_us_start), after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI' },
    { label: 'To', val: 'PRESENT', after: 'ĐỊA CHỈ ĐANG Ở HIỆN TẠI', force: true },

    // ── #4 ĐỊA CHỈ NHẬN THƯ (mailing_address là 1 field text tự do, không có parts riêng) ──
    { label: 'This is the same as my current physical address', val: mailingSameAsCurrent(data.mailing_same_as_current, addressUsFull, data.mailing_address), after: 'ĐỊA CHỈ NHẬN THƯ' },
    { label: 'Address line 1', val: pick(data.mailing_address), after: 'ĐỊA CHỈ NHẬN THƯ', force: true },

    // ── #5 ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA (tối đa 3 slot hiển thị trên phiếu) ──
    { label: 'Country', val: pick(address5[0]?.addressCountry), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Address line 1', val: pick(address5[0]?.addressStreet), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'City or town', val: pick(address5[0]?.addressCity), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Province', val: pick(address5[0]?.addressProvince), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'ZIP code/Postal code', val: pick(address5[0]?.addressZip), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'From', val: formatDate(address5[0]?.startDate), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'To', val: endDateOrPresent(address5[0], formatDate(address5[0]?.endDate)), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },

    { label: 'Country', val: pick(address5[1]?.addressCountry), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Address line 1', val: pick(address5[1]?.addressStreet), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'City or town', val: pick(address5[1]?.addressCity), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Province', val: pick(address5[1]?.addressProvince), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'ZIP code/Postal code', val: pick(address5[1]?.addressZip), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'From', val: formatDate(address5[1]?.startDate), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'To', val: endDateOrPresent(address5[1], formatDate(address5[1]?.endDate)), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },

    { label: 'Country', val: pick(address5[2]?.addressCountry), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Address line 1', val: pick(address5[2]?.addressStreet), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'City or town', val: pick(address5[2]?.addressCity), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'Province', val: pick(address5[2]?.addressProvince), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'ZIP code/Postal code', val: pick(address5[2]?.addressZip), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'From', val: formatDate(address5[2]?.startDate), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },
    { label: 'To', val: endDateOrPresent(address5[2], formatDate(address5[2]?.endDate)), after: 'ĐỊA CHỈ SỐNG TRONG VÒNG 5 NĂM QUA HOẶC 3 NĂM ĐỐI VỚI DIỆN VỢ CHỒNG CÔNG DÂN MỸ', force: true },

    // ── #6 YÊU CẦU HỖ TRỢ CHO NGƯỜI KHUYẾT TẬT ──
    // Form online không có câu hỏi YES/NO riêng cho mục này, chỉ có 2 ô mô tả tự do
    // (medical_condition_details, health_accommodation_request) nằm ở phần khác của form.
    // Suy luận: có nội dung mô tả => YES; không có nội dung => để trống (không khẳng định là NO).
    { label: 'Do you have a physical or developmental disability or mental impairment that prevents you from demonstrating your knowledge and understanding of the English language and/or civics requirements for naturalization?', val: disabilityText, after: 'YÊU CẦU HỖ TRỢ CHO NGƯỜI KHUYẾT TẬT' },

    // ── #7 THÔNG TIN NGÀY THÁNG NĂM SINH VÀ NƠI SINH ──
    { label: 'What is your Date of Birth?', val: formatDate(dob), after: 'THÔNG TIN NGÀY THÁNG NĂM SINH VÀ NƠI SINH', force: true },
    { label: 'Was your mother or father (including adoptive mother or father) a U.S. citizen before your 18th birthday?', val: yesNoAny(data.parents_married_before_18), after: 'THÔNG TIN NGÀY THÁNG NĂM SINH VÀ NƠI SINH' },
    { label: 'What is your country of Birth?', val: [birthProvince, birthCountry].filter(Boolean).join(', '), after: 'THÔNG TIN NGÀY THÁNG NĂM SINH VÀ NƠI SINH', force: true },

    // ── #8/#9 THÔNG TIN ĐỊNH CƯ ──
    // "What is your country of citizenship or nationality?" không có field tương ứng trong form online -> để trống.
    { label: 'If you are a lawful permanent resident, when did you become a lawful permanent resident?', val: formatDate(lprDate), after: 'THÔNG TIN ĐỊNH CƯ', force: true },
    { label: 'What is your A-Number?', val: pick(data.a_number), after: 'THÔNG TIN ĐỊNH CƯ', force: true },
    // "Do you want SSA to issue..." và "Do you authorize disclosure..." không có field tương ứng -> để trống.
    { label: 'What is your U.S. Social Security number (SSN)?', val: pick(data.ssn), after: 'What is your A-Number?', force: true },
    { label: 'What is your USCIS Online Account Number?', val: uscisOnlineAccount, after: 'What is your U.S. Social Security number (SSN)?', force: true },

    // ── #10 MÔ TẢ BẢN THÂN ──
    { label: 'What is your sex?', val: genderText(gender), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your ethnicity?', val: hispanicText(isHispanic), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your race?', val: raceText(race), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your height?', val: heightText(data.height_feet, data.height_inches, data.height), after: 'MÔ TẢ BẢN THÂN', force: true },
    { label: 'What is your weight?', val: pick(data.weight), after: 'What is your height?', force: true },
    { label: 'What is the color of your eyes?', val: eyeColorText(data.eye_color), after: 'What is your weight?', force: true },
    { label: 'What is the color of your hair?', val: hairColorText(data.hair_color), after: 'What is the color of your eyes?', force: true },

    // ── #11 VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA (gộp việc làm + việc học, tối đa 2 slot) ──
    { label: 'What is the name of the employer/school?', val: pick(jobs[0]?.name), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'Country', val: pick(jobs[0]?.country), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'City or town', val: pick(jobs[0]?.city), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'State/Province', val: pick(jobs[0]?.state), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'ZIP code/Postal code', val: pick(jobs[0]?.zip), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'What was your occupation?', val: pick(jobs[0]?.occupation), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'From', val: pick(jobs[0]?.from), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'To', val: endDateOrPresent(jobs[0], pick(jobs[0]?.to)), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },

    { label: 'What is the name of the employer/ school?', val: pick(jobs[1]?.name), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'Country', val: pick(jobs[1]?.country), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'City or town', val: pick(jobs[1]?.city), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'State/Province', val: pick(jobs[1]?.state), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'ZIP code/Postal code', val: pick(jobs[1]?.zip), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'What was your occupation?', val: pick(jobs[1]?.occupation), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'From', val: pick(jobs[1]?.from), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },
    { label: 'To', val: endDateOrPresent(jobs[1], pick(jobs[1]?.to)), after: 'VIỆC LÀM, VIỆC HỌC TẬP TRONG 5 NĂM QUA', force: true },

    // ── #12 DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA (tối đa 5 slot) ──
    { label: 'Have you taken a trip outside of the United States in the last 5 years?', val: yesNoFromArrayPresence(trips), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Countries you traveled to', val: pick(trips[0]?.destination), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you left the United States', val: formatDate(trips[0]?.startDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you returned the United States', val: formatDate(trips[0]?.endDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },

    { label: 'Countries you traveled to', val: pick(trips[1]?.destination), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you left the United States', val: formatDate(trips[1]?.startDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you returned the United States', val: formatDate(trips[1]?.endDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },

    { label: 'Countries you traveled to', val: pick(trips[2]?.destination), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you left the United States', val: formatDate(trips[2]?.startDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you returned the United States', val: formatDate(trips[2]?.endDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },

    { label: 'Countries you traveled to', val: pick(trips[3]?.destination), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you left the United States', val: formatDate(trips[3]?.startDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you returned the United States', val: formatDate(trips[3]?.endDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },

    { label: 'Countries you traveled to', val: pick(trips[4]?.destination), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you left the United States', val: formatDate(trips[4]?.startDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },
    { label: 'Date you returned the United States', val: formatDate(trips[4]?.endDate), after: 'DU LỊCH NGOÀI NƯỚC MỸ TRONG 5 NĂM QUA', force: true },

    // ── #13 THÔNG TIN BẢN THÂN VÀ GIA ĐÌNH ──
    { label: 'What is your current marital status?', val: maritalStatusVN(data.marital_status), after: 'THÔNG TIN BẢN THÂN VÀ GIA ĐÌNH', force: true },
    { label: 'Is your current spouse currently a member of the U.S. armed forces?', val: yesNoAny(data.current_spouse_armed_forces), after: 'THÔNG TIN BẢN THÂN VÀ GIA ĐÌNH' },
    { label: 'How many times have you been married?', val: pick(data.marriage_count), after: 'THÔNG TIN BẢN THÂN VÀ GIA ĐÌNH', force: true },

    // ── #14/#15/#16 THÔNG TIN VỢ/CHỒNG CỦA NGƯỜI NỘP ĐƠN ──
    { label: 'Given name (first name)', val: pick(data.current_spouse_first_name), after: "What is your current spouse's legal name?", force: true },
    { label: "Middle name (if applicable)", val: pick(data.current_spouse_middle_name), after: "What is your current spouse's legal name?", force: true },
    { label: 'Family name (last name)', val: pick(data.current_spouse_last_name), after: "What is your current spouse's legal name?", force: true },
    { label: "What is your current spouse's date of birth?", val: formatDate(data.current_spouse_birthdate), after: "What is your current spouse's legal name?" },
    { label: 'When did you marry your current spouse?', val: formatDate(data.current_spouse_marriage_date), after: "What is your current spouse's date of birth?" },

    // #15: phiếu đã có riêng dòng "Is your current spouse's physical address the same as yours
    // physical address?" (YES/NO) trước khi liệt kê địa chỉ chi tiết - map current_spouse_same_address
    // vào đúng dòng này. Dòng "What is current spouse's current physical address?" chỉ còn là dòng
    // dẫn/tiêu đề cho khối Country/Address line 1/City/Province/ZIP bên dưới, không có giá trị riêng,
    // chỉ dùng làm anchor cho các field địa chỉ.
    { label: "Is your current spouse's physical address the same as yours physical address?", val: yesNoAny(spouseSameAddress), after: "When did you marry your current spouse?" },
    { label: 'Country', val: spouseResidencePart.country, after: "What is current spouse's current physical address?", force: true },
    { label: 'Address line 1', val: spouseResidencePart.street, after: "What is current spouse's current physical address?", force: true },
    { label: 'City or town', val: spouseResidencePart.city, after: "What is current spouse's current physical address?", force: true },
    { label: 'Province', val: spouseResidencePart.province, after: "What is current spouse's current physical address?", force: true },
    { label: 'ZIP code/Postal code', val: spouseResidencePart.zip, after: "What is current spouse's current physical address?", force: true },

    { label: 'When did your current spouse become a U.S. citizen?', val: spouseCitizenshipMethodText(spouseCitizenshipMethod), after: "What is current spouse's current physical address?", force: true },
    { label: 'On what date did your current spouse become a U.S. citizen?', val: formatDate(spouseCitizenshipDate), after: 'When did your current spouse become a U.S. citizen?' },
    { label: "What is your current spouse's A-Number?", val: spouseAlienNumber, after: 'On what date did your current spouse become a U.S. citizen?' },
    { label: 'How many times has your current spouse been married?', val: spouseMarriageCount, after: "What is your current spouse's A-Number?" },
    // "What is the name of your current spouse's current employer or company?" không có field tương ứng -> để trống.

    // ── #19 THÔNG TIN CON CÁI (phiếu chỉ có 1 slot hiển thị, form online cho phép nhiều con) ──
    { label: 'Do you have any children?', val: yesNoFromArrayPresence(children) || (childrenCount ? 'YES' : ''), after: 'THÔNG TIN CON CÁI', force: true },
    { label: 'How many children do you have?', val: childrenCount, after: 'THÔNG TIN CON CÁI', force: true },
    { label: 'Given name (first name)', val: childGivenName, after: 'How many children do you have?', force: true },
    { label: 'Family name (last name)', val: pick(children[0]?.lastName), after: 'How many children do you have?', force: true },
    { label: "What is your son or daughter’s date of birth?", val: formatDate(children[0]?.birthDate), after: 'How many children do you have?', force: true },
    { label: "Where does your son or daughter’s reside?", val: childLivingLocationText(children[0]?.childLivingLocation), after: 'How many children do you have?', force: true },
    { label: "What is your child’s relationship to you?", val: childRelationshipText(children[0]?.relationship), after: 'How many children do you have?', force: true },
    { label: 'Are you providing support for your son or daughter?', val: yesNoAny(children[0]?.providingSupport), after: 'How many children do you have?', force: true },

    // ── #20 THÔNG TIN VỀ HỒ SƠ ĐIỂM ĐẠO ĐỨC ──
    // Form online chỉ thu thập một số câu trong khối "good moral character" rất dài của N-400 thật
    // (phần lớn ~25 câu hỏi "Have you EVER..." về đảng cộng sản/khủng bố/bắt cóc/buôn ma túy/mại
    // dâm/đa thê/hôn nhân giả/nhập cư lậu/cờ bạc/không cấp dưỡng/khai gian... KHÔNG có field tương
    // ứng trong form -> các ô đó sẽ để trống trên phiếu, cần điền tay hoặc hỏi trực tiếp khách hàng).
    { label: 'Have you EVER claimed to be a U.S. citizen (in writing or any other way)?', val: yesNoAny(claimedUsCitizen), after: 'THÔNG TIN VỀ HỒ SƠ ĐIỂM ĐẠO ĐỨC', force: true },
    { label: 'Provide an explanation', val: claimedUsCitizenExpl, after: 'Have you EVER claimed to be a U.S. citizen (in writing or any other way)?', force: true },

    { label: 'Have you EVER registered to vote or voted in any federal, state, or local election in the United States?', val: yesNoAny(registeredVoted), after: 'Provide an explanation', force: true },
    { label: 'Provide an explanation', val: registeredVotedExpl, after: 'Have you EVER registered to vote or voted in any federal, state, or local election in the United States?', force: true },

    { label: 'Do you now have, or did you EVER have, a hereditary title or an order of nobility in any foreign country?', val: yesNoAny(hasForeignTitle), after: 'Provide an explanation', force: true },
    { label: 'Are you willing to give up any inherited titles or orders of nobility that you have in a foreign country at your naturalization ceremony?', val: yesNoAny(willingRenounceTitle), after: 'Do you now have, or did you EVER have, a hereditary title or an order of nobility in any foreign country?', force: true },
    { label: 'List all your inherited titles and orders of nobility.', val: toArray(titlesToRenounce).filter(Boolean).join(', '), after: 'Are you willing to give up any inherited titles or orders of nobility that you have in a foreign country at your naturalization ceremony?', force: true },

    // "Do you currently owe any overdue federal, state, or local taxes..." không có field riêng trong
    // form; field gần nghĩa nhất là filed_taxes_late ("Đã bao giờ đóng thuế quá hạn") -> map tạm vào đây.
    { label: 'Do you currently owe any overdue federal, state, or local taxes in the United States?', val: yesNoAny(filedTaxesLate), after: 'List all your inherited titles and orders of nobility.', force: true },
    { label: 'Provide an explanation', val: filedTaxesLateExpl, after: 'Do you currently owe any overdue federal, state, or local taxes in the United States?', force: true },

    { label: 'Since you became a lawful permanent resident, have you called yourself a "non-U.S. resident" on a federal, state, or local tax return or decided not to file a tax return because you considered yourself to be a non-U.S. resident?', val: yesNoAny(nonResidentTax), after: 'Provide an explanation', force: true },
    { label: 'Provide an explanation', val: nonResidentTaxExpl, after: 'Since you became a lawful permanent resident, have you called yourself a "non-U.S. resident" on a federal, state, or local tax return or decided not to file a tax return because you considered yourself to be a non-U.S. resident?', force: true },

    { label: 'Have you EVER received any weapons training, paramilitary training, or other military-type training?', val: yesNoAny(militaryTraining), after: 'Provide an explanation', force: true },
    { label: 'Provide an explanation', val: militaryTrainingExpl, after: 'Have you EVER received any weapons training, paramilitary training, or other military-type training?', force: true },

    {
      label: 'Have you EVER been arrested, cited, detained, or confined by any law enforcement officer, military official (in the U.S. or elsewhere), or immigration official for any reason, or been charged with a crime or offense, or notified that you were being investigated for a crime?',
      val: yesNoAny(arrestedDetained),
      after: 'Provide an explanation',
      force: true
    },
    { label: 'Provide an explanation', val: pick(arrestedDetainedExpl, offenseHistoryText(data.offense_history)), after: 'Have you EVER been arrested, cited, detained, or confined by any law enforcement officer, military official (in the U.S. or elsewhere), or immigration official for any reason, or been charged with a crime or offense, or notified that you were being investigated for a crime?', force: true },

    { label: 'Are you a male who lived in the United States at any time between your 18th and 26th birthdays?', val: yesNoAny(maleLived1826), after: 'Provide an explanation', force: true },
    { label: 'Did you register for the Selective Service?', val: yesNoAny(selectiveServiceRegistered), after: 'Are you a male who lived in the United States at any time between your 18th and 26th birthdays?', force: true },
    { label: 'When did you register for the Selective Service?', val: formatDate(militaryRegDate), after: 'Did you register for the Selective Service?', force: true },
    { label: 'What is your Selective Service Number?', val: militaryRegNumber, after: 'When did you register for the Selective Service?', force: true },

    { label: 'Have you EVER served in the U.S. armed forces?', val: yesNoAny(everServedMilitary), after: 'What is your Selective Service Number?', force: true },

    { label: 'Are you currently a member of the U.S. armed forces?', val: yesNoAny(data.serving_us_military), after: 'Have you EVER served in the U.S. armed forces?', force: true }
  ]
}
