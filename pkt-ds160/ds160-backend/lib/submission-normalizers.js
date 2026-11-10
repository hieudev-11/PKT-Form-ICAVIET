// Normalizers/helpers dùng chung cho các route ds160/i130a/audit-logs.
// Tách nguyên trạng từ server.js (Phase 3) — không đổi hành vi.
import { poolForm, queryWithRetry } from '../db.js';

export function parseJsonField(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function normalizeFormType(value) {
  const raw = String(value || 'ds160').trim().toLowerCase();
  if (raw === 'i130a' || raw === 'i-130a' || raw === 'i-130-a') return { slug: 'bao-lanh', types: ['i130a', 'i-130a', 'i-130-a'], label: 'I-130A' };
  if (raw === 'ds160' || raw === 'ds-160') return { slug: 'ds-160', types: ['ds160', 'ds-160'], label: 'DS-160' };
  if (raw === 'ds260' || raw === 'ds-260') return { slug: 'ds-260', types: ['ds260', 'ds-260'], label: 'DS-260' };
  if (raw === 'n600' || raw === 'n-600') return { slug: 'n-600', types: ['n600', 'n-600'], label: 'N-600' };
  if (raw === 'n400' || raw === 'n-400') return { slug: 'n-400', types: ['n400', 'n-400'], label: 'N-400' };
  return { slug: raw.replace(/_/g, '-'), types: [raw, raw.replace(/_/g, '-')], label: raw.toUpperCase() };
}

// Chiều ngược lại của normalizeFormType: từ form_slug lưu trong DB, suy ra
// giá trị formType mà frontend dùng để chọn đúng WordPaper/API khi mở hồ sơ.
const SLUG_TO_FORM_TYPE = {
  'ds-160': 'ds160',
  'bao-lanh': 'i130a-nbl',
  'ndbl': 'i130a-ndbl'
};
export function formTypeFromSlug(slug) {
  return SLUG_TO_FORM_TYPE[slug] || slug;
}

export function firstFilled(...values) {
  return values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';
}

export function firstArrayItem(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value[0] || {};
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  }
  return {};
}

export function getObjectValue(source, ...keys) {
  if (!source || typeof source !== 'object') return '';
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

export function normalizeMatchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeNameKey(value) {
  return normalizeMatchText(value).replace(/\s+/g, '');
}

export function normalizePhoneKey(value) {
  let digits = String(value || '').replace(/\D+/g, '');
  if (digits.startsWith('84') && digits.length >= 11) digits = '0' + digits.slice(2);
  return digits;
}

export function normalizeDateCandidates(value) {
  const raw = String(value || '').trim();
  const candidates = new Set();
  if (!raw) return candidates;

  const parts = raw.split(/[^0-9]+/).filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      candidates.add(`${a}${String(b).padStart(2, '0')}${String(c).padStart(2, '0')}`);
    } else if (c.length === 4) {
      const mm = String(a).padStart(2, '0');
      const dd = String(b).padStart(2, '0');
      const yy = c;
      candidates.add(`${yy}${mm}${dd}`);
      candidates.add(`${yy}${dd}${mm}`);
    }
  }

  const compact = raw.replace(/\D+/g, '');
  if (compact.length === 8) candidates.add(compact);
  return candidates;
}

export function datesMatch(a, b) {
  const aSet = normalizeDateCandidates(a);
  const bSet = normalizeDateCandidates(b);
  if (!aSet.size || !bSet.size) return false;
  for (const value of aSet) {
    if (bSet.has(value)) return true;
  }
  return false;
}

export function namesMatch(expected, actual) {
  const expectedKey = normalizeNameKey(expected);
  const actualKey = normalizeNameKey(actual);
  if (!expectedKey || !actualKey) return false;
  return expectedKey === actualKey || expectedKey.includes(actualKey) || actualKey.includes(expectedKey);
}

export function phonesMatch(expected, actual) {
  const expectedKey = normalizePhoneKey(expected);
  const actualKey = normalizePhoneKey(actual);
  if (!expectedKey || !actualKey) return false;
  return expectedKey === actualKey || expectedKey.endsWith(actualKey) || actualKey.endsWith(expectedKey);
}

export function getExpectedBeneficiaryInfo(petitionerData = {}) {
  const expected = petitionerData.nguoiDuocBaoLanhDuKien || petitionerData.expectedBeneficiary || petitionerData.beneficiaryExpected || {};
  return {
    name: firstFilled(
      petitionerData.beneficiaryExpectedName,
      petitionerData.expectedBeneficiaryName,
      petitionerData.expected_beneficiary_name,
      expected.hoTen,
      expected.fullName,
      expected.name,
      petitionerData.beneficiaryFullName,
      petitionerData.beneficiaryName
    ),
    dob: firstFilled(
      petitionerData.beneficiaryExpectedDob,
      petitionerData.beneficiaryExpectedBirthDate,
      petitionerData.expectedBeneficiaryDob,
      petitionerData.expectedBeneficiaryBirthDate,
      petitionerData.expected_beneficiary_dob,
      expected.ngaySinh,
      expected.birthDate,
      expected.dob
    ),
    phone: firstFilled(
      petitionerData.beneficiaryExpectedPhone,
      petitionerData.expectedBeneficiaryPhone,
      petitionerData.expected_beneficiary_phone,
      expected.soDienThoai,
      expected.phone,
      expected.mobilePhone
    )
  };
}

export function getBeneficiaryIdentityInfo(beneficiaryData = {}) {
  return {
    name: firstFilled(beneficiaryData.fullName, beneficiaryData.beneficiaryFullName, beneficiaryData.tenTrenGiayTo, beneficiaryData.customerName),
    dob: firstFilled(beneficiaryData.birthDate, beneficiaryData.beneficiaryBirthDate, beneficiaryData.ngaySinh),
    phone: firstFilled(beneficiaryData.contactPrimary, beneficiaryData.beneficiaryDaytimePhone, beneficiaryData.mobilePhone, beneficiaryData.soDienThoai)
  };
}

export function compareExpectedBeneficiary(petitionerData = {}, beneficiaryData = {}) {
  const expected = getExpectedBeneficiaryInfo(petitionerData);
  const actual = getBeneficiaryIdentityInfo(beneficiaryData);
  const enabled = !!(expected.name || expected.dob || expected.phone);
  if (!enabled) {
    return { enabled: false, passed: true, score: 0, expected, actual, nameMatch: false, dobMatch: false, phoneMatch: false, message: 'Hồ sơ NBL chưa có thông tin người được bảo lãnh dự kiến.' };
  }

  const nameMatch = namesMatch(expected.name, actual.name);
  const dobMatch = datesMatch(expected.dob, actual.dob);
  const phoneMatch = phonesMatch(expected.phone, actual.phone);
  const score = (nameMatch ? 10 : 0) + (dobMatch ? 10 : 0) + (phoneMatch ? 80 : 0);
  const passed = score >= 80;
  const message = passed
    ? `Thông tin NDBL khớp ${score}%.`
    : `Người được bảo lãnh đang chọn không khớp với thông tin NBL đã khai. Điểm khớp: ${score}%.`;

  return { enabled, passed, score, expected, actual, nameMatch, dobMatch, phoneMatch, message };
}

export async function getFormSubmissionById(id, slug) {
  const [rows] = await queryWithRetry(poolForm,
    `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = ? LIMIT 1`,
    [id, slug]
  );
  return rows[0] || null;
}

export const I130A_RELATION_CATEGORIES = [
  { value: 'vo-chong', label: 'Bảo lãnh vợ chồng' },
  { value: 'con-gai', label: 'Bảo lãnh con cái' },
  { value: 'anh-chi-em', label: 'Bảo lãnh anh chị em' },
  { value: 'cha-me', label: 'Bảo lãnh cha mẹ' },
  { value: 'hon-phu', label: 'Bảo lãnh hôn phu hôn thê' }
];

export function detectI130ARelationCategory(data = {}) {
  const raw = [
    data.loaiHoSoBaoLanh,
    data.loai_ho_so_bao_lanh,
    data.dienBaoLanh,
    data.dien_bao_lanh,
    data.loaiHoSo,
    data.relationship,
    data.relationshipToPetitioner,
    data.relationship_to_petitioner,
    data.petitionType,
    data.caseType,
    data.type
  ].map(v => String(v || '')).join(' ');

  const compact = normalizeMatchText(raw).replace(/\s+/g, '-');
  const text = normalizeMatchText(raw);

  if (compact.includes('vo-chong') || text.includes('vo chong') || text.includes('spouse') || text.includes('cr1') || text.includes('ir1')) return 'vo-chong';
  if (compact.includes('con-gai') || compact.includes('con-cai') || text.includes('con cai') || text.includes('child') || text.includes('children')) return 'con-gai';
  if (compact.includes('anh-chi-em') || text.includes('anh chi em') || text.includes('sibling') || text.includes('brother') || text.includes('sister')) return 'anh-chi-em';
  if (compact.includes('cha-me') || text.includes('cha me') || text.includes('parent') || text.includes('father') || text.includes('mother')) return 'cha-me';
  if (compact.includes('hon-phu') || compact.includes('hon-the') || text.includes('hon phu') || text.includes('hon the') || text.includes('fiance')) return 'hon-phu';

  return '';
}

export function getI130ARelationLabel(value) {
  return I130A_RELATION_CATEGORIES.find(item => item.value === value)?.label || '';
}

export function hasMeaningfulValue(source) {
  if (!source || typeof source !== 'object') return false;
  return Object.values(source).some(value => {
    if (Array.isArray(value)) return value.some(item => hasMeaningfulValue(item));
    if (value && typeof value === 'object') return hasMeaningfulValue(value);
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

export function collectNameCandidates(...values) {
  const names = [];
  const pushName = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushName);
      return;
    }
    if (value && typeof value === 'object') {
      [
        value.fullName,
        value.name,
        value.ten,
        value.hoTen,
        value.tenTrenGiayTo,
        [value.familyName, value.middleName, value.givenName].filter(Boolean).join(' ')
      ].forEach(pushName);
      return;
    }
    const text = String(value).trim();
    if (text && !names.some(name => normalizeNameKey(name) === normalizeNameKey(text))) names.push(text);
  };
  values.forEach(pushName);
  return names;
}

export function parseSubmissionData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function normalizeBaoLanhData(input = {}) {
  const data = { ...input };
  const father = firstArrayItem(data.parents?.father, data.thongTinCha);
  const mother = firstArrayItem(data.parents?.mother, data.thongTinMe);
  const currentMarriage = firstArrayItem(data.currentMarriage, data.honPhoiHienTai);
  const pastMarriage = firstArrayItem(data.pastMarriages, data.honNhanCu);
  const oldAddress = firstArrayItem(data.addresses5Years, data.diaChi5Nam);
  const jobRecords = [];
  [data.jobs5Years, data.congViec5Nam, data.previousJobs, data.employment5Years, data.previousJobsList].forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(record => {
        if (record && typeof record === 'object' && Object.values(record).some(v => firstFilled(v))) {
          jobRecords.push(record);
        }
      });
    } else if (value && typeof value === 'object' && Object.values(value).some(v => firstFilled(v))) {
      jobRecords.push(value);
    }
  });
  const oldJob = jobRecords[0] || firstArrayItem(data.jobs5Years, data.congViec5Nam);
  const oldJob2 = jobRecords[1] || {};

  const fullName = firstFilled(data.fullName, data.q29_tenTren, data.tenTrenGiayTo, data.customerName);
  const otherName = firstFilled(data.otherName, data.q28_tenGoi, data.tenGoiKhac);
  const birthDate = firstFilled(data.birthDate, data.q144_ngaySinh144, data.ngaySinh);
  const gender = firstFilled(data.gender, data.q15_giiTinh, data.gioiTinh);
  const placeBirth = firstFilled(data.placeBirth, data.birthCity, data.q19_noiSinh, data.noiSinh);
  const phone = firstFilled(data.contactPrimary, data.mobilePhone, data.daytimePhone, data.q20_sDin, data.soDienThoai);
  const email = firstFilled(data.email, data.emailAddress, data.q21_email);
  const beneficiarySpouseName = firstFilled(
    data.beneficiaryFullName,
    data.beneficiaryName,
    data.spouseFullName,
    data.currentSpouseFullName,
    currentMarriage.fullName,
    currentMarriage.name,
    currentMarriage.ten
  );
  const expectedBeneficiary = getExpectedBeneficiaryInfo(data);
  const mailingAddress = firstFilled(
    data.petitionerMailingAddress,
    data.mailingAddress,
    data.diaChiNhanThuMy,
    data.q23_typeA23,
    data.diaChiNhanThuVN,
    data.currentAddressUS,
    data.currentAddress
  );
  const maritalStatus = firstFilled(data.maritalStatus, data.currentMaritalStatus, data.q131_tinhTrang131, data.q40_hinTai40, data.tinhTrangHonNhan);

  return {
    ...data,
    fullName,
    customerName: firstFilled(data.customerName, fullName),
    beneficiaryFullName: beneficiarySpouseName,
    beneficiaryName: firstFilled(data.beneficiaryName, beneficiarySpouseName),
    petitionerFullName: firstFilled(data.petitionerFullName, fullName),
    otherName,
    petitionerOtherName: firstFilled(data.petitionerOtherName, otherName),
    birthDate,
    petitionerBirthDate: firstFilled(data.petitionerBirthDate, birthDate),
    gender,
    petitionerGender: firstFilled(data.petitionerGender, gender),
    placeBirth,
    birthCity: firstFilled(data.birthCity, placeBirth),
    petitionerBirthCity: firstFilled(data.petitionerBirthCity, placeBirth),
    contactPrimary: phone,
    daytimePhone: firstFilled(data.daytimePhone, phone),
    mobilePhone: firstFilled(data.mobilePhone, phone),
    petitionerDaytimePhone: firstFilled(data.petitionerDaytimePhone, phone),
    petitionerMobilePhone: firstFilled(data.petitionerMobilePhone, phone),
    email,
    emailAddress: firstFilled(data.emailAddress, email),
    petitionerEmail: firstFilled(data.petitionerEmail, email),
    mailingAddress,
    petitionerMailingAddress: firstFilled(data.petitionerMailingAddress, mailingAddress),
    petitionerMailingAddressLine1: firstFilled(data.petitionerMailingAddressLine1, data.mailingAddressLine1, data.diaChiNhanThuMyStreet, data.diaChiNhanThuMyLine1),
    petitionerMailingAddressLine2: firstFilled(data.petitionerMailingAddressLine2, data.mailingAddressLine2, data.diaChiNhanThuMyLine2),
    petitionerMailingCity: firstFilled(data.petitionerMailingCity, data.mailingAddressCity, data.diaChiNhanThuMyCity),
    petitionerMailingState: firstFilled(data.petitionerMailingState, data.mailingAddressState, data.diaChiNhanThuMyState, data.diaChiNhanThuMyProvince),
    petitionerMailingZipCode: firstFilled(data.petitionerMailingZipCode, data.mailingAddressZipCode, data.diaChiNhanThuMyZipCode, data.diaChiNhanThuMyZip),
    petitionerMailingCountry: firstFilled(data.petitionerMailingCountry, data.mailingAddressCountry, data.diaChiNhanThuMyCountry),
    maritalStatus,
    currentMaritalStatus: firstFilled(data.currentMaritalStatus, maritalStatus),
    height: firstFilled(data.height, data.q112_chiuCao, data.q112_chieuCao, data.chieuCao, data.chieu_cao),
    petitionerHeight: firstFilled(data.petitionerHeight, data.height, data.q112_chiuCao, data.q112_chieuCao, data.chieuCao, data.chieu_cao),
    weight: firstFilled(data.weight, data.q114_canNng, data.q114_canNang, data.canNang, data.can_nang),
    petitionerWeight: firstFilled(data.petitionerWeight, data.weight, data.q114_canNng, data.q114_canNang, data.canNang, data.can_nang),
    eyeColor: firstFilled(data.eyeColor, data.q116_mauMt_other, data.q116_mauMat_other, data.q116_mauMt, data.q116_mauMat, data.mauMat, data.mau_mat),
    hairColor: firstFilled(data.hairColor, data.q117_mauToc_other, data.q117_mauToc, data.mauToc, data.mau_toc),
    race: firstFilled(data.race, data.q118_chungTc, data.q118_chungToc, data.chungToc, data.chung_toc),
    ethnicity: firstFilled(data.ethnicity, data.q115_coPhai, data.danToc, data.dan_toc, data.danTocMyLatinh),
    ssn: firstFilled(data.ssn, data.socialSecurityNumber, data.q121_sSsn, data.soSsn),
    socialSecurityNumber: firstFilled(data.socialSecurityNumber, data.ssn, data.q121_sSsn, data.soSsn),
    aNumber: firstFilled(data.aNumber, data.petitionerANumber, data.q151_sThe, data.soTheXanh),
    petitionerANumber: firstFilled(data.petitionerANumber, data.aNumber, data.q151_sThe, data.soTheXanh),
    uscisOnlineAccountNumber: firstFilled(data.uscisOnlineAccountNumber, data.q123_sTai, data.soTaiKhoanUscis),
    currentImmigrationStatus: firstFilled(data.currentImmigrationStatus, data.q131_tinhTrang131, data.tinhTrangCuTruMy),
    howObtainedCitizenship: firstFilled(data.howObtainedCitizenship, data.citizenshipMethod, data.dienQuocTich),
    certificateNumber: firstFilled(data.certificateNumber, data.q141_sChng, data.soChungNhanQuocTich),
    certificateIssuedPlace: firstFilled(data.certificateIssuedPlace, data.q142_noiCp, data.noiCapQuocTich),
    certificateIssuedDate: firstFilled(data.certificateIssuedDate, data.q145_ngayCp, data.ngayCapQuocTich),
    hasNaturalizationCertificate: firstFilled(data.hasNaturalizationCertificate, data.q130_coQuc, data.dienQuocTich ? 'Có' : ''),
    citizenshipThroughAdoption: firstFilled(data.citizenshipThroughAdoption, data.q143_coQuc143, data.quocTichDienConNuoi),
    previouslyFiledPetition: firstFilled(data.previouslyFiledPetition, data.tungBaoLanh, data.q70_banDa70, data.tungDuocBaoLanh),
    submittingSeparatePetitions: firstFilled(data.submittingSeparatePetitions, data.dangBaoLanhAiKhac, data.q126_banCo),
    spouseFullName: firstFilled(data.spouseFullName, currentMarriage.name, currentMarriage.ten),
    currentMarriageDate: firstFilled(data.currentMarriageDate, currentMarriage.marriageDate, currentMarriage.ngayKetHon),
    currentMarriagePlace: firstFilled(data.currentMarriagePlace, currentMarriage.marriagePlace, currentMarriage.noiKetHon),
    formerSpouseFullName: firstFilled(data.formerSpouseFullName, pastMarriage.name, pastMarriage.ten),
    formerMarriageEndDate: firstFilled(data.formerMarriageEndDate, pastMarriage.divorceDate, pastMarriage.ngayLyHon),
    fatherFullName: firstFilled(data.fatherFullName, father.name, father.ten),
    fatherBirthDate: firstFilled(data.fatherBirthDate, father.dob, father.ngaySinh),
    fatherBirthCountry: firstFilled(data.fatherBirthCountry, father.pob, father.noiSinh),
    fatherResidenceCountry: firstFilled(data.fatherResidenceCountry, father.address, father.diaChi),
    fatherResidenceAddress: firstFilled(data.fatherResidenceAddress, father.address, father.diaChi),
    motherFullName: firstFilled(data.motherFullName, mother.name, mother.ten),
    motherBirthDate: firstFilled(data.motherBirthDate, mother.dob, mother.ngaySinh),
    motherBirthCountry: firstFilled(data.motherBirthCountry, mother.pob, mother.noiSinh),
    motherResidenceCountry: firstFilled(data.motherResidenceCountry, mother.address, mother.diaChi),
    motherResidenceAddress: firstFilled(data.motherResidenceAddress, mother.address, mother.diaChi),
    petitionerPreviousAddress1: firstFilled(data.petitionerPreviousAddress1, oldAddress.address, oldAddress.diaChi),
    previousAddress1Line1: firstFilled(data.previousAddress1Line1, getObjectValue(oldAddress, 'addressLine1', 'line1', 'street')),
    previousAddress1Line2: firstFilled(data.previousAddress1Line2, getObjectValue(oldAddress, 'addressLine2', 'line2')),
    previousAddress1City: firstFilled(data.previousAddress1City, getObjectValue(oldAddress, 'city', 'thanhPho', 'huyen')),
    previousAddress1State: firstFilled(data.previousAddress1State, getObjectValue(oldAddress, 'state', 'province', 'tinh')),
    previousAddress1ZipCode: firstFilled(data.previousAddress1ZipCode, getObjectValue(oldAddress, 'zipCode', 'zip', 'postalCode')),
    previousAddress1Country: firstFilled(data.previousAddress1Country, getObjectValue(oldAddress, 'country', 'quocGia')),
    previousAddress1From: firstFilled(data.previousAddress1From, oldAddress.start, oldAddress.ngayBatDau),
    previousAddress1To: firstFilled(data.previousAddress1To, oldAddress.end, oldAddress.ngayChuyenDi),
    companyName01: firstFilled(data.companyName01, oldJob.companyName, oldJob.company, oldJob.employer, oldJob.name, oldJob.tenCongTy),
    employer1Name: firstFilled(data.employer1Name, oldJob.companyName, oldJob.company, oldJob.employer, oldJob.name, oldJob.tenCongTy),
    companyAddress01: firstFilled(data.companyAddress01, oldJob.companyAddress, oldJob.address, oldJob.diaChi),
    employer1Address: firstFilled(data.employer1Address, data.companyAddress01, oldJob.companyAddress, oldJob.address, oldJob.diaChi),
    companyAddress01Street: firstFilled(data.companyAddress01Street, data.companyAddress01Line1, oldJob.companyAddressStreet, oldJob.addressLine1, oldJob.line1, oldJob.street),
    companyAddress01Line2: firstFilled(data.companyAddress01Line2, data.companyAddress01Street2, oldJob.companyAddressLine2, oldJob.addressLine2, oldJob.line2),
    companyAddress01City: firstFilled(data.companyAddress01City, oldJob.companyAddressCity, oldJob.city, oldJob.cityTown, oldJob.town, oldJob.thanhPho, oldJob.huyen),
    companyAddress01Province: firstFilled(data.companyAddress01Province, data.companyAddress01State, oldJob.companyAddressProvince, oldJob.companyAddressState, oldJob.province, oldJob.state, oldJob.stateProvince, oldJob.tinh),
    companyAddress01Country: firstFilled(data.companyAddress01Country, oldJob.companyAddressCountry, oldJob.country, oldJob.quocGia),
    companyAddress01ZipCode: firstFilled(data.companyAddress01ZipCode, data.companyZipCode01, oldJob.companyAddressZipCode, oldJob.companyZipCode, oldJob.zipCode, oldJob.zip, oldJob.postalCode),
    employer1Country: firstFilled(data.employer1Country, data.companyAddress01Country, oldJob.companyAddressCountry, oldJob.country, oldJob.quocGia),
    employer1AddressLine1: firstFilled(data.employer1AddressLine1, data.companyAddress01Street, oldJob.companyAddressStreet, oldJob.addressLine1, oldJob.line1, oldJob.street),
    employer1AddressLine2: firstFilled(data.employer1AddressLine2, data.companyAddress01Line2, oldJob.companyAddressLine2, oldJob.addressLine2, oldJob.line2),
    employer1City: firstFilled(data.employer1City, data.companyAddress01City, oldJob.companyAddressCity, oldJob.city, oldJob.cityTown, oldJob.town, oldJob.thanhPho, oldJob.huyen),
    employer1State: firstFilled(data.employer1State, data.companyAddress01Province, data.companyAddress01State, oldJob.companyAddressProvince, oldJob.companyAddressState, oldJob.province, oldJob.state, oldJob.stateProvince, oldJob.tinh),
    employer1ZipCode: firstFilled(data.employer1ZipCode, data.companyZipCode01, data.companyAddress01ZipCode, oldJob.companyAddressZipCode, oldJob.companyZipCode, oldJob.zipCode, oldJob.zip, oldJob.postalCode),
    occupationTitle01: firstFilled(data.occupationTitle01, oldJob.occupationTitle, oldJob.occupation, oldJob.job, oldJob.profession, oldJob.title, oldJob.ngheNghiep),
    employer1Occupation: firstFilled(data.employer1Occupation, oldJob.occupationTitle, oldJob.occupation, oldJob.job, oldJob.profession, oldJob.title, oldJob.ngheNghiep),
    occupationFrom01: firstFilled(data.occupationFrom01, data.employmentStartDate01, oldJob.employmentStartDate, oldJob.startDate, oldJob.from, oldJob.start, oldJob.ngayNhanViec),
    employer1From: firstFilled(data.employer1From, data.occupationFrom01, data.employmentStartDate01, oldJob.employmentStartDate, oldJob.startDate, oldJob.from, oldJob.start, oldJob.ngayNhanViec),
    occupationTo01: firstFilled(data.occupationTo01, data.employmentEndDate01, oldJob.employmentEndDate, oldJob.endDate, oldJob.to, oldJob.end, oldJob.ngayNghiViec),
    employer1To: firstFilled(data.employer1To, data.occupationTo01, data.employmentEndDate01, oldJob.employmentEndDate, oldJob.endDate, oldJob.to, oldJob.end, oldJob.ngayNghiViec),
    companyName02: firstFilled(data.companyName02, oldJob2.companyName, oldJob2.company, oldJob2.employer, oldJob2.name, oldJob2.tenCongTy),
    employer2Name: firstFilled(data.employer2Name, oldJob2.companyName, oldJob2.company, oldJob2.employer, oldJob2.name, oldJob2.tenCongTy),
    companyAddress02: firstFilled(data.companyAddress02, oldJob2.companyAddress, oldJob2.address, oldJob2.diaChi),
    employer2Address: firstFilled(data.employer2Address, data.companyAddress02, oldJob2.companyAddress, oldJob2.address, oldJob2.diaChi),
    companyAddress02Street: firstFilled(data.companyAddress02Street, data.companyAddress02Line1, oldJob2.companyAddressStreet, oldJob2.addressLine1, oldJob2.line1, oldJob2.street),
    companyAddress02Line2: firstFilled(data.companyAddress02Line2, data.companyAddress02Street2, oldJob2.companyAddressLine2, oldJob2.addressLine2, oldJob2.line2),
    companyAddress02City: firstFilled(data.companyAddress02City, oldJob2.companyAddressCity, oldJob2.city, oldJob2.cityTown, oldJob2.town, oldJob2.thanhPho, oldJob2.huyen),
    companyAddress02Province: firstFilled(data.companyAddress02Province, data.companyAddress02State, oldJob2.companyAddressProvince, oldJob2.companyAddressState, oldJob2.province, oldJob2.state, oldJob2.stateProvince, oldJob2.tinh),
    companyAddress02Country: firstFilled(data.companyAddress02Country, oldJob2.companyAddressCountry, oldJob2.country, oldJob2.quocGia),
    companyAddress02ZipCode: firstFilled(data.companyAddress02ZipCode, data.companyZipCode02, oldJob2.companyAddressZipCode, oldJob2.companyZipCode, oldJob2.zipCode, oldJob2.zip, oldJob2.postalCode),
    employer2Country: firstFilled(data.employer2Country, data.companyAddress02Country, oldJob2.companyAddressCountry, oldJob2.country, oldJob2.quocGia),
    employer2AddressLine1: firstFilled(data.employer2AddressLine1, data.companyAddress02Street, oldJob2.companyAddressStreet, oldJob2.addressLine1, oldJob2.line1, oldJob2.street),
    employer2AddressLine2: firstFilled(data.employer2AddressLine2, data.companyAddress02Line2, oldJob2.companyAddressLine2, oldJob2.addressLine2, oldJob2.line2),
    employer2City: firstFilled(data.employer2City, data.companyAddress02City, oldJob2.companyAddressCity, oldJob2.city, oldJob2.cityTown, oldJob2.town, oldJob2.thanhPho, oldJob2.huyen),
    employer2State: firstFilled(data.employer2State, data.companyAddress02Province, data.companyAddress02State, oldJob2.companyAddressProvince, oldJob2.companyAddressState, oldJob2.province, oldJob2.state, oldJob2.stateProvince, oldJob2.tinh),
    employer2ZipCode: firstFilled(data.employer2ZipCode, data.companyZipCode02, data.companyAddress02ZipCode, oldJob2.companyAddressZipCode, oldJob2.companyZipCode, oldJob2.zipCode, oldJob2.zip, oldJob2.postalCode),
    occupationTitle02: firstFilled(data.occupationTitle02, oldJob2.occupationTitle, oldJob2.occupation, oldJob2.job, oldJob2.profession, oldJob2.title, oldJob2.ngheNghiep),
    employer2Occupation: firstFilled(data.employer2Occupation, oldJob2.occupationTitle, oldJob2.occupation, oldJob2.job, oldJob2.profession, oldJob2.title, oldJob2.ngheNghiep),
    occupationFrom02: firstFilled(data.occupationFrom02, data.employmentStartDate02, oldJob2.employmentStartDate, oldJob2.startDate, oldJob2.from, oldJob2.start, oldJob2.ngayNhanViec),
    employer2From: firstFilled(data.employer2From, data.occupationFrom02, data.employmentStartDate02, oldJob2.employmentStartDate, oldJob2.startDate, oldJob2.from, oldJob2.start, oldJob2.ngayNhanViec),
    occupationTo02: firstFilled(data.occupationTo02, data.employmentEndDate02, oldJob2.employmentEndDate, oldJob2.endDate, oldJob2.to, oldJob2.end, oldJob2.ngayNghiViec),
    employer2To: firstFilled(data.employer2To, data.occupationTo02, data.employmentEndDate02, oldJob2.employmentEndDate, oldJob2.endDate, oldJob2.to, oldJob2.end, oldJob2.ngayNghiViec),
    relationCategory: detectI130ARelationCategory(data),
    relationLabel: getI130ARelationLabel(detectI130ARelationCategory(data)),
    type: firstFilled(data.type, 'bao-lanh')
  };
}

export function normalizeNDBLData(input = {}) {
  const data = { ...input };
  const currentMarriage = firstArrayItem(data.currentMarriage, data.honPhoiHienTai);
  const usEntry = firstArrayItem(data.lanNhapCanhMy, data.usEntryHistory, data.previousUSEntries);
  const currentJob = firstArrayItem(data.congViec5Nam, data.employmentHistory, data.jobs5Years);
  const father = firstArrayItem(data.parents?.father, data.thongTinCha);
  const mother = firstArrayItem(data.parents?.mother, data.thongTinMe);

  const fullName = firstFilled(data.fullName, data.beneficiaryFullName, data.tenTrenGiayTo, data.customerName);
  const otherName = firstFilled(data.otherName, data.beneficiaryOtherName, data.tenGoiKhac);
  const birthDate = firstFilled(data.birthDate, data.beneficiaryBirthDate, data.ngaySinh);
  const gender = firstFilled(data.gender, data.beneficiaryGender, data.gioiTinh);
  const placeBirth = firstFilled(data.placeBirth, data.beneficiaryBirthPlace, data.noiSinh);
  const phone = firstFilled(data.contactPrimary, data.beneficiaryDaytimePhone, data.mobilePhone, data.soDienThoai);
  const email = firstFilled(data.email, data.emailAddress, data.beneficiaryEmail);
  const currentAddress = firstFilled(data.beneficiaryCurrentAddress, data.diaChiNhanThuVN, data.currentAddress, data.address);
  const intendedAddress = firstFilled(data.beneficiaryIntendedUSAddress, data.diaChiDuDinhSongMy, data.addressInUS);
  const spouseName = firstFilled(data.beneficiaryCurrentSpouseName, currentMarriage.fullName, currentMarriage.name, currentMarriage.ten);

  return {
    ...data,
    fullName,
    customerName: firstFilled(data.customerName, fullName),
    beneficiaryFullName: fullName,
    beneficiaryName: firstFilled(data.beneficiaryName, fullName),
    beneficiaryOtherName: otherName,
    beneficiaryBirthDate: birthDate,
    beneficiaryGender: gender,
    beneficiaryBirthPlace: placeBirth,
    beneficiaryDaytimePhone: phone,
    beneficiaryMobilePhone: firstFilled(data.beneficiaryMobilePhone, data.mobilePhone, phone),
    beneficiaryEmail: email,
    beneficiaryCurrentAddress: currentAddress,
    beneficiaryIntendedUSAddress: intendedAddress,
    beneficiaryEverInUS: firstFilled(data.beneficiaryEverInUS, data.tungNhapCanhMy),
    classOfAdmission: firstFilled(data.classOfAdmission, usEntry.dien, usEntry.classOfAdmission, usEntry.visaType),
    dateOfArrival: firstFilled(data.dateOfArrival, usEntry.ngayNhapCanh, usEntry.dateOfArrival, usEntry.arrivalDate),
    passportNumber: firstFilled(data.passportNumber, data.passport),
    passportIssuePlace: firstFilled(data.passportIssuePlace, data.noiCapPassport),
    passportExpirationDate: firstFilled(data.passportExpirationDate, data.ngayHetHanPassport),
    beneficiaryMaritalStatus: firstFilled(data.beneficiaryMaritalStatus, data.tinhTrangHonNhan, data.maritalStatus),
    beneficiaryCurrentSpouseName: spouseName,
    beneficiaryCurrentMarriageDate: firstFilled(data.beneficiaryCurrentMarriageDate, currentMarriage.ngayKetHon, currentMarriage.marriageDate),
    beneficiaryMarriagePlace: firstFilled(data.beneficiaryMarriagePlace, currentMarriage.noiKetHon, currentMarriage.marriagePlace),
    lastSharedSpouseAddress: firstFilled(data.lastSharedSpouseAddress, currentMarriage.diaChiSongChung, currentMarriage.sharedAddress),
    lastSharedSpouseFrom: firstFilled(data.lastSharedSpouseFrom, currentMarriage.ngayBatDauSongChung, currentMarriage.from),
    lastSharedSpouseTo: firstFilled(data.lastSharedSpouseTo, currentMarriage.ngayKetThucSongChung, currentMarriage.to),
    currentEmployerName: firstFilled(data.currentEmployerName, currentJob.tenCongTy, currentJob.companyName, currentJob.employerName),
    currentEmployerAddress: firstFilled(data.currentEmployerAddress, currentJob.diaChi, currentJob.address, currentJob.employerAddress),
    currentEmploymentBeginDate: firstFilled(data.currentEmploymentBeginDate, currentJob.ngayNhanViec, currentJob.startDate, currentJob.from),
    relationCategory: detectI130ARelationCategory(data),
    relationLabel: getI130ARelationLabel(detectI130ARelationCategory(data)),
    fatherFullName: firstFilled(data.fatherFullName, father.name, father.ten),
    fatherBirthDate: firstFilled(data.fatherBirthDate, father.dob, father.ngaySinh),
    fatherBirthPlace: firstFilled(data.fatherBirthPlace, father.pob, father.noiSinh),
    fatherResidenceAddress: firstFilled(data.fatherResidenceAddress, father.address, father.diaChi),
    motherFullName: firstFilled(data.motherFullName, mother.name, mother.ten),
    motherBirthDate: firstFilled(data.motherBirthDate, mother.dob, mother.ngaySinh),
    motherBirthPlace: firstFilled(data.motherBirthPlace, mother.pob, mother.noiSinh),
    motherResidenceAddress: firstFilled(data.motherResidenceAddress, mother.address, mother.diaChi),
    type: firstFilled(data.type, 'ndbl')
  };
}

export function buildI130ACaseData(petitionerInput = {}, beneficiaryInput = null, meta = {}) {
  const petitioner = normalizeBaoLanhData(petitionerInput);
  const beneficiary = beneficiaryInput ? normalizeNDBLData(beneficiaryInput) : {};
  const beneficiaryFallbackName = firstFilled(
    petitioner.beneficiaryFullName,
    petitioner.spouseFullName,
    getObjectValue(firstArrayItem(petitioner.honPhoiHienTai, petitioner.currentMarriage), 'ten', 'name', 'fullName')
  );
  const beneficiaryHasData = hasMeaningfulValue(beneficiary);
  const beneficiaryName = firstFilled(beneficiary.beneficiaryFullName, beneficiary.fullName, beneficiary.tenTrenGiayTo, beneficiaryFallbackName);
  const displayName = [petitioner.petitionerFullName || petitioner.fullName, beneficiaryName].filter(Boolean).join(' / ');

  const beneficiaryScopedData = beneficiaryHasData ? beneficiary : {};

  return {
    // Giữ các field người bảo lãnh ở cấp ngoài để không phá các màn hình cũ,
    // nhưng I-129F phải luôn đọc từ petitionerData/beneficiaryData để tránh key trùng bị đè.
    ...petitioner,
    _hasSeparatedSources: true,
    _caseDataShape: 'petitioner-beneficiary-scoped',
    petitionerData: petitioner,
    nguoiBaoLanh: petitioner,
    beneficiaryData: beneficiaryScopedData,
    nguoiDuocBaoLanh: beneficiaryScopedData,
    petitionerSubmissionId: meta.petitionerSubmissionId || petitioner.id || '',
    beneficiarySubmissionId: meta.beneficiarySubmissionId || '',
    beneficiarySourceStatus: beneficiaryHasData ? 'matched' : 'missing',
    i130aDisplayName: displayName,
    customerName: displayName || petitioner.customerName || petitioner.fullName,
    beneficiaryFullName: beneficiaryName,
    beneficiaryName,
    beneficiaryOtherName: firstFilled(beneficiary.beneficiaryOtherName, beneficiary.otherName, beneficiary.tenGoiKhac),
    beneficiaryBirthDate: firstFilled(beneficiary.beneficiaryBirthDate, beneficiary.birthDate, beneficiary.ngaySinh),
    beneficiaryGender: firstFilled(beneficiary.beneficiaryGender, beneficiary.gender, beneficiary.gioiTinh),
    beneficiaryBirthPlace: firstFilled(beneficiary.beneficiaryBirthPlace, beneficiary.placeBirth, beneficiary.noiSinh),
    beneficiaryDaytimePhone: firstFilled(beneficiary.beneficiaryDaytimePhone, beneficiary.contactPrimary, beneficiary.soDienThoai),
    beneficiaryMobilePhone: firstFilled(beneficiary.beneficiaryMobilePhone, beneficiary.mobilePhone, beneficiary.soDienThoai),
    beneficiaryEmail: firstFilled(beneficiary.beneficiaryEmail, beneficiary.email, beneficiary.emailAddress),
    beneficiaryCurrentAddress: firstFilled(beneficiary.beneficiaryCurrentAddress, beneficiary.diaChiNhanThuVN, beneficiary.currentAddress),
    beneficiaryIntendedUSAddress: firstFilled(beneficiary.beneficiaryIntendedUSAddress, beneficiary.diaChiDuDinhSongMy, beneficiary.addressInUS),
    beneficiaryEverInUS: firstFilled(beneficiary.beneficiaryEverInUS, beneficiary.tungNhapCanhMy),
    classOfAdmission: firstFilled(beneficiary.classOfAdmission),
    dateOfArrival: firstFilled(beneficiary.dateOfArrival),
    passportNumber: firstFilled(beneficiary.passportNumber, beneficiary.passport),
    passportIssuePlace: firstFilled(beneficiary.passportIssuePlace, beneficiary.noiCapPassport),
    passportExpirationDate: firstFilled(beneficiary.passportExpirationDate, beneficiary.ngayHetHanPassport),
    beneficiaryMaritalStatus: firstFilled(beneficiary.beneficiaryMaritalStatus, beneficiary.tinhTrangHonNhan),
    beneficiaryCurrentSpouseName: firstFilled(beneficiary.beneficiaryCurrentSpouseName, petitioner.petitionerFullName, petitioner.fullName),
    beneficiaryCurrentMarriageDate: firstFilled(beneficiary.beneficiaryCurrentMarriageDate),
    beneficiaryMarriagePlace: firstFilled(beneficiary.beneficiaryMarriagePlace),
    lastSharedSpouseAddress: firstFilled(beneficiary.lastSharedSpouseAddress),
    lastSharedSpouseFrom: firstFilled(beneficiary.lastSharedSpouseFrom),
    lastSharedSpouseTo: firstFilled(beneficiary.lastSharedSpouseTo),
    currentEmployerName: firstFilled(beneficiary.currentEmployerName),
    currentEmployerAddress: firstFilled(beneficiary.currentEmployerAddress),
    currentEmploymentBeginDate: firstFilled(beneficiary.currentEmploymentBeginDate)
  };
}

export function getExplicitNDBLId(data = {}) {
  return firstFilled(
    data.ndblSubmissionId,
    data.ndbl_submission_id,
    data.beneficiarySubmissionId,
    data.beneficiary_submission_id,
    data.nguoiDuocBaoLanhId,
    data.nguoi_duoc_bao_lanh_id
  );
}

export async function findMatchingNDBLSubmission(petitionerData = {}) {
  const explicitId = parseInt(getExplicitNDBLId(petitionerData), 10);
  if (explicitId) {
    const [rows] = await queryWithRetry(poolForm,
      `SELECT * FROM Y52CNGD_ICAVIET_submissions WHERE id = ? AND form_slug = 'ndbl' LIMIT 1`,
      [explicitId]
    );
    if (rows.length) return rows[0];
  }

  const currentMarriage = firstArrayItem(petitionerData.currentMarriage, petitionerData.honPhoiHienTai);
  const spouseNames = collectNameCandidates(
    petitionerData.beneficiaryFullName,
    petitionerData.spouseFullName,
    petitionerData.currentSpouseFullName,
    currentMarriage
  );
  const spouseKeys = spouseNames.map(normalizeNameKey).filter(Boolean);
  if (!spouseKeys.length) return null;

  const [rows] = await queryWithRetry(poolForm,
    `SELECT * FROM Y52CNGD_ICAVIET_submissions
     WHERE form_slug = 'ndbl'
     ORDER BY submitted_at DESC
     LIMIT 300`
  );

  for (const row of rows) {
    const data = normalizeNDBLData(parseSubmissionData(row.data));
    const relationKey = normalizeMatchText(firstFilled(data.loaiHoSoBaoLanh, data.relationship, data.relationshipToPetitioner));
    if (relationKey && !relationKey.includes('vo chong') && !relationKey.includes('spouse')) continue;

    const ndblNames = collectNameCandidates(data.beneficiaryFullName, data.fullName, data.tenTrenGiayTo, data.customerName);
    const ndblKeys = ndblNames.map(normalizeNameKey).filter(Boolean);
    if (ndblKeys.some(key => spouseKeys.includes(key))) return row;
  }

  return null;
}


export function normalizeI90Data(input = {}) {
  const data = { ...(input || {}) };
  const fullName = [
    firstFilled(data.legal_last_name, data.lastName, data.last_name),
    firstFilled(data.legal_middle_name, data.middleName, data.middle_name),
    firstFilled(data.legal_first_name, data.firstName, data.first_name)
  ].filter(Boolean).join(' ').trim();

  return {
    ...data,
    fullName: firstFilled(data.fullName, data.customerName, data.applicant_full_name, fullName),
    customerName: firstFilled(data.customerName, data.fullName, data.applicant_full_name, fullName),
    contactPrimary: firstFilled(data.contactPrimary, data.phone_primary, data.phone),
    email: firstFilled(data.email, data.emailAddress),
    birthDate: firstFilled(
      data.birthDate,
      data.dateOfBirth,
      [data.date_of_birth_month, data.date_of_birth_day, data.date_of_birth_year].filter(Boolean).join('/')
    ),
    placeBirth: firstFilled(
      data.placeBirth,
      [data.place_of_birth_city, data.place_of_birth_province, data.place_of_birth_country].filter(Boolean).join(', ')
    ),
    idNumber: firstFilled(data.idNumber, data.alien_number, data.a_number, data.aNumber)
  };
}


export function normalizeN600Data(input = {}) {
  const data = { ...(input || {}) };
  const fullName = [
    firstFilled(data.legal_family_name, data.legal_last_name, data.lastName, data.last_name),
    firstFilled(data.legal_last_name, data.legal_middle_name, data.middleName, data.middle_name),
    firstFilled(data.legal_first_name, data.firstName, data.first_name)
  ].filter(Boolean).join(' ').trim();

  return {
    ...data,
    fullName: firstFilled(data.fullName, data.customerName, data.applicant_full_name, fullName),
    customerName: firstFilled(data.customerName, data.fullName, data.applicant_full_name, fullName),
    contactPrimary: firstFilled(data.contactPrimary, data.phone_number, data.phone_primary, data.phone),
    email: firstFilled(data.email, data.emailAddress),
    birthDate: firstFilled(data.birthDate, data.date_of_birth, data.dateOfBirth),
    placeBirth: firstFilled(data.placeBirth, data.birth_country, data.place_of_birth_country),
    idNumber: firstFilled(data.idNumber, data.a_number, data.aNumber, data.uscis_number)
  };
}

export function normalizeN400Data(input = {}) {
  const data = { ...(input || {}) };
  const fullName = [
    firstFilled(data.last_name, data.ho_hop_phap),
    firstFilled(data.middle_name, data.ten_lot_hop_phap),
    firstFilled(data.first_name, data.ten_hop_phap)
  ].filter(Boolean).join(' ').trim();

  return {
    ...data,
    fullName: firstFilled(data.fullName, data.applicant_full_name, data.customerName, fullName),
    customerName: firstFilled(data.customerName, data.fullName, data.applicant_full_name, fullName),
    email: firstFilled(data.email, data.customer_email),
    birthDate: firstFilled(data.birthDate, data.date_of_birth, data.ngay_sinh)
  };
}

export function normalizeSubmissionData(raw, formInfo) {
  const data = parseSubmissionData(raw);
  if (formInfo?.slug === 'bao-lanh') return normalizeBaoLanhData(data);
  if (formInfo?.slug === 'i-90') return normalizeI90Data(data);
  if (formInfo?.slug === 'n-600') return normalizeN600Data(data);
  if (formInfo?.slug === 'n-400') return normalizeN400Data(data);
  return data;
}
