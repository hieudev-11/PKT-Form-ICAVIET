export function buildI129FMappings(data = {}, helpers = {}) {
  const {
    firstValue,
    splitAddr,
    toUpperNoAccent,
    isAffirmativeValue,
    formType
  } = helpers

  const safeFirstValue = typeof firstValue === 'function' ? firstValue : (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''
  const safeToUpperNoAccent = typeof toUpperNoAccent === 'function' ? toUpperNoAccent : (value) => String(value || '').trim().toUpperCase()
  const safeIsAffirmativeValue = typeof isAffirmativeValue === 'function' ? isAffirmativeValue : (value) => ['YES', 'Y', 'TRUE', '1', 'CO', 'CÓ'].includes(safeToUpperNoAccent(value))
  let safeSplitAddr = typeof splitAddr === 'function'
    ? splitAddr
    : () => ({ street: '', line2: '', city: '', province: '', state: '', zip: '', country: '' })

  const firstItem = (...values) => {
    for (const value of values) {
      if (Array.isArray(value) && value.length > 0) return value[0] || {}
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
    }
    return {}
  }

  const firstRecordObject = (...values) => {
    for (const value of values) {
      if (Array.isArray(value)) {
        const record = value.find(item => hasRecordValue(item))
        if (record) return record
        continue
      }
      if (hasRecordValue(value)) return value
    }
    return {}
  }

  const itemAt = (value, index = 0) => {
    if (Array.isArray(value)) return value[index] || {}
    if (index === 0 && value && typeof value === 'object') return value
    return {}
  }

  const pickObjectValue = (source, ...keys) => {
    if (!source || typeof source !== 'object') return ''
    return safeFirstValue(...keys.map(key => source[key]))
  }

  const hasRecordValue = (source) => {
    if (!source || typeof source !== 'object') return false
    return Object.values(source).some(value => {
      if (Array.isArray(value)) return value.some(item => hasRecordValue(item))
      if (value && typeof value === 'object') return hasRecordValue(value)
      return value !== undefined && value !== null && String(value).trim() !== ''
    })
  }

  const countRecords = (value) => {
    if (!Array.isArray(value)) return hasRecordValue(value) ? 1 : 0
    return value.filter(item => hasRecordValue(item)).length
  }

  const itemFromLists = (index, ...values) => {
    for (const value of values) {
      const item = itemAt(value, index)
      if (hasRecordValue(item)) return item
    }
    return {}
  }

  const nameText = (value) => {
    if (Array.isArray(value)) return nameText(firstItem(value))
    if (value && typeof value === 'object') {
      return safeFirstValue(
        value.fullName,
        value.name,
        value.ten,
        value.hoTen,
        value.tenTrenGiayTo,
        value.givenName || value.middleName || value.familyName
          ? [value.familyName, value.middleName, value.givenName].filter(Boolean).join(' ')
          : ''
      )
    }
    return value
  }

  const addressText = (value) => {
    if (Array.isArray(value)) return addressText(firstItem(value))
    if (value && typeof value === 'object') {
      return safeFirstValue(
        value.fullAddress,
        value.address,
        value.diaChi,
        value.line1,
        value.addressLine1,
        value.street
      )
    }
    return value
  }

  const firstAddressText = (...values) => safeFirstValue(...values.map(addressText))

  const asYesNo = (value, fallback = '') => {
    if (value === undefined || value === null || String(value).trim() === '') return fallback
    return safeIsAffirmativeValue(value) ? 'YES' : 'NO'
  }

  const optionKey = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9.,]+/g, ' ')
    .trim()

  const isVNDistrictOrCity = (value) => {
    const key = optionKey(value)
    return /\b(DISTRICT|QUAN|HUYEN|TOWN|THI XA|THANH PHO|TP)\b/.test(key) || /^(Q)\s*\d+$/.test(key)
  }

  const isVNCommuneOrWard = (value) => {
    const key = optionKey(value)
    return /\b(XA|PHUONG|COMMUNE|WARD)\b/.test(key) || /^(P)\s*\d+$/.test(key)
  }

  // Vietnamese address parsing logic
  const baseSplitAddr = safeSplitAddr
  safeSplitAddr = (addr, dataObj = null, prefix = '', isUS = false) => {
    // 1. Nếu có dataObj và prefix, trước tiên hãy thử lấy trực tiếp phần địa chỉ có cấu trúc
    if (dataObj && prefix) {
      // Thử lấy trực tiếp từ prefix hiện tại
      const explicit = baseSplitAddr('', dataObj, prefix, isUS)
      if (explicit && (explicit.street || explicit.city || explicit.province)) {
        return explicit
      }

      // Thử lấy từ các alias tương ứng với các form của ICAVIET
      let altPrefix = '';
      let recordSource = null;

      if (prefix === 'petitionerMailingAddress') {
        altPrefix = 'diaChiNhanThuMy';
      } else if (prefix === 'beneficiaryMailingAddress') {
        altPrefix = 'diaChiNhanThuVN';
      } else if (prefix === 'beneficiaryCurrentAddress') {
        altPrefix = 'diaChi5Nam'; // Sẽ xử lý ở dưới
      } else if (prefix === 'intendedUSAddress') {
        altPrefix = 'diaChiDuDinhSongMy';
      } else if (prefix.startsWith('petAddress')) {
        const idx = parseInt(prefix.replace('petAddress', ''), 10);
        if (!isNaN(idx) && petitionerAddressRecords && petitionerAddressRecords[idx]) {
          recordSource = petitionerAddressRecords[idx];
          altPrefix = 'diaChi';
        }
      } else if (prefix.startsWith('benAddress')) {
        const idx = parseInt(prefix.replace('benAddress', ''), 10);
        if (!isNaN(idx) && beneficiaryAddressRecords && beneficiaryAddressRecords[idx]) {
          recordSource = beneficiaryAddressRecords[idx];
          altPrefix = 'diaChi';
        }
      } else if (prefix.startsWith('petEmpAddr')) {
        const idx = parseInt(prefix.replace('petEmpAddr', ''), 10);
        if (!isNaN(idx) && petitionerEmploymentRecords && petitionerEmploymentRecords[idx]) {
          recordSource = petitionerEmploymentRecords[idx];
          altPrefix = 'diaChi';
        }
      } else if (prefix.startsWith('benEmpAddr')) {
        const idx = parseInt(prefix.replace('benEmpAddr', ''), 10);
        if (!isNaN(idx) && beneficiaryEmploymentRecords && beneficiaryEmploymentRecords[idx]) {
          recordSource = beneficiaryEmploymentRecords[idx];
          altPrefix = 'diaChi';
        }
      }

      if (altPrefix) {
        if (altPrefix === 'diaChi5Nam') {
          const firstRecord = firstItem(dataObj.diaChi5Nam, dataObj.addresses5Years);
          if (hasRecordValue(firstRecord)) {
            const explicit5 = baseSplitAddr('', firstRecord, 'diaChi', isUS);
            if (explicit5 && (explicit5.street || explicit5.city || explicit5.province)) {
              return explicit5;
            }
          }
        } else {
          const sourceObj = recordSource || dataObj;
          const explicitAlt = baseSplitAddr('', sourceObj, altPrefix, isUS);
          if (explicitAlt && (explicitAlt.street || explicitAlt.city || explicitAlt.province)) {
            return explicitAlt;
          }
        }
      }
    }

    // 2. Dự phòng: Nếu không có cấu trúc hoặc không khớp prefix, sử dụng phân tích tự động từ chuỗi đầy đủ (freeform text)
    if (isUS) {
      return baseSplitAddr(addr, dataObj, prefix, isUS)
    }

    const parts = String(addr || '').split(',').map(part => part.trim()).filter(Boolean)
    if (parts.length === 0) {
      return { street: '', line2: '', city: '', province: '', zip: '', country: '' }
    }
    let country = ''
    let zip = ''
    let province = ''
    let city = ''

    const lastPart = parts[parts.length - 1]
    const lastKey = optionKey(lastPart)
    if (lastKey.includes('VIET') || lastKey.includes('VN') || lastKey.includes('STATES') || lastKey === 'USA' || lastKey === 'US') {
      country = parts.pop()
    } else {
      country = 'VIETNAM'
    }

    if (parts.length > 0) {
      const zipPart = parts[parts.length - 1]
      if (/^\d{4,10}(?:-\d{4})?$/.test(zipPart) || optionKey(zipPart) === 'DOES NOT APPLY') {
        zip = parts.pop()
      }
    }

    if (parts.length > 0) {
      province = parts.pop()
    }

    if (parts.length > 0) {
      const cityPart = parts[parts.length - 1]
      if (parts.length >= 2) {
        if (!isVNCommuneOrWard(cityPart)) {
          city = parts.pop()
        } else if (isVNDistrictOrCity(cityPart)) {
          city = parts.pop()
        }
      } else { // parts.length === 1
        if (isVNDistrictOrCity(cityPart)) {
          city = parts.pop()
        }
      }
    }

    const street = parts.join(', ')

    return { street, line2: '', city, province, zip, country }
  }

  const normalizeI130AAddressLines = (parts = {}) => {
    const line1 = safeFirstValue(parts.line1, parts.street)
    const line2 = safeFirstValue(parts.line2)
    if (line2 && isLocalAddressPart(line2)) {
      return {
        ...parts,
        line1: [line1, line2].filter(Boolean).join(', '),
        street: [line1, line2].filter(Boolean).join(', '),
        line2: ''
      }
    }
    return { ...parts, line1, street: line1, line2 }
  }

  const isLocalAddressPart = (value) => {
    const key = optionKey(value)
    return /\b(WARD|PHUONG|COMMUNE|XA|DISTRICT|QUAN|HUYEN|TOWN|THI XA)\b/.test(key) || /^(P|Q)\s*\d+[A-Z]?$/.test(key)
  }

  // --- Parse Names ---
  const splitVNName = (...values) => {
    const raw = safeFirstValue(...values)
    const parts = safeToUpperNoAccent(raw).split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { family: '', middle: '', given: '' }
    if (parts.length === 1) return { family: '', middle: '', given: parts[0] }
    if (parts.length === 2) return { family: parts[0], middle: '', given: parts[1] }
    return {
      family: parts[0],
      middle: parts.slice(1, -1).join(' '),
      given: parts[parts.length - 1]
    }
  }

  const splitNameValue = (...values) => splitVNName(...values.map(nameText))

  const splitName = (fullName) => {
    return splitVNName(fullName)
  }

  const getPersonNameParts = (prefix, directObj = {}) => {
    const fullName = safeFirstValue(
      data[`${prefix}FullName`],
      data[`${prefix}Name`],
      nameText(directObj)
    )
    if (fullName) return splitName(fullName)
    
    return {
      family: safeFirstValue(
        data[`${prefix}FamilyName`],
        data[`${prefix}LastName`],
        pickObjectValue(directObj, 'tenTrenGiayTo_ho', 'familyName', 'lastName', 'family', 'last', 'ho'),
        data.tenTrenGiayTo_ho
      ),
      given: safeFirstValue(
        data[`${prefix}GivenName`],
        data[`${prefix}FirstName`],
        pickObjectValue(directObj, 'tenTrenGiayTo_ten', 'givenName', 'firstName', 'given', 'first', 'ten'),
        data.tenTrenGiayTo_ten
      ),
      middle: safeFirstValue(
        data[`${prefix}MiddleName`],
        pickObjectValue(directObj, 'tenTrenGiayTo_tenLot', 'middleName', 'middle', 'tenLot'),
        data.tenTrenGiayTo_tenLot
      )
    }
  }

  const splitPlace = (value, dataObj = null, prefix = '') => {
    const raw = safeFirstValue(
      nameText(value),
      dataObj && prefix ? dataObj[prefix] : ''
    )
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const explicitCity = safeFirstValue(
      dataObj && prefix ? dataObj[`${prefix}City`] : '',
      dataObj && prefix ? dataObj[`${prefix}Town`] : '',
      dataObj && prefix ? dataObj[`${prefix}Village`] : '',
      pickObjectValue(source, 'city', 'town', 'village', 'huyen', 'thanhPho')
    )
    const explicitProvince = safeFirstValue(
      dataObj && prefix ? dataObj[`${prefix}Province`] : '',
      dataObj && prefix ? dataObj[`${prefix}State`] : '',
      pickObjectValue(source, 'province', 'state', 'tinh')
    )
    const explicitCountry = safeFirstValue(
      dataObj && prefix ? dataObj[`${prefix}Country`] : '',
      pickObjectValue(source, 'country', 'quocGia')
    )
    const parts = String(raw || '').split(',').map(part => part.trim()).filter(Boolean)

    let city = ''
    let province = ''
    let country = ''
    if (parts.length >= 3) {
      country = parts[parts.length - 1]
      province = parts[parts.length - 2]
      city = parts.slice(0, -2).join(', ')
    } else if (parts.length === 2) {
      const lastKey = optionKey(parts[1])
      if (lastKey.includes('VIET') || lastKey.includes('UNITED STATES') || lastKey === 'USA' || lastKey === 'US') {
        city = parts[0]
        country = parts[1]
      } else {
        city = parts[0]
        province = parts[1]
      }
    } else if (parts.length === 1) {
      city = parts[0]
    }

    const parsed = safeSplitAddr(raw, dataObj, prefix, false)
    let finalCity = safeFirstValue(explicitCity, city, parsed.street, parsed.city)
    let finalProvince = safeFirstValue(explicitProvince, province, parsed.province)
    let finalCountry = safeFirstValue(explicitCountry, country, parsed.country)

    return {
      city: finalCity,
      province: finalProvince,
      country: finalCountry
    }
  }

  const knownCountryName = (value) => {
    const key = optionKey(value).replace(/[^A-Z0-9]+/g, '')
    if (!key) return ''
    if (key === 'VN' || key.includes('VIETNAM')) return 'VIETNAM'
    if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA', 'HOAKY', 'MY'].includes(key)) return 'USA'
    return ''
  }

  const countryOnlyValue = (...values) => {
    for (const value of values) {
      const raw = safeFirstValue(nameText(value), addressText(value))
      if (!raw) continue
      const parts = String(raw).split(/,|;/).map(part => part.trim()).filter(Boolean)
      const candidates = parts.length ? [...parts].reverse() : [raw]
      for (const candidate of candidates) {
        const known = knownCountryName(candidate)
        if (known) return known
      }
    }
    return ''
  }

  const countryFromAddressText = (...values) => {
    for (const value of values) {
      const raw = safeFirstValue(addressText(value), nameText(value))
      if (!raw) continue
      const parts = String(raw).split(/,|;/).map(part => part.trim()).filter(Boolean)
      const candidates = parts.length ? [...parts].reverse() : [raw]
      for (const candidate of candidates) {
        const known = knownCountryName(candidate)
        if (known) return known
      }
    }
    return ''
  }

  const addressLooksUS = (...values) => {
    return values.some(value => {
      const key = optionKey(value)
      return key.includes('UNITED STATES') || /\bU\.?S\.?A?\b/.test(key) || key === 'USA' || key === 'US'
    })
  }

  const isUSStateCode = (value) => {
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

  const isUSZipCode = (value) => /^\d{5}(?:-\d{4})?$/.test(String(value || '').trim())
  const zipOnlyValue = (...values) => {
    for (const value of values) {
      const raw = safeFirstValue(value)
      if (!raw) continue
      const text = String(raw).trim()
      if (/^\d{4,10}(?:-\d{4})?$/.test(text)) return text
      if (optionKey(text) === 'DOES NOT APPLY') return text
    }
    return ''
  }

  const inferUSCountryFromAddressParts = (parts = {}) => {
    const state = safeFirstValue(parts.state, parts.province)
    const zip = safeFirstValue(parts.zip, parts.postalCode, parts.postal)
    const hasAddressText = [parts.line1, parts.street, parts.city, parts.fullAddress]
      .some(value => String(value || '').trim() !== '')
    return isUSStateCode(state) && (isUSZipCode(zip) || hasAddressText) ? 'USA' : ''
  }

  const translateGender = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    if (['NU', 'FEMALE', 'WOMAN', 'GIRL'].includes(key)) return 'FEMALE'
    if (['NAM', 'MALE', 'MAN', 'BOY'].includes(key)) return 'MALE'
    return key
  }

  const translateEthnicity = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    if (key.includes('HISPANIC') || key.includes('LATINO')) {
      return key.includes('NOT') || key.includes('NO') ? 'NOT HISPANIC OR LATINO' : 'HISPANIC OR LATINO'
    }
    if (key.includes('KHONG') || key === 'NO') return 'NOT HISPANIC OR LATINO'
    if (key === 'YES' || key === 'CO') return 'HISPANIC OR LATINO'
    return key
  }

  const translateRace = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    if (key.includes('CHAU A') || key.includes('ASIAN')) return 'ASIAN'
    if (key.includes('DA TRANG') || key === 'WHITE') return 'WHITE'
    if (key.includes('DA DEN') || key.includes('BLACK') || key.includes('AFRICAN')) return 'BLACK OR AFRICAN AMERICAN'
    if (key.includes('AMERICAN INDIAN') || key.includes('ALASKA')) return 'AMERICAN INDIAN OR ALASKA NATIVE'
    if (key.includes('HAWAII') || key.includes('PACIFIC')) return 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER'
    return key
  }

  const translateColor = (value, type = 'eye') => {
    const key = optionKey(value)
    if (!key) return ''
    if (key.includes('DEN') || key === 'BLACK') return 'BLACK'
    if (key.includes('NAU') || key === 'BROWN') return 'BROWN'
    if (key.includes('XANH LA') || key === 'GREEN') return 'GREEN'
    if (key.includes('XANH DUONG') || key === 'BLUE') return 'BLUE'
    if (key.includes('XAM') || key === 'GRAY' || key === 'GREY') return 'GRAY'
    if (key.includes('TRANG') || key === 'WHITE') return 'WHITE'
    if (key.includes('VANG') || key === 'BLOND' || key === 'BLONDE') return type === 'hair' ? 'BLOND' : 'AMBER'
    return key
  }

  const translateMaritalStatus = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    if (key.includes('DOC THAN') || key.includes('CHUA BAO GIO') || key.includes('SINGLE') || key.includes('NEVER MARRIED')) return 'SINGLE'
    if (key.includes('LY HON') || key.includes('DIVORC')) return 'DIVORCED'
    if (key.includes('GOA') || key.includes('WIDOW')) return 'WIDOWED'
    if (key.includes('TAI HON') || key.includes('KET HON') || key.includes('MARRIED')) return 'MARRIED'
    return key
  }

  const translateCitizenshipType = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    if (key.includes('NHAP TICH') || key.includes('NATURALIZATION') || key.includes('NATURALIZED')) return 'NATURALIZATION'
    if (key.includes('SINH O MY') || key.includes('BIRTH') || key.includes('USA') || key.includes('HOA KY')) return 'Birth in the United States'
    if (key.includes('THEO CHA ME') || key.includes('PARENTS') || key.includes('PARENT')) return 'Parents'
    return value
  }


  const formatHeight = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''

    // Support common feet/inches inputs from the petitioner form, for example:
    // 5’4, 5'4, 5 ft 4 in, 5 feet 4 inches.
    const feetInchesRaw = raw
      .replace(/[’‘`]/g, "'")
      .replace(/[”“]/g, '"')
      .trim()
    const feetInchesMatch = feetInchesRaw.match(/^(\d+)\s*(?:'|FT|FEET|FOOT)?\s*(\d{1,2})?\s*(?:\"|IN|INCH(?:ES)?)?$/i)
    if (feetInchesMatch && (feetInchesRaw.includes("'") || /\b(FT|FEET|FOOT|IN|INCH)/i.test(feetInchesRaw))) {
      const feet = parseInt(feetInchesMatch[1], 10)
      const inches = parseInt(feetInchesMatch[2] || '0', 10)
      if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
        return `${feet} Feet ${inches} Inches`
      }
    }

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

  const formatWeight = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const key = optionKey(raw)
    const weightMatch = key.match(/^(\d+(?:[.,]\d+)?)\s*(KG|KGS|KILOGRAMS?|LB|LBS|POUNDS?)?$/)
    let num
    if (weightMatch) {
      num = parseFloat(weightMatch[1].replace(',', '.'))
    } else if (/^\d+(?:[.,]\d+)?$/.test(key)) {
      num = parseFloat(key.replace(',', '.'))
    } else {
      return key
    }
    if (Number.isNaN(num)) return ''
    return `${Math.round(num)} Pounds`
  }



  // Petitioner and Beneficiary Records
  const explicitPetitionerSource = firstRecordObject(
    data.petitionerData,
    data.nguoiBaoLanh,
    data.nblData,
    data.nbl,
    data.petitioner,
    data.sponsor
  )
  const explicitBeneficiarySource = firstRecordObject(
    data.beneficiaryData,
    data.nguoiDuocBaoLanh,
    data.ndblData,
    data.ndbl,
    data.beneficiary
  )
  const hasSeparatedSources = hasRecordValue(explicitPetitionerSource) || hasRecordValue(explicitBeneficiarySource)
  const formScope = optionKey(safeFirstValue(formType, data.formType, data.form_type, data.formSlug, data.form_slug, data.type))
  const isBeneficiaryOnlyForm = !hasSeparatedSources && (
    formScope.includes('NDBL') ||
    formScope.includes('NGUOI DUOC BAO LANH') ||
    formScope.includes('BENEFICIARY') ||
    !!(data.passport || data.diaChiNhanThuVN || data.noiCapPassport)
  )
  const isPetitionerOnlyForm = !hasSeparatedSources && !isBeneficiaryOnlyForm && (
    formScope.includes('NBL') ||
    formScope.includes('BAO LANH') ||
    formScope.includes('PETITIONER') ||
    formScope.includes('I129F')
  )
  const petitionerSource = hasSeparatedSources
    ? explicitPetitionerSource
    : (isPetitionerOnlyForm ? data : {})
  const beneficiarySource = hasSeparatedSources
    ? explicitBeneficiarySource
    : (isBeneficiaryOnlyForm ? data : {})

  // Khi backend đã truyền tách petitionerData/beneficiaryData, tuyệt đối không lấy fallback
  // từ data.* cho các field trùng tên như diaChi5Nam, congViec5Nam, thongTinCha...
  // Vì cấp ngoài của data có thể đang là người bảo lãnh và sẽ làm I-129F bị nhảy/đè địa chỉ.
  const petitionerFlatFallback = hasSeparatedSources ? {} : (isPetitionerOnlyForm ? data : {})
  const beneficiaryFlatFallback = hasSeparatedSources ? {} : (isBeneficiaryOnlyForm ? data : {})

  const petitionerRecord = firstItem(data.petitionerList, data.petitioner, data.nbl, data.sponsor, petitionerSource)
  const beneficiaryRecord = firstItem(data.beneficiaryList, data.beneficiary, data.ndbl, beneficiarySource)

  const petName = getPersonNameParts('petitioner', petitionerRecord)
  const benName = getPersonNameParts('beneficiary', beneficiaryRecord)
  const petitionerBirthPlace = splitPlace(safeFirstValue(
    data.petitionerBirthPlace,
    pickObjectValue(petitionerSource, 'noiSinh', 'birthPlace', 'placeBirth', 'placeOfBirth'),
    isPetitionerOnlyForm ? data.noiSinh : ''
  ), data, 'petitionerBirthPlace')
  const beneficiaryBirthPlace = splitPlace(safeFirstValue(
    data.beneficiaryBirthPlace,
    pickObjectValue(beneficiarySource, 'noiSinh', 'birthPlace', 'placeBirth', 'placeOfBirth'),
    isBeneficiaryOnlyForm ? data.noiSinh : ''
  ), data, 'beneficiaryBirthPlace')

  // --- Parents Setup ---
  const fatherRecord = firstItem(
    petitionerSource.thongTinCha,
    petitionerSource.fatherList,
    petitionerSource.father,
    petitionerSource.cha,
    petitionerFlatFallback.fatherList,
    petitionerFlatFallback.father,
    petitionerFlatFallback.cha,
    petitionerFlatFallback.thongTinCha
  )
  const motherRecord = firstItem(
    petitionerSource.thongTinMe,
    petitionerSource.motherList,
    petitionerSource.mother,
    petitionerSource.me,
    petitionerFlatFallback.motherList,
    petitionerFlatFallback.mother,
    petitionerFlatFallback.me,
    petitionerFlatFallback.thongTinMe
  )

  const getParentResidenceParts = (prefix, record = {}) => {
    const isDeceased = (statusVal) => {
      if (!statusVal) return false
      const status = String(statusVal).trim().toUpperCase()
      const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
      return ['DA MAT', 'DAMAT', 'QUA DOI', 'QUADOI', 'CHET', 'DECEASED', 'DEAD', 'NO', 'KHONG', 'MAT'].some(word => normalized.includes(word))
    }

    const statusVal = safeFirstValue(
      data[`${prefix}Status`],
      data[`${prefix}TinhTrang`],
      pickObjectValue(record, 'status', 'tinhTrang', 'conSong', 'songCon', 'tinhTrangSucKhoe')
    )

    if (isDeceased(statusVal)) {
      return { city: 'DECEASED', country: '' }
    }

    const address = safeFirstValue(
      data[`${prefix}ResidenceAddress`],
      data[`${prefix}Residence`],
      data[`${prefix}Address`],
      addressText(record),
      pickObjectValue(record, 'residenceAddress', 'currentAddress', 'diaChi', 'address', 'diaChiStreet')
    )

    const country = safeFirstValue(
      pickObjectValue(record, 'diaChiCountry'),
      data[`${prefix}ResidenceCountry`],
      pickObjectValue(record, 'residenceCountry', 'currentCountry', 'country', 'quocGia')
    )

    const city = safeFirstValue(
      pickObjectValue(record, 'diaChiCity'),
      data[`${prefix}ResidenceCity`],
      pickObjectValue(record, 'residenceCity', 'currentCity', 'city', 'cityTown', 'town', 'thanhPho', 'huyen')
    )

    return { city, country }
  }

  const fatherResidence = getParentResidenceParts('father', fatherRecord)
  const motherResidence = getParentResidenceParts('mother', motherRecord)

  const fatherName = getPersonNameParts('father', fatherRecord)
  const motherName = getPersonNameParts('mother', motherRecord)

  const fatherBirthPlace = splitPlace(safeFirstValue(pickObjectValue(fatherRecord, 'noiSinh', 'birthPlace')), data, 'fatherBirthPlace')
  const motherBirthPlace = splitPlace(safeFirstValue(pickObjectValue(motherRecord, 'noiSinh', 'birthPlace')), data, 'motherBirthPlace')

  // --- Beneficiary parents setup ---
  // Chỉ lấy từ nguồn người được bảo lãnh, không lấy data.thongTinCha/thongTinMe phẳng
  // để tránh nhảy qua cha/mẹ của người bảo lãnh.
  const beneficiaryFatherRecord = firstItem(
    beneficiarySource.thongTinCha,
    beneficiarySource.fatherList,
    beneficiarySource.father,
    beneficiarySource.cha,
    data.beneficiaryThongTinCha,
    data.beneficiaryFatherList,
    data.beneficiaryFather,
    beneficiaryFlatFallback.thongTinCha,
    beneficiaryFlatFallback.fatherList,
    beneficiaryFlatFallback.father,
    beneficiaryFlatFallback.cha
  )
  const beneficiaryMotherRecord = firstItem(
    beneficiarySource.thongTinMe,
    beneficiarySource.motherList,
    beneficiarySource.mother,
    beneficiarySource.me,
    data.beneficiaryThongTinMe,
    data.beneficiaryMotherList,
    data.beneficiaryMother,
    beneficiaryFlatFallback.thongTinMe,
    beneficiaryFlatFallback.motherList,
    beneficiaryFlatFallback.mother,
    beneficiaryFlatFallback.me
  )

  const beneficiaryFatherName = getPersonNameParts('beneficiaryFather', beneficiaryFatherRecord)
  const beneficiaryMotherName = getPersonNameParts('beneficiaryMother', beneficiaryMotherRecord)

  const parentBirthCountryNoInfer = (record = {}) => {
    const explicitCountry = safeFirstValue(
      pickObjectValue(record, 'noiSinhCountry', 'birthCountry', 'countryOfBirth')
    )
    if (explicitCountry) return knownCountryName(explicitCountry) || explicitCountry

    const rawBirthPlace = safeFirstValue(pickObjectValue(record, 'noiSinh', 'birthPlace', 'placeOfBirth'))
    const parts = String(rawBirthPlace || '').split(',').map(part => part.trim()).filter(Boolean)
    if (parts.length >= 3) {
      const rawCountry = parts[parts.length - 1]
      return knownCountryName(rawCountry) || rawCountry
    }

    // Nơi sinh không có quốc gia thì để trống, không tự suy luận VIETNAM.
    return ''
  }

  const normalizeParentResidenceCountry = (record = {}) => {
    const explicitCountry = safeFirstValue(
      pickObjectValue(record, 'diaChiCountry', 'residenceCountry', 'currentCountry', 'country', 'quocGia'),
      record.diaChiParts && record.diaChiParts.country
    )
    if (explicitCountry) return knownCountryName(explicitCountry) || explicitCountry

    const stateOrProvince = safeFirstValue(
      pickObjectValue(record, 'diaChiState', 'diaChiProvince', 'state', 'province', 'addressState', 'addressProvince')
    )
    const zip = safeFirstValue(pickObjectValue(record, 'diaChiZip', 'diaChiZipCode', 'zip', 'zipCode', 'postalCode'))
    const street = safeFirstValue(pickObjectValue(record, 'diaChiStreet', 'diaChiLine1', 'street', 'addressLine1', 'diaChi'))
    const city = safeFirstValue(pickObjectValue(record, 'diaChiCity', 'city', 'addressCity', 'currentCity'))

    const stateKey = optionKey(stateOrProvince)
    const hasUSZip = /^\d{5}(?:-\d{4})?$/.test(String(zip || '').trim())
    const looksLikeUSState = /^[A-Z]{2}$/.test(stateKey)
    if (looksLikeUSState && hasUSZip) return 'USA'

    // Chỉ địa chỉ cư trú mới được suy luận Vietnam khi country trống.
    if (street || city || stateOrProvince || zip) return 'VIETNAM'
    return ''
  }

  const parentResidenceCity = (record = {}) => safeFirstValue(
    pickObjectValue(record, 'diaChiCity', 'residenceCity', 'currentCity', 'city', 'cityTown', 'town', 'thanhPho', 'huyen')
  )

  const firstRecordList = (...values) => {
    for (const value of values) {
      if (Array.isArray(value)) {
        const rows = value.filter(item => hasRecordValue(item))
        if (rows.length) return rows
      } else if (hasRecordValue(value)) {
        return [value]
      }
    }
    return []
  }

  const parseAddressSortDate = (value) => {
    const raw = String(value || '').trim()
    const key = optionKey(raw)
    if (!key || ['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)) return Date.now()
    const parts = raw.split('/')
    if (parts.length === 3) {
      const time = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime()
      return Number.isNaN(time) ? 0 : time
    }
    const time = new Date(raw).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  const getAddressRecordFromDate = (record = {}) => safeFirstValue(
    pickObjectValue(record, 'from', 'start', 'startDate', 'ngayBatDau')
  )

  const parseEmploymentSortDate = (value) => {
    const raw = String(value || '').trim()
    const key = optionKey(raw)
    if (!key) return 0
    if (['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)) return Date.now()
    const parts = raw.split(/[/-]/).map(part => part.trim()).filter(Boolean)
    if (parts.length === 3) {
      let year, month, day
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parts[0]; month = parts[1]; day = parts[2]
      } else {
        // Ngày lưu có thể là DD/MM/YYYY hoặc MM/DD/YYYY tùy nơi nhập. Tháng không thể > 12,
        // nên nếu 1 trong 2 phần đầu > 12 thì chắc chắn đó là ngày (giống fillDateCells).
        // Chỉ khi cả 2 đều <= 12 (thực sự mơ hồ) mới mặc định theo kiểu DD/MM (Việt Nam).
        const p1 = parseInt(parts[1], 10)
        year = parts[2]
        if (p1 > 12) {
          month = parts[0]; day = parts[1]
        } else {
          day = parts[0]; month = parts[1]
        }
      }
      const time = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).getTime()
      return Number.isNaN(time) ? 0 : time
    }
    const time = new Date(raw).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  const employmentEndDate = (record = {}) => safeFirstValue(
    pickObjectValue(record, 'to', 'end', 'endDate', 'ngayNghiViec', 'ngayKetThuc')
  )
  const employmentStartDate = (record = {}) => safeFirstValue(
    pickObjectValue(record, 'from', 'start', 'startDate', 'ngayNhanViec', 'ngayBatDau')
  )

  const recordListFromSources = (...values) => firstRecordList(...values)
  const employmentRecordKey = (record = {}) => {
    const parts = [
      pickObjectValue(record, 'tenCongTy', 'employerName', 'companyName', 'currentEmployerName', 'company', 'employer', 'name'),
      pickObjectValue(record, 'ngheNghiep', 'occupation', 'jobTitle', 'chucVu', 'title', 'profession', 'currentOccupation'),
      employmentStartDate(record),
      employmentEndDate(record),
      pickObjectValue(record, 'diaChiStreet', 'street', 'addressLine1', 'diaChiCity', 'city', 'diaChiProvince', 'province', 'diaChiState', 'state', 'diaChiZip', 'zip', 'postalCode', 'diaChiCountry', 'country'),
      pickObjectValue(record, 'diaChi', 'address', 'employerAddress', 'companyAddress', 'currentEmployerAddress', 'diaChiCongTy', 'fullAddress')
    ].map(part => optionKey(part)).filter(Boolean)
    return parts.join('|') || optionKey(JSON.stringify(record))
  }
  const employmentRecordListFromSources = (...values) => {
    const rows = []
    const seen = new Set()
    for (const value of values) {
      const candidates = Array.isArray(value)
        ? value
        : (hasRecordValue(value) ? [value] : [])
      for (const item of candidates) {
        if (!hasRecordValue(item)) continue
        const key = employmentRecordKey(item)
        if (seen.has(key)) continue
        seen.add(key)
        rows.push(item)
      }
    }
    return rows
  }

  const sortEmploymentRecordsNewestFirst = (records = []) => records
    .filter(item => hasRecordValue(item))
    .slice()
    .sort((a, b) => {
      const aEnd = employmentEndDate(a) || (employmentStartDate(a) ? 'PRESENT' : '')
      const bEnd = employmentEndDate(b) || (employmentStartDate(b) ? 'PRESENT' : '')
      const endDiff = parseEmploymentSortDate(bEnd) - parseEmploymentSortDate(aEnd)
      if (endDiff) return endDiff
      return parseEmploymentSortDate(employmentStartDate(b)) - parseEmploymentSortDate(employmentStartDate(a))
    })

  // Addresses 5 Years sorting
  const petitionerAddressRecords = firstRecordList(
    petitionerSource.addresses5Years,
    petitionerSource.diaChi5Nam,
    petitionerSource.previousAddresses,
    data.petitionerAddresses5Years,
    data.petitionerDiaChi5Nam,
    petitionerFlatFallback.diaChi5Nam
  ).slice().sort((a, b) => parseAddressSortDate(getAddressRecordFromDate(b)) - parseAddressSortDate(getAddressRecordFromDate(a)))

  const beneficiaryAddressRecords = firstRecordList(
    beneficiarySource.addresses5Years,
    beneficiarySource.diaChi5Nam,
    beneficiarySource.previousAddresses,
    data.beneficiaryAddresses5Years,
    data.beneficiaryDiaChi5Nam,
    beneficiaryFlatFallback.addresses5Years,
    beneficiaryFlatFallback.diaChi5Nam
  ).slice().sort((a, b) => parseAddressSortDate(getAddressRecordFromDate(b)) - parseAddressSortDate(getAddressRecordFromDate(a)))

  // Employment sorting
  const petitionerEmploymentDirectRecords = employmentRecordListFromSources(
    petitionerSource.congViec5Nam,
    petitionerSource.congViecTrong5Nam,
    petitionerSource.cong_viec_5_nam,
    petitionerSource.cong_viec_trong_5_nam,
    petitionerSource.jobs5Years,
    petitionerSource.jobs,
    petitionerSource.works,
    petitionerSource.employmentHistory,
    petitionerSource.employment5Years,
    petitionerSource.previousJobs,
    petitionerSource.previousJobsList,
    data.petitionerCongViec5Nam,
    data.petitionerJobs5Years,
    data.petitionerEmploymentHistory,
    data.petitionerEmployment5Years,
    data.petitionerPreviousJobs
  )
  const petitionerEmploymentTopLevelRecords = employmentRecordListFromSources(
    data.congViec5Nam,
    data.congViecTrong5Nam,
    data.cong_viec_5_nam,
    data.cong_viec_trong_5_nam,
    data.jobs5Years,
    data.jobs,
    data.works,
    data.employmentHistory,
    data.employment5Years,
    data.previousJobs,
    data.previousJobsList,
    petitionerFlatFallback.congViec5Nam,
    petitionerFlatFallback.congViecTrong5Nam,
    petitionerFlatFallback.jobs5Years,
    petitionerFlatFallback.jobs,
    petitionerFlatFallback.employmentHistory,
    petitionerFlatFallback.employment5Years,
    petitionerFlatFallback.previousJobs,
    petitionerFlatFallback.previousJobsList
  )
  // Luôn gộp cả 2 nguồn (direct + top-level) và để employmentRecordListFromSources tự loại
  // trùng theo nội dung (employmentRecordKey). Trước đây việc CÓ gộp nguồn top-level hay không
  // phụ thuộc vào shouldUseTopLevelPetitionerEmployment - một điều kiện có thể cho ra kết quả
  // khác nhau giữa lần load summary và lần load chi tiết của CÙNG một hồ sơ (vì hasSeparatedSources/
  // độ dài từng nguồn thay đổi theo dữ liệu đang có ở mỗi lần load). Khi số lượng/thứ tự
  // petitionerEmploymentRecords đổi giữa 2 lần load, I129FWordPaper.vue tạo lại cellId theo vị trí
  // mới -> reapplyPreservedI129FChanges không tìm thấy cellId cũ -> sửa đổi của nhân viên ở phần
  // Việc Làm bị mất âm thầm sau khi lưu. Gộp cố định cả 2 nguồn giúp danh sách này ổn định qua các
  // lần load, giống cách beneficiaryEmploymentRecords đã làm ở dưới.
  const petitionerEmploymentRecords = sortEmploymentRecordsNewestFirst(employmentRecordListFromSources(
    petitionerEmploymentDirectRecords,
    petitionerEmploymentTopLevelRecords
  ))

  const beneficiaryEmploymentRecords = sortEmploymentRecordsNewestFirst(employmentRecordListFromSources(
    beneficiarySource.congViec5Nam,
    beneficiarySource.congViecTrong5Nam,
    beneficiarySource.jobs5Years,
    beneficiarySource.jobs,
    beneficiarySource.employmentHistory,
    beneficiarySource.employment5Years,
    beneficiarySource.previousJobs,
    beneficiarySource.previousJobsList,
    data.beneficiaryCongViec5Nam,
    data.beneficiaryJobs5Years,
    data.beneficiaryEmploymentHistory,
    data.beneficiaryEmployment5Years,
    beneficiaryFlatFallback.congViec5Nam,
    beneficiaryFlatFallback.congViecTrong5Nam,
    beneficiaryFlatFallback.jobs5Years,
    beneficiaryFlatFallback.jobs,
    beneficiaryFlatFallback.employmentHistory,
    beneficiaryFlatFallback.employment5Years,
    beneficiaryFlatFallback.previousJobs,
    beneficiaryFlatFallback.previousJobsList
  ))

  // Addresses Mapping helper
  const petitionerMailingAddressText = firstAddressText(
    data.petitionerMailingAddress,
    pickObjectValue(petitionerSource, 'diaChiNhanThuMy', 'mailingAddress', 'currentAddress'),
    petitionerFlatFallback.mailingAddress,
    petitionerFlatFallback.diaChiNhanThuMy
  )
  const petMailingAddr = normalizeI130AAddressLines(safeSplitAddr(petitionerMailingAddressText, data, 'petitionerMailingAddress', true))

  const beneficiaryMailingAddressText = firstAddressText(
    data.beneficiaryMailingAddress,
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVN', 'mailingAddress', 'address'),
    beneficiaryFlatFallback.diaChiNhanThuVN
  )
  const benMailingAddr = normalizeI130AAddressLines(safeSplitAddr(beneficiaryMailingAddressText, data, 'beneficiaryMailingAddress', false))

  const beneficiaryCurrentAddressText = firstAddressText(
    data.beneficiaryCurrentAddress,
    pickObjectValue(beneficiarySource, 'currentAddress', 'address'),
    beneficiaryFlatFallback.currentAddress,
    beneficiaryFlatFallback.diaChiNhanThuVN
  )
  const benCurrentAddr = normalizeI130AAddressLines(safeSplitAddr(beneficiaryCurrentAddressText, data, 'beneficiaryCurrentAddress', false))
  const benCurrentAddrFrom = safeFirstValue(
    data.beneficiaryCurrentAddressFrom,
    pickObjectValue(beneficiarySource, 'currentAddressFrom', 'addressFrom', 'from', 'startDate', 'ngayBatDau')
  )
  const benCurrentAddrTo = safeFirstValue(
    data.beneficiaryCurrentAddressTo,
    pickObjectValue(beneficiarySource, 'currentAddressTo', 'addressTo', 'to', 'endDate', 'ngayChuyenDi'),
    benCurrentAddrFrom || beneficiaryCurrentAddressText ? 'PRESENT' : ''
  )

  // Intended US Address
  const intendedUsAddressText = firstAddressText(
    data.beneficiaryIntendedUSAddress,
    data.intendedUSAddress,
    pickObjectValue(beneficiarySource, 'intendedUSAddress', 'diaChiDuDinhSongMy', 'addressInUS')
  )
  // Nơi dự định ở của 2 đương đơn: chỉ lấy từ người được bảo lãnh.
  // Không lấy địa chỉ nhận thư của người bảo lãnh để tránh nhảy/đè data.
  const intendedUsAddr = normalizeI130AAddressLines(safeSplitAddr(intendedUsAddressText, beneficiarySource, 'intendedUSAddress', true))
  const intendedUsHasAddress = [
    intendedUsAddressText,
    intendedUsAddr.street,
    intendedUsAddr.line1,
    intendedUsAddr.city,
    intendedUsAddr.state,
    intendedUsAddr.province,
    intendedUsAddr.zip,
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyStreet', 'diaChiDuDinhSongMyLine1'),
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyCity'),
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyState', 'diaChiDuDinhSongMyProvince'),
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyZip', 'diaChiDuDinhSongMyZipCode')
  ].some(value => String(value || '').trim() !== '')
  const intendedUsStreet = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyStreet', 'diaChiDuDinhSongMyLine1', 'intendedUSAddressStreet', 'addressInUSStreet'),
    intendedUsAddr.street,
    intendedUsAddr.line1
  )
  const intendedUsApt = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyLine2', 'diaChiDuDinhSongMyApt', 'intendedUSAddressApt', 'addressInUSApt'),
    intendedUsAddr.line2
  )
  const intendedUsCity = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyCity', 'intendedUSAddressCity', 'addressInUSCity'),
    intendedUsAddr.city
  )
  const intendedUsState = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyState', 'diaChiDuDinhSongMyProvince', 'intendedUSAddressState', 'addressInUSState'),
    intendedUsAddr.state,
    intendedUsAddr.province
  )
  const intendedUsZip = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyZip', 'diaChiDuDinhSongMyZipCode', 'intendedUSAddressZip', 'addressInUSZip'),
    intendedUsAddr.zip
  )
  const intendedUsCountry = safeFirstValue(
    knownCountryName(pickObjectValue(beneficiarySource, 'diaChiDuDinhSongMyCountry', 'intendedUSAddressCountry', 'addressInUSCountry')),
    knownCountryName(intendedUsAddr.country),
    inferUSCountryFromAddressParts({
      street: intendedUsStreet,
      city: intendedUsCity,
      state: intendedUsState,
      zip: intendedUsZip
    }),
    intendedUsHasAddress ? 'USA' : ''
  )
  const intendedUsDaytimePhone = safeFirstValue(
    pickObjectValue(petitionerSource, 'soDienThoai', 'phone', 'phoneNumber', 'daytimeTelephoneNumber'),
    data.petitionerPhone,
    data.petitionerDaytimePhone
  )

  const petitionerCriminalHistoryAnswer = asYesNo(safeFirstValue(
    pickObjectValue(petitionerSource, 'biBatGiu', 'arrestedConvicted', 'criminalHistory', 'biKetAn'),
    data.petitionerBiBatGiu,
    data.petitionerCriminalHistory,
    petitionerFlatFallback.biBatGiu
  ), '')

  // Petitioner biographic information (Part C rows 1-6).
  // This block must use petitionerData/nguoiBaoLanh only, not beneficiaryData.
  const petitionerEthnicity = translateEthnicity(safeFirstValue(
    pickObjectValue(petitionerSource, 'danTocMyLatinh', 'ethnicity', 'hispanicLatino'),
    data.petitionerEthnicity,
    petitionerFlatFallback.danTocMyLatinh
  ))
  const petitionerRace = translateRace(safeFirstValue(
    pickObjectValue(petitionerSource, 'chungToc', 'race'),
    data.petitionerRace,
    petitionerFlatFallback.chungToc
  ))
  const petitionerHeight = formatHeight(safeFirstValue(
    pickObjectValue(petitionerSource, 'chieuCao', 'height'),
    data.petitionerHeight,
    petitionerFlatFallback.chieuCao
  ))
  const petitionerWeight = formatWeight(safeFirstValue(
    pickObjectValue(petitionerSource, 'canNang', 'weight'),
    data.petitionerWeight,
    petitionerFlatFallback.canNang
  ))
  const petitionerEyeColor = translateColor(safeFirstValue(
    pickObjectValue(petitionerSource, 'mauMatKhac', 'eyeColorOther'),
    pickObjectValue(petitionerSource, 'mauMat', 'eyeColor'),
    data.petitionerEyeColor,
    petitionerFlatFallback.mauMatKhac,
    petitionerFlatFallback.mauMat
  ), 'eye')
  const petitionerHairColor = translateColor(safeFirstValue(
    pickObjectValue(petitionerSource, 'mauTocKhac', 'hairColorOther'),
    pickObjectValue(petitionerSource, 'mauToc', 'hairColor'),
    data.petitionerHairColor,
    petitionerFlatFallback.mauTocKhac,
    petitionerFlatFallback.mauToc
  ), 'hair')

  const petitionerContactPhone = safeFirstValue(
    pickObjectValue(petitionerSource, 'soDienThoai', 'phone', 'phoneNumber', 'daytimeTelephoneNumber', 'mobileTelephoneNumber', 'mobilePhone'),
    data.petitionerPhone,
    data.petitionerDaytimePhone,
    petitionerFlatFallback.soDienThoai
  )
  const petitionerContactEmail = safeFirstValue(
    pickObjectValue(petitionerSource, 'email', 'emailAddress'),
    data.petitionerEmail,
    petitionerFlatFallback.email
  )

  // Foreign physical address of beneficiary outside the United States.
  // This section must use the beneficiary's Vietnam/foreign physical address,
  // not diaChiDuDinhSongMy. Otherwise USA from the intended US address can jump
  // into the foreign-address Country row.
  const beneficiaryForeignAddressText = firstAddressText(
    data.beneficiaryForeignAddress,
    data.foreignAddressOutsideUS,
    data.beneficiaryForeignAddressRaw,
    pickObjectValue(beneficiarySource, 'foreignAddress', 'diaChiSongNgoaiHoaKy', 'diaChiNhanThuVN', 'mailingAddress', 'address'),
    beneficiaryFlatFallback.diaChiSongNgoaiHoaKy,
    beneficiaryFlatFallback.diaChiNhanThuVN
  )
  const benForeignAddr = normalizeI130AAddressLines(safeSplitAddr(beneficiaryForeignAddressText, beneficiarySource, 'beneficiaryMailingAddress', false))
  const beneficiaryForeignStreet = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVNStreet', 'diaChiNhanThuVNLine1', 'foreignAddressStreet', 'diaChiSongNgoaiHoaKyStreet'),
    data.beneficiaryForeignAddressStreet,
    beneficiaryFlatFallback.diaChiNhanThuVNStreet,
    benForeignAddr.street,
    benForeignAddr.line1
  )
  const beneficiaryForeignApt = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVNLine2', 'diaChiNhanThuVNApt', 'foreignAddressApt', 'diaChiSongNgoaiHoaKyApt'),
    data.beneficiaryForeignAddressLine2,
    benForeignAddr.line2
  )
  const beneficiaryForeignCity = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVNCity', 'foreignAddressCity', 'diaChiSongNgoaiHoaKyCity'),
    data.beneficiaryForeignAddressCity,
    beneficiaryFlatFallback.diaChiNhanThuVNCity,
    benForeignAddr.city
  )
  const beneficiaryForeignProvince = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVNProvince', 'diaChiNhanThuVNState', 'foreignAddressProvince', 'diaChiSongNgoaiHoaKyProvince'),
    data.beneficiaryForeignAddressProvince,
    beneficiaryFlatFallback.diaChiNhanThuVNProvince,
    benForeignAddr.province,
    benForeignAddr.state
  )
  const beneficiaryForeignPostalCode = safeFirstValue(
    pickObjectValue(beneficiarySource, 'diaChiNhanThuVNZip', 'diaChiNhanThuVNZipCode', 'foreignAddressPostalCode', 'diaChiSongNgoaiHoaKyZip'),
    data.beneficiaryForeignAddressPostalCode,
    data.beneficiaryForeignAddressZip,
    beneficiaryFlatFallback.diaChiNhanThuVNZip,
    beneficiaryFlatFallback.diaChiNhanThuVNZipCode,
    benForeignAddr.zip
  )
  const beneficiaryForeignCountry = (() => {
    const explicitCountry = safeFirstValue(
      pickObjectValue(beneficiarySource, 'diaChiNhanThuVNCountry', 'foreignAddressCountry', 'diaChiSongNgoaiHoaKyCountry'),
      data.beneficiaryForeignAddressCountry,
      beneficiaryFlatFallback.diaChiNhanThuVNCountry,
      benForeignAddr.country
    )
    if (explicitCountry) return knownCountryName(explicitCountry) || explicitCountry
    // For this section only, if there is a real foreign/Vietnam address but country is blank,
    // fill VIETNAM. Do not let the intended US address default (USA) fall through here.
    return [beneficiaryForeignStreet, beneficiaryForeignCity, beneficiaryForeignProvince, beneficiaryForeignPostalCode]
      .some(value => String(value || '').trim() !== '') ? 'VIETNAM' : ''
  })()
  const beneficiaryForeignDaytimePhone = intendedUsDaytimePhone

  // Previous Marriages
  const petitionerPreviousMarriageCount = countRecords(petitionerSource.honNhanCu || data.petitionerHonNhanCu || petitionerFlatFallback.honNhanCu) + countRecords(petitionerSource.honPhoiDaMat || data.petitionerHonPhoiDaMat || petitionerFlatFallback.honPhoiDaMat)
  const petPreviouslyMarried = petitionerPreviousMarriageCount > 0 ? 'YES' : 'NO'
  const petitionerFormerSpouseRecord = itemAt(petitionerSource.honNhanCu || data.petitionerHonNhanCu || petitionerFlatFallback.honNhanCu, 0)
  const petFormerSpouse = splitNameValue(petitionerFormerSpouseRecord)
  const petFormerSpouseEnded = safeFirstValue(
    pickObjectValue(petitionerFormerSpouseRecord, 'ngayLyHon', 'marriageEndDate', 'endedDate', 'dateEnded')
  )

  const beneficiaryMaritalStatus = safeFirstValue(
    beneficiarySource.tinhTrangHonNhan,
    beneficiarySource.maritalStatus,
    data.beneficiaryMaritalStatus,
    beneficiaryFlatFallback.tinhTrangHonNhan
  )
  const beneficiaryMaritalStatusKey = optionKey(beneficiaryMaritalStatus)
  const beneficiaryNeverMarried = (
    !beneficiaryMaritalStatusKey ||
    beneficiaryMaritalStatusKey.includes('DOC THAN') ||
    beneficiaryMaritalStatusKey.includes('CHUA BAO GIO KET HON') ||
    beneficiaryMaritalStatusKey.includes('CHUA KET HON LAN NAO') ||
    beneficiaryMaritalStatusKey.includes('NEVER MARRIED') ||
    beneficiaryMaritalStatusKey.includes('SINGLE')
  )
  const beneficiaryKnownPreviouslyMarried = (
    beneficiaryMaritalStatusKey.includes('DA KET HON') ||
    beneficiaryMaritalStatusKey.includes('TAI HON') ||
    beneficiaryMaritalStatusKey.includes('LY HON') ||
    beneficiaryMaritalStatusKey.includes('GOA') ||
    beneficiaryMaritalStatusKey.includes('VO CHONG DA MAT') ||
    beneficiaryMaritalStatusKey.includes('DA TUNG KET HON') ||
    beneficiaryMaritalStatusKey.includes('LY THAN') ||
    beneficiaryMaritalStatusKey.includes('MARRIED') ||
    beneficiaryMaritalStatusKey.includes('DIVORCED') ||
    beneficiaryMaritalStatusKey.includes('WIDOW') ||
    beneficiaryMaritalStatusKey.includes('WIDOWER') ||
    beneficiaryMaritalStatusKey.includes('SEPARATED') ||
    beneficiaryMaritalStatusKey.includes('REMARRIED')
  )
  const beneficiaryPreviousMarriageCount = countRecords(beneficiarySource.honNhanCu || data.beneficiaryHonNhanCu || beneficiaryFlatFallback.honNhanCu) + countRecords(beneficiarySource.honPhoiDaMat || data.beneficiaryHonPhoiDaMat || beneficiaryFlatFallback.honPhoiDaMat)
  const benPreviouslyMarried = (!beneficiaryNeverMarried && (beneficiaryKnownPreviouslyMarried || beneficiaryPreviousMarriageCount > 0)) ? 'YES' : 'NO'
  const beneficiaryDivorcedSpouseRecord = itemAt(beneficiarySource.honNhanCu || data.beneficiaryHonNhanCu || beneficiaryFlatFallback.honNhanCu, 0)
  const beneficiaryDeceasedSpouseRecord = itemAt(beneficiarySource.honPhoiDaMat || data.beneficiaryHonPhoiDaMat || beneficiaryFlatFallback.honPhoiDaMat, 0)
  const beneficiaryFormerSpouseRecord = hasRecordValue(beneficiaryDivorcedSpouseRecord)
    ? beneficiaryDivorcedSpouseRecord
    : beneficiaryDeceasedSpouseRecord
  const benFormerSpouse = benPreviouslyMarried === 'YES' ? splitNameValue(beneficiaryFormerSpouseRecord) : { family: '', middle: '', given: '' }
  const benFormerSpouseEnded = benPreviouslyMarried === 'YES' ? safeFirstValue(
    pickObjectValue(beneficiaryFormerSpouseRecord, 'ngayLyHon', 'ngayMat', 'marriageEndDate', 'endedDate', 'dateEnded', 'deathDate')
  ) : ''

  // Beneficiary US visit history
  // Chỉ lấy từ beneficiaryData/nguoiDuocBaoLanh để tránh nhảy qua người bảo lãnh.
  const beneficiaryEverBeenInUSRaw = safeFirstValue(
    beneficiarySource.tungNhapCanhMy,
    beneficiarySource.hasBeenInUS,
    beneficiarySource.everBeenInUS,
    beneficiarySource.everEnteredUS,
    data.beneficiaryTungNhapCanhMy,
    data.beneficiaryEverBeenInUS,
    beneficiaryFlatFallback.tungNhapCanhMy
  )
  const beneficiaryEverBeenInUSKey = optionKey(beneficiaryEverBeenInUSRaw)
  const beneficiaryEverBeenInUS = (
    beneficiaryEverBeenInUSKey.includes('CO') ||
    beneficiaryEverBeenInUSKey.includes('ROI') ||
    beneficiaryEverBeenInUSKey.includes('YES') ||
    beneficiaryEverBeenInUSKey === 'Y' ||
    beneficiaryEverBeenInUSKey === 'TRUE' ||
    beneficiaryEverBeenInUSKey === '1'
  ) ? 'YES' : 'NO'

  // Beneficiary Children Records
  // Chỉ lấy con cái từ beneficiaryData/nguoiDuocBaoLanh để tránh lấy nhầm con của người bảo lãnh.
  const beneficiaryChildRecords = recordListFromSources(
    beneficiarySource.thongTinCon,
    beneficiarySource.children,
    beneficiarySource.childrenInfo,
    data.beneficiaryThongTinCon,
    data.beneficiaryChildren,
    data.beneficiaryChildrenInfo,
    beneficiaryFlatFallback.thongTinCon,
    beneficiaryFlatFallback.children,
    beneficiaryFlatFallback.childrenInfo
  )
  const beneficiaryHasChildrenRaw = safeFirstValue(
    beneficiarySource.daCoCon,
    beneficiarySource.hasChildren,
    beneficiarySource.hasAnyChildren,
    data.beneficiaryDaCoCon,
    data.beneficiaryHasChildren,
    beneficiaryFlatFallback.daCoCon
  )
  const beneficiaryHasChildren = beneficiaryHasChildrenRaw
    ? asYesNo(beneficiaryHasChildrenRaw, 'NO')
    : (beneficiaryChildRecords.length > 0 ? 'YES' : 'NO')
  const beneficiaryChild1Record = beneficiaryHasChildren === 'YES' ? itemAt(beneficiaryChildRecords, 0) : {}
  const benChild1 = splitNameValue(beneficiaryChild1Record)
  const benChild1BirthPlace = splitPlace(safeFirstValue(
    pickObjectValue(beneficiaryChild1Record, 'noiSinh', 'birthPlace', 'placeOfBirth')
  ))
  const benChild1BirthCountry = safeFirstValue(
    pickObjectValue(beneficiaryChild1Record, 'noiSinhCountry', 'birthCountry', 'countryOfBirth'),
    benChild1BirthPlace.country
  )
  const benChild1BirthDate = safeFirstValue(
    pickObjectValue(beneficiaryChild1Record, 'ngaySinh', 'birthDate', 'dateOfBirth')
  )
  const benChild1Resides = beneficiaryHasChildren === 'YES' && hasRecordValue(beneficiaryChild1Record)
    ? asYesNo(pickObjectValue(beneficiaryChild1Record, 'songChung', 'residesWithBeneficiary', 'coSongChung'), '')
    : ''
  const benChild1AddrText = addressText(pickObjectValue(beneficiaryChild1Record, 'diaChi', 'address', 'currentAddress'))
  const benChild1Addr = normalizeI130AAddressLines(safeSplitAddr(benChild1AddrText, data, 'benChild1Addr', false))
  const normalizeChildResidenceCountry = (child = {}, addr = {}) => {
    const country = safeFirstValue(
      pickObjectValue(child, 'diaChiCountry', 'country', 'addressCountry', 'currentCountry'),
      addr.country
    )
    if (country) return knownCountryName(country) || country

    const stateOrProvince = safeFirstValue(
      pickObjectValue(child, 'diaChiState', 'diaChiProvince', 'state', 'province', 'addressState', 'addressProvince'),
      addr.state,
      addr.province
    )
    const zip = safeFirstValue(
      pickObjectValue(child, 'diaChiZip', 'diaChiZipCode', 'zip', 'zipCode', 'postalCode'),
      addr.zip
    )
    const street = safeFirstValue(
      pickObjectValue(child, 'diaChiStreet', 'diaChiLine1', 'street', 'addressLine1'),
      addr.street
    )
    const city = safeFirstValue(
      pickObjectValue(child, 'diaChiCity', 'city', 'addressCity'),
      addr.city
    )
    const stateKey = optionKey(stateOrProvince)
    const hasUSZip = /^\d{5}(?:-\d{4})?$/.test(String(zip || '').trim())
    const looksLikeUSState = /^[A-Z]{2}$/.test(stateKey)
    if (looksLikeUSState && hasUSZip) return 'USA'
    if (street || city || stateOrProvince || zip) return 'VIETNAM'
    return ''
  }
  const childResidenceCountryKey = (child = {}, addr = {}) => optionKey(normalizeChildResidenceCountry(child, addr))
  const isChildResidenceUSA = (child = {}, addr = {}) => {
    const key = childResidenceCountryKey(child, addr)
    return ['USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(key) || key.includes('UNITED STATES')
  }
  const childResidenceState = (child = {}, addr = {}) => isChildResidenceUSA(child, addr)
    ? safeFirstValue(pickObjectValue(child, 'diaChiState', 'state', 'addressState'), addr.state, pickObjectValue(child, 'diaChiProvince'), addr.province)
    : ''
  const childResidenceZip = (child = {}, addr = {}) => isChildResidenceUSA(child, addr)
    ? safeFirstValue(pickObjectValue(child, 'diaChiZip', 'diaChiZipCode', 'zip', 'zipCode'), addr.zip)
    : ''
  const childResidenceProvince = (child = {}, addr = {}) => isChildResidenceUSA(child, addr)
    ? ''
    : safeFirstValue(pickObjectValue(child, 'diaChiProvince', 'province', 'addressProvince'), addr.province, pickObjectValue(child, 'diaChiState'), addr.state)
  const childResidencePostalCode = (child = {}, addr = {}) => isChildResidenceUSA(child, addr)
    ? ''
    : safeFirstValue(pickObjectValue(child, 'diaChiZip', 'diaChiZipCode', 'postalCode', 'zip', 'zipCode'), addr.zip)

  // Travel history
  const usEntry1 = firstItem(beneficiarySource.lanNhapCanhMy, beneficiarySource.usEntryHistory, data.beneficiaryUSEntryHistory, beneficiaryFlatFallback.lanNhapCanhMy, beneficiaryFlatFallback.usEntryHistory, beneficiaryFlatFallback.previousUSEntries)

  // Petitioner Children under 18
  const children18List = Array.isArray(petitionerSource.thongTinConCai)
    ? petitionerSource.thongTinConCai
    : (Array.isArray(petitionerFlatFallback.thongTinConCai) ? petitionerFlatFallback.thongTinConCai : [])
  const child18_0 = itemAt(children18List, 0)
  const child18_1 = itemAt(children18List, 1)

  const calculateAge = (dobString) => {
    if (!dobString) return ''
    const raw = String(dobString).trim()
    if (!raw) return ''
    const parts = raw.split('/')
    let dobDate
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      dobDate = new Date(year, month, day)
    } else {
      dobDate = new Date(raw)
    }
    if (isNaN(dobDate.getTime())) return ''
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const m = today.getMonth() - dobDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--
    }
    return age >= 0 ? String(age) : ''
  }

  // --- Petitioner Previous Address Records ---
  const petAddr0 = itemAt(petitionerAddressRecords, 0)
  const petAddr1 = itemAt(petitionerAddressRecords, 1)

  // --- Beneficiary Address Records ---
  const benAddr0 = itemAt(beneficiaryAddressRecords, 0)
  const benAddr1 = itemAt(beneficiaryAddressRecords, 1)

  // --- Employment Records ---
  const petEmp0 = itemAt(petitionerEmploymentRecords, 0)
  const petEmp1 = itemAt(petitionerEmploymentRecords, 1)
  const benEmp0 = itemAt(beneficiaryEmploymentRecords, 0)
  const benEmp1 = itemAt(beneficiaryEmploymentRecords, 1)

  const normalizeEmploymentCountry = (emp = {}) => {
    const country = safeFirstValue(
      emp.diaChiCountry,
      emp.diaChiQuocGia,
      emp.country,
      emp.addressCountry,
      emp.employerCountry,
      emp.companyCountry,
      emp.diaChiParts && emp.diaChiParts.country
    )
    if (country) return knownCountryName(country) || country

    // Form cũ có thể để trống Country. Không được vì trống mà lấy nhầm state/province.
    // Nếu có ZIP Mỹ + State 2 ký tự thì suy ra USA; ngược lại, nếu có city/province/street
    // của Việt Nam thì suy ra VIETNAM để Province hiển thị đúng và State/ZIP Mỹ bị ẩn.
    const stateOrProvince = safeFirstValue(
      emp.diaChiState,
      emp.diaChiProvince,
      emp.state,
      emp.province,
      emp.addressState,
      emp.addressProvince,
      emp.companyAddressState,
      emp.companyAddressProvince
    )
    const zip = safeFirstValue(emp.diaChiZip, emp.diaChiZipCode, emp.zip, emp.zipCode, emp.postalCode)
    const street = safeFirstValue(emp.diaChiStreet, emp.diaChiLine1, emp.street, emp.addressLine1)
    const city = safeFirstValue(emp.diaChiCity, emp.city, emp.addressCity, emp.companyAddressCity)
    const stateKey = optionKey(stateOrProvince)
    const hasUSZip = /^\d{5}(?:-\d{4})?$/.test(String(zip || '').trim())
    const looksLikeUSState = /^[A-Z]{2}$/.test(stateKey)

    if (looksLikeUSState && hasUSZip) return 'USA'
    if (street || city || stateOrProvince || zip) return 'VIETNAM'
    return ''
  }

  const employmentCountryKey = (emp = {}) => optionKey(normalizeEmploymentCountry(emp))
  const isEmploymentUSA = (emp = {}) => {
    const key = employmentCountryKey(emp)
    return ['USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(key) || key.includes('UNITED STATES')
  }
  const isEmploymentVietnam = (emp = {}) => {
    const key = employmentCountryKey(emp)
    if (key.includes('VIET') || key === 'VN') return true
    if (key) return false

    // Trường country trong form có thể bỏ trống. Nếu không phải USA nhưng có province,
    // vẫn ưu tiên hiển thị Province thay vì State để tránh nhảy dữ liệu sai cột.
    const province = safeFirstValue(emp.diaChiProvince, emp.province, emp.addressProvince, emp.companyAddressProvince)
    const state = safeFirstValue(emp.diaChiState, emp.state, emp.addressState, emp.companyAddressState)
    const zip = safeFirstValue(emp.diaChiZip, emp.diaChiZipCode, emp.zip, emp.zipCode, emp.postalCode)
    const stateKey = optionKey(state || province)
    const hasUSZip = /^\d{5}(?:-\d{4})?$/.test(String(zip || '').trim())
    const looksLikeUSState = /^[A-Z]{2}$/.test(stateKey)
    return !!province && !(looksLikeUSState && hasUSZip)
  }

  const employmentState = (emp = {}) => isEmploymentUSA(emp)
    ? safeFirstValue(emp.diaChiState, emp.diaChiProvince, emp.state, emp.addressState, emp.companyAddressState)
    : ''
  const employmentProvince = (emp = {}) => isEmploymentVietnam(emp) || !isEmploymentUSA(emp)
    ? safeFirstValue(emp.diaChiProvince, emp.province, emp.addressProvince, emp.companyAddressProvince)
    : ''
  const employmentZip = (emp = {}) => isEmploymentUSA(emp)
    ? safeFirstValue(emp.diaChiZip, emp.diaChiZipCode, emp.zip, emp.zipCode, emp.postalCode)
    : ''
  const employmentPostalCode = (emp = {}) => isEmploymentUSA(emp)
    ? ''
    : safeFirstValue(emp.diaChiZip, emp.diaChiZipCode, emp.zip, emp.zipCode, emp.postalCode)
  const employmentEndDateDisplay = (emp = {}) => {
    const start = safeFirstValue(emp.ngayNhanViec, emp.from, emp.start, emp.startDate, emp.ngayBatDau)
    const end = safeFirstValue(emp.ngayNghiViec, emp.to, emp.end, emp.endDate, emp.ngayKetThuc)
    return end || (start ? 'Present' : '')
  }
  const employmentAddressText = (emp = {}) => firstAddressText(
    emp.diaChi,
    emp.address,
    emp.employerAddress,
    emp.companyAddress,
    emp.currentEmployerAddress,
    emp.diaChiCongTy,
    emp.fullAddress
  )
  const employmentAddressParts = (emp = {}, prefix = '') => normalizeI130AAddressLines(
    safeSplitAddr(employmentAddressText(emp), emp, prefix, isEmploymentUSA(emp))
  )
  const employmentEmployerName = (emp = {}) => safeFirstValue(
    emp.tenCongTy,
    emp.employerName,
    emp.companyName,
    emp.currentEmployerName,
    emp.company,
    emp.employer,
    emp.name
  )
  const employmentOccupation = (emp = {}) => safeFirstValue(
    emp.ngheNghiep,
    emp.occupation,
    emp.jobTitle,
    emp.chucVu,
    emp.title,
    emp.profession,
    emp.currentOccupation
  )
  const employmentStartDateDisplay = (emp = {}) => safeFirstValue(
    emp.ngayNhanViec,
    emp.from,
    emp.start,
    emp.startDate,
    emp.ngayBatDau,
    emp.currentEmploymentBeginDate
  )
  const petEmp0Addr = employmentAddressParts(petEmp0, 'petEmpAddr0')
  // i-129f.html keeps only one built-in petitioner employment block.
  // Extra jobs are rendered dynamically in I129FWordPaper.vue from petitionerEmploymentRecords.

  const beneficiaryMailingAddressAnchor = 'In Care Of Name (Passport VN)'

  const mappingRows = [
    // --- PETITIONER GENERAL INFO ---
    { label: 'Alien Registration Number (A-Number) (if any)', val: '', after: 'THÔNG TIN CÁ NHÂN NGƯỜI BẢO LÃNH' },
    { label: 'USCIS Online Account Number (if any)', val: '', after: 'THÔNG TIN CÁ NHÂN NGƯỜI BẢO LÃNH' },
    { label: 'U.S. Social Security Number (if any)', val: safeFirstValue(petitionerSource.soSsn, data.soSsn), after: 'THÔNG TIN CÁ NHÂN NGƯỜI BẢO LÃNH' },
    { label: 'Select one box below to indicate the classification you are requesting for your beneficiary:', val: 'K1', after: 'THÔNG TIN CÁ NHÂN NGƯỜI BẢO LÃNH' },
    { label: 'If you are filing to classify your spouse as a K-3, have you filed Form I-130?', val: '', after: 'THÔNG TIN CÁ NHÂN NGƯỜI BẢO LÃNH' },

    // --- PETITIONER NAMES ---
    { label: 'Family Name (Last Name)', val: petName.family, after: 'Tên người bảo lãnh' },
    { label: 'Given Name (First Name)', val: petName.given, after: 'Tên người bảo lãnh' },
    { label: 'Middle Name', val: petName.middle, after: 'Tên người bảo lãnh' },

    // --- PETITIONER OTHER NAMES ---
    { label: 'Family Name (Last Name)', val: safeFirstValue(petitionerSource.tenGoiKhac_ho, data.tenGoiKhac_ho), after: 'Tên khác' },
    { label: 'Given Name (First Name)', val: safeFirstValue(petitionerSource.tenGoiKhac_ten, data.tenGoiKhac_ten), after: 'Tên khác' },
    { label: 'Middle Name', val: safeFirstValue(petitionerSource.tenGoiKhac_tenLot, data.tenGoiKhac_tenLot), after: 'Tên khác' },

    // --- PETITIONER MAILING ADDRESS ---
    {
      label: 'In Care Of Name (Passport US)',
      val: [
        safeFirstValue(petitionerSource.tenTrenGiayTo_ten, data.tenTrenGiayTo_ten),
        safeFirstValue(petitionerSource.tenTrenGiayTo_tenLot, data.tenTrenGiayTo_tenLot)
      ].filter(Boolean).join(' ') + (safeFirstValue(petitionerSource.tenTrenGiayTo_ho, data.tenTrenGiayTo_ho) ? ' | ' + safeFirstValue(petitionerSource.tenTrenGiayTo_ho, data.tenTrenGiayTo_ho) : ''),
      after: 'Địa chỉ nhận thư'
    },
    { label: 'Street Number and Name', val: safeFirstValue(petitionerSource.diaChiNhanThuMyStreet, petitionerFlatFallback.diaChiNhanThuMyStreet), after: 'Địa chỉ nhận thư' },
    { label: 'APT / STE / FLR', val: '', after: 'Địa chỉ nhận thư' },
    { label: 'City or Town', val: safeFirstValue(petitionerSource.diaChiNhanThuMyCity, petitionerFlatFallback.diaChiNhanThuMyCity), after: 'Địa chỉ nhận thư' },
    { label: 'State', val: safeFirstValue(petitionerSource.diaChiNhanThuMyProvince, petitionerFlatFallback.diaChiNhanThuMyProvince), after: 'Địa chỉ nhận thư' },
    { label: 'ZIP Code', val: safeFirstValue(petitionerSource.diaChiNhanThuMyZip, petitionerFlatFallback.diaChiNhanThuMyZip), after: 'Địa chỉ nhận thư' },
    { label: 'Province', val: '', after: 'Địa chỉ nhận thư' },
    { label: 'Postal Code', val: '', after: 'Địa chỉ nhận thư' },
    { label: 'Country', val: '', after: 'Địa chỉ nhận thư' },
    { label: 'Is your current mailing address the same as your physical address?', val: '', after: 'Địa chỉ nhận thư' },

    // --- PETITIONER PREVIOUS ADDRESSES ---
    { label: 'Street Number and Name (1)', val: safeFirstValue(petAddr0.diaChiStreet), after: 'Địa chỉ cũ' },
    { label: 'APT / STE / FLR', val: '', after: 'Street Number and Name (1)' },
    { label: 'City or Town', val: safeFirstValue(petAddr0.diaChiCity), after: 'Street Number and Name (1)' },
    { label: 'State', val: safeFirstValue(petAddr0.diaChiState), after: 'Street Number and Name (1)' },
    { label: 'ZIP Code', val: safeFirstValue(petAddr0.diaChiZip), after: 'Street Number and Name (1)' },
    { label: 'Province', val: '', after: 'Street Number and Name (1)' },
    { label: 'Postal Code', val: '', after: 'Street Number and Name (1)' },
    { label: 'Country', val: safeFirstValue(petAddr0.diaChiCountry), after: 'Street Number and Name (1)' },
    { label: 'Date From', val: safeFirstValue(petAddr0.ngayBatDau), after: 'Street Number and Name (1)' },
    { label: 'Date To', val: safeFirstValue(petAddr0.ngayChuyenDi) || (petAddr0.ngayBatDau ? 'PRESENT' : ''), after: 'Street Number and Name (1)' },

    { label: 'Street Number and Name (2)', val: safeFirstValue(petAddr1.diaChiStreet), after: 'Street Number and Name (1)' },
    { label: 'APT / STE / FLR', val: '', after: 'Street Number and Name (2)' },
    { label: 'City or Town', val: safeFirstValue(petAddr1.diaChiCity), after: 'Street Number and Name (2)' },
    { label: 'State', val: safeFirstValue(petAddr1.diaChiState), after: 'Street Number and Name (2)' },
    { label: 'ZIP Code', val: safeFirstValue(petAddr1.diaChiZip), after: 'Street Number and Name (2)' },
    { label: 'Province', val: '', after: 'Street Number and Name (2)' },
    { label: 'Postal Code', val: '', after: 'Street Number and Name (2)' },
    { label: 'Country', val: safeFirstValue(petAddr1.diaChiCountry), after: 'Street Number and Name (2)' },
    { label: 'Date From', val: safeFirstValue(petAddr1.ngayBatDau), after: 'Street Number and Name (2)' },
    { label: 'Date To', val: safeFirstValue(petAddr1.ngayChuyenDi) || (petAddr1.ngayBatDau ? 'PRESENT' : ''), after: 'Street Number and Name (2)' },

    // --- PETITIONER EMPLOYMENT ---
    { label: 'Full Name of Employe (1)', val: '', after: 'Việc Làm' },
    { label: 'Street Number and Name', val: '', after: 'Full Name of Employe (1)' },
    { label: 'APT / STE / FLR', val: '', after: 'Full Name of Employe (1)' },
    { label: 'City or Town', val: '', after: 'Full Name of Employe (1)' },
    { label: 'State', val: '', after: 'Full Name of Employe (1)' },
    { label: 'ZIP Code', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Province', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Postal Code', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Country', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Your Occupation (specify)', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Employment Start Date', val: '', after: 'Full Name of Employe (1)' },
    { label: 'Employment End Date', val: '', after: 'Full Name of Employe (1)' },


    // --- PETITIONER OTHER INFO ---
    { label: 'Gender', val: translateGender(safeFirstValue(petitionerSource.gioiTinh, data.gioiTinh)), after: 'Thông tin khác' },
    { label: 'Date of Birth', val: safeFirstValue(petitionerSource.ngaySinh, data.ngaySinh), after: 'Thông tin khác' },
    { label: 'Marital Status', val: translateMaritalStatus(safeFirstValue(petitionerSource.tinhTrangHonNhan, data.tinhTrangHonNhan)), after: 'Thông tin khác' },
    { label: 'City/Town/Village of Birth', val: safeFirstValue(petitionerSource.noiSinhCity, data.noiSinhCity), after: 'Thông tin khác' },
    { label: 'Province or State of Birth', val: safeFirstValue(petitionerSource.noiSinhProvince, data.noiSinhProvince), after: 'Thông tin khác' },
    { label: 'Country of Birth', val: safeFirstValue(petitionerSource.noiSinhCountry, data.noiSinhCountry), after: 'Thông tin khác' },

    // --- PETITIONER PARENTS ---
    { label: 'Family Name (Last Name) (1)', val: safeFirstValue(fatherName.family), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Given Name (First Name)', val: safeFirstValue(fatherName.given), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Middle Name', val: safeFirstValue(fatherName.middle), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Date of Birth', val: safeFirstValue(fatherRecord.ngaySinh), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Gender', val: fatherRecord.ten ? 'MALE' : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Country of Birth', val: fatherBirthPlace.country ? (knownCountryName(fatherBirthPlace.country) || fatherBirthPlace.country) : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'City/Town/Village of Residence', val: fatherResidence.city, after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Country of Residence', val: fatherResidence.country ? (knownCountryName(fatherResidence.country) || fatherResidence.country) : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },

    { label: 'Family Name (Last Name) (2)', val: safeFirstValue(motherName.family), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Given Name (First Name)', val: safeFirstValue(motherName.given), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Middle Name', val: safeFirstValue(motherName.middle), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Date of Birth', val: safeFirstValue(motherRecord.ngaySinh), after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Gender', val: motherRecord.ten ? 'FEMALE' : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Country of Birth', val: motherBirthPlace.country ? (knownCountryName(motherBirthPlace.country) || motherBirthPlace.country) : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'City/Town/Village of Residence', val: motherResidence.city, after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Country of Residence', val: motherResidence.country ? (knownCountryName(motherResidence.country) || motherResidence.country) : '', after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },

    // --- PETITIONER PREVIOUS SPOUSE ---
    { label: 'Have you ever been previously married?', val: petPreviouslyMarried, after: 'CHA MẸ VÀ HÔN NHÂN CŨ' },
    { label: 'Family Name (Last Name) (Spouse)', val: petFormerSpouse.family, after: 'Have you ever been previously married?' },
    { label: 'Given Name (First Name)', val: petFormerSpouse.given, after: 'Have you ever been previously married?' },
    { label: 'Middle Name', val: petFormerSpouse.middle, after: 'Have you ever been previously married?' },
    { label: 'Date Marriage Ended', val: petFormerSpouseEnded, after: 'Have you ever been previously married?' },

    // --- PETITIONER CITIZENSHIP STATUS ---
    { label: 'You are a U.S. citizen through', val: translateCitizenshipType(safeFirstValue(petitionerSource.dienQuocTich, data.dienQuocTich)), after: 'Tình Trạng cư trú' },
    { label: 'Have you obtained a Certificate of Naturalization or a Certificate of Citizenship in your own name?', val: safeFirstValue(petitionerSource.soChungNhanQuocTich, data.soChungNhanQuocTich) ? 'YES' : 'NO', after: 'Tình Trạng cư trú' },
    { label: 'Certificate Number', val: safeFirstValue(petitionerSource.soChungNhanQuocTich, data.soChungNhanQuocTich), after: 'Tình Trạng cư trú' },
    { label: 'Place of Issuance', val: safeFirstValue(petitionerSource.noiCapQuocTich, data.noiCapQuocTich), after: 'Tình Trạng cư trú' },
    { label: 'Date of Issuance', val: safeFirstValue(petitionerSource.ngayCapQuocTich, data.ngayCapQuocTich), after: 'Tình Trạng cư trú' },

    // --- PETITIONER SUPPLEMENTAL INFO ---
    { label: 'Have you ever filed Form I-129F for any other beneficiary?', val: '', after: 'Thông tin bổ sung' },
    { label: 'A-Number', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },
    { label: 'Family Name (Last Name) ( Spouse )', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },
    { label: 'Given Name (First Name)', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },
    { label: 'Middle Name', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },
    { label: 'Date of Filing', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },
    { label: 'What action did USCIS take on Form I-129F?', val: '', after: 'Have you ever filed Form I-129F for any other beneficiary?' },

    // --- PETITIONER CHILDREN & STATES ---
    { label: 'Do you have any children under 18 years of age?', val: asYesNo(safeFirstValue(petitionerSource.coConDuoi18Tuoi, data.coConDuoi18Tuoi)), after: 'Con cái' },
    { label: 'Age', val: child18_0 && child18_0.ngaySinh ? calculateAge(child18_0.ngaySinh) : '', after: 'Do you have any children under 18 years of age?' },
    { label: 'Age', val: child18_1 && child18_1.ngaySinh ? calculateAge(child18_1.ngaySinh) : '', after: 'Do you have any children under 18 years of age?' },
    
    { label: 'State (1)', val: safeFirstValue(petAddr0.diaChiState), after: 'Các bang đã sống ở Mỹ hoặc nước ngoài từ năm 18 tuổi tới hiện tại' },
    { label: 'Country', val: petAddr0.diaChiCountry ? (knownCountryName(petAddr0.diaChiCountry) || petAddr0.diaChiCountry) : '', after: 'State (1)' },
    { label: 'State (2)', val: safeFirstValue(petAddr1.diaChiState), after: 'State (1)' },
    { label: 'Country', val: petAddr1.diaChiCountry ? (knownCountryName(petAddr1.diaChiCountry) || petAddr1.diaChiCountry) : '', after: 'State (2)' },

    // ==========================================
    // === B. BENEFICIARY GENERAL INFO & NAMES ===
    // ==========================================
    { label: 'Family Name (Last Name)', val: benName.family, after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Given Name (First Name)', val: benName.given, after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Middle Name', val: benName.middle, after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Alien Registration Number (A-Number) (if any)', val: '', after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'USCIS Online Account Number (if any)', val: '', after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Date of Birth', val: safeFirstValue(beneficiarySource.ngaySinh, data.beneficiaryBirthDate), after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Gender', val: translateGender(safeFirstValue(beneficiarySource.gioiTinh, data.beneficiaryGender)), after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'Marital Status', val: translateMaritalStatus(safeFirstValue(beneficiarySource.tinhTrangHonNhan, data.beneficiaryMaritalStatus)), after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    { label: 'City/Town/Village of Birth', val: safeFirstValue(beneficiarySource.noiSinhCity, data.beneficiaryBirthPlaceCity, beneficiaryBirthPlace.city), after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },
    {
      label: 'Country of Birth',
      val: (() => {
        const c = safeFirstValue(beneficiarySource.noiSinhCountry, data.beneficiaryBirthPlaceCountry, beneficiaryBirthPlace.country)
        return c ? (knownCountryName(c) || c) : ''
      })(),
      after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH'
    },
    { label: 'Country of Citizenship or Nationality', val: '', after: 'B. THÔNG TIN CÁ NHÂN NGƯỜI ĐƯỢC BẢO LÃNH' },

    // --- BENEFICIARY OTHER NAMES ---
    { label: 'Family Name (Last Name)', val: safeFirstValue(beneficiarySource.tenGoiKhac_ho, data.beneficiaryOtherFamilyName), after: 'Tên khác' },
    { label: 'Given Name (First Name)', val: safeFirstValue(beneficiarySource.tenGoiKhac_ten, data.beneficiaryOtherGivenName), after: 'Tên khác' },
    { label: 'Middle Name', val: safeFirstValue(beneficiarySource.tenGoiKhac_tenLot, data.beneficiaryOtherMiddleName), after: 'Tên khác' },

    // --- BENEFICIARY MAILING ADDRESS ---
    { label: beneficiaryMailingAddressAnchor, val: safeFirstValue(beneficiarySource.tenTrenGiayTo, data.beneficiaryFullName, nameText(beneficiarySource)), after: 'Địa chỉ nhận thư' },
    { label: 'Street Number and Name', val: safeFirstValue(beneficiarySource.diaChiNhanThuVNStreet, data.beneficiaryMailingAddressStreet, beneficiaryFlatFallback.diaChiNhanThuVNStreet, benMailingAddr.street), after: beneficiaryMailingAddressAnchor },
    { label: 'APT / STE / FLR', val: safeFirstValue(beneficiarySource.diaChiNhanThuVNLine2, data.beneficiaryMailingAddressLine2, beneficiaryFlatFallback.diaChiNhanThuVNLine2, benMailingAddr.line2), after: beneficiaryMailingAddressAnchor },
    { label: 'City or Town', val: safeFirstValue(beneficiarySource.diaChiNhanThuVNCity, data.beneficiaryMailingAddressCity, beneficiaryFlatFallback.diaChiNhanThuVNCity, benMailingAddr.city), after: beneficiaryMailingAddressAnchor },
    { label: 'State', val: '', after: beneficiaryMailingAddressAnchor },
    { label: 'ZIP Code', val: safeFirstValue(beneficiarySource.diaChiNhanThuVNZip, beneficiarySource.diaChiNhanThuVNZipCode, data.beneficiaryMailingAddressZip, data.beneficiaryMailingAddressZipCode, beneficiaryFlatFallback.diaChiNhanThuVNZip, beneficiaryFlatFallback.diaChiNhanThuVNZipCode, benMailingAddr.zip), after: beneficiaryMailingAddressAnchor },
    { label: 'Province', val: safeFirstValue(beneficiarySource.diaChiNhanThuVNProvince, data.beneficiaryMailingAddressProvince, beneficiaryFlatFallback.diaChiNhanThuVNProvince, benMailingAddr.province), after: beneficiaryMailingAddressAnchor },
    { label: 'Postal Code', val: '', after: beneficiaryMailingAddressAnchor },
    {
      label: 'Country',
      val: (() => {
        const c = safeFirstValue(beneficiarySource.diaChiNhanThuVNCountry, beneficiarySource.diaChiNhanThuVnCountry, data.beneficiaryMailingAddressCountry, beneficiaryFlatFallback.diaChiNhanThuVNCountry, benMailingAddr.country)
        return c ? (knownCountryName(c) || c) : ''
      })(),
      after: beneficiaryMailingAddressAnchor
    },

    // --- BENEFICIARY CURRENT/PREVIOUS ADDRESSES ---
    { label: 'Street Number and Name (hiện tại)', val: safeFirstValue(benAddr0.diaChiStreet), after: 'Địa chỉ ở hiện tại và cũ' },
    { label: 'APT / STE / FLR', val: '', after: 'Street Number and Name (hiện tại)' },
    { label: 'City or Town', val: safeFirstValue(benAddr0.diaChiCity), after: 'Street Number and Name (hiện tại)' },
    { label: 'State', val: '', after: 'Street Number and Name (hiện tại)' },
    { label: 'ZIP Code', val: safeFirstValue(benAddr0.diaChiZip), after: 'Street Number and Name (hiện tại)' },
    { label: 'Province', val: safeFirstValue(benAddr0.diaChiProvince), after: 'Street Number and Name (hiện tại)' },
    { label: 'Postal Code', val: '', after: 'Street Number and Name (hiện tại)' },
    {
      label: 'Country',
      val: benAddr0.diaChiCountry ? (knownCountryName(benAddr0.diaChiCountry) || benAddr0.diaChiCountry) : (benAddr0.diaChi ? 'VIETNAM' : ''),
      after: 'Street Number and Name (hiện tại)'
    },
    { label: 'Date From', val: safeFirstValue(benAddr0.ngayBatDau), after: 'Street Number and Name (hiện tại)' },
    { label: 'Date To', val: safeFirstValue(benAddr0.ngayChuyenDi) || (benAddr0.ngayBatDau ? 'PRESENT' : ''), after: 'Street Number and Name (hiện tại)' },

    { label: 'Street Number and Name', val: safeFirstValue(benAddr1.diaChiStreet), after: 'Street Number and Name (hiện tại)' },
    { label: 'APT / STE / FLR', val: '', after: 'Street Number and Name' },
    { label: 'City or Town', val: safeFirstValue(benAddr1.diaChiCity), after: 'Street Number and Name' },
    { label: 'State', val: '', after: 'Street Number and Name' },
    { label: 'ZIP Code', val: safeFirstValue(benAddr1.diaChiZip), after: 'Street Number and Name' },
    { label: 'Province', val: safeFirstValue(benAddr1.diaChiProvince), after: 'Street Number and Name' },
    { label: 'Postal Code', val: '', after: 'Street Number and Name' },
    {
      label: 'Country',
      val: benAddr1.diaChiCountry ? (knownCountryName(benAddr1.diaChiCountry) || benAddr1.diaChiCountry) : (benAddr1.diaChi ? 'VIETNAM' : ''),
      after: 'Street Number and Name'
    },
    { label: 'Date From', val: safeFirstValue(benAddr1.ngayBatDau), after: 'Street Number and Name' },
    { label: 'Date To', val: safeFirstValue(benAddr1.ngayChuyenDi), after: 'Street Number and Name' },

    // --- BENEFICIARY EMPLOYMENT ---
    // Tất cả field trong block này phải neo theo section "Lịch Sử Công Việc".
    // Không neo theo "Full Name of Employer (2)" vì nhãn này cũng xuất hiện ở phần Việc Làm
    // của người bảo lãnh, làm data người được bảo lãnh nhảy lên trên.
    { label: 'Full Name of Employer (1)', val: safeFirstValue(benEmp0.tenCongTy, benEmp0.employerName, benEmp0.companyName, benEmp0.currentEmployerName), after: 'Lịch Sử Công Việc' },
    { label: 'Street Number and Name', val: safeFirstValue(benEmp0.diaChiStreet, benEmp0.diaChiLine1, benEmp0.street, benEmp0.addressLine1), after: 'Lịch Sử Công Việc' },
    { label: 'APT / STE / FLR', val: safeFirstValue(benEmp0.diaChiLine2, benEmp0.line2, benEmp0.addressLine2), after: 'Lịch Sử Công Việc' },
    { label: 'City or Town', val: safeFirstValue(benEmp0.diaChiCity, benEmp0.city, benEmp0.addressCity, benEmp0.companyAddressCity), after: 'Lịch Sử Công Việc' },
    { label: 'State', val: employmentState(benEmp0), after: 'Lịch Sử Công Việc' },
    { label: 'ZIP Code', val: employmentZip(benEmp0), after: 'Lịch Sử Công Việc' },
    { label: 'Province', val: employmentProvince(benEmp0), after: 'Lịch Sử Công Việc' },
    { label: 'Postal Code', val: employmentPostalCode(benEmp0), after: 'Lịch Sử Công Việc' },
    { label: 'Country', val: normalizeEmploymentCountry(benEmp0), after: 'Lịch Sử Công Việc' },
    { label: 'Beneficiary’s Occupation (specify)', val: safeFirstValue(benEmp0.ngheNghiep, benEmp0.occupation, benEmp0.jobTitle, benEmp0.chucVu), after: 'Lịch Sử Công Việc' },
    { label: 'Employment Start Date', val: safeFirstValue(benEmp0.ngayNhanViec, benEmp0.from, benEmp0.start, benEmp0.startDate, benEmp0.ngayBatDau), after: 'Lịch Sử Công Việc' },
    { label: 'Employment End Date', val: employmentEndDateDisplay(benEmp0), after: 'Lịch Sử Công Việc' },

    { label: 'Full Name of Employer (2)', val: safeFirstValue(benEmp1.tenCongTy, benEmp1.employerName, benEmp1.companyName, benEmp1.currentEmployerName), after: 'Lịch Sử Công Việc' },
    { label: 'Street Number and Name', val: safeFirstValue(benEmp1.diaChiStreet, benEmp1.diaChiLine1, benEmp1.street, benEmp1.addressLine1), after: 'Lịch Sử Công Việc' },
    { label: 'APT / STE / FLR', val: safeFirstValue(benEmp1.diaChiLine2, benEmp1.line2, benEmp1.addressLine2), after: 'Lịch Sử Công Việc' },
    { label: 'City or Town', val: safeFirstValue(benEmp1.diaChiCity, benEmp1.city, benEmp1.addressCity, benEmp1.companyAddressCity), after: 'Lịch Sử Công Việc' },
    { label: 'State', val: employmentState(benEmp1), after: 'Lịch Sử Công Việc' },
    { label: 'ZIP Code', val: employmentZip(benEmp1), after: 'Lịch Sử Công Việc' },
    { label: 'Province', val: employmentProvince(benEmp1), after: 'Lịch Sử Công Việc' },
    { label: 'Postal Code', val: employmentPostalCode(benEmp1), after: 'Lịch Sử Công Việc' },
    { label: 'Country', val: normalizeEmploymentCountry(benEmp1), after: 'Lịch Sử Công Việc' },
    { label: 'Beneficiary’s Occupation (specify)', val: safeFirstValue(benEmp1.ngheNghiep, benEmp1.occupation, benEmp1.jobTitle, benEmp1.chucVu), after: 'Lịch Sử Công Việc' },
    { label: 'Employment Start Date', val: safeFirstValue(benEmp1.ngayNhanViec, benEmp1.from, benEmp1.start, benEmp1.startDate, benEmp1.ngayBatDau), after: 'Lịch Sử Công Việc' },
    { label: 'Employment End Date', val: employmentEndDateDisplay(benEmp1), after: 'Lịch Sử Công Việc' },

    // --- BENEFICIARY PARENTS ---
    // Cha/mẹ của NGƯỜI ĐƯỢC BẢO LÃNH: neo sau section "Lịch Sử Công Việc" để tránh nhảy lên section "CHA MẸ VÀ HÔN NHÂN CŨ" của người bảo lãnh.
    { label: 'Family Name (Last Name) (1)', val: beneficiaryFatherName.family, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Given Name (First Name)', val: beneficiaryFatherName.given, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Middle Name', val: beneficiaryFatherName.middle, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Date of Birth', val: safeFirstValue(beneficiaryFatherRecord.ngaySinh, beneficiaryFatherRecord.birthDate, beneficiaryFatherRecord.dateOfBirth), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Gender', val: hasRecordValue(beneficiaryFatherRecord) ? 'MALE' : '', after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Country of Birth', val: parentBirthCountryNoInfer(beneficiaryFatherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'City/Town/Village of Residence', val: parentResidenceCity(beneficiaryFatherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Country of Residence', val: normalizeParentResidenceCountry(beneficiaryFatherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },

    { label: 'Family Name (Last Name) (2)', val: beneficiaryMotherName.family, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Given Name (First Name)', val: beneficiaryMotherName.given, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Middle Name', val: beneficiaryMotherName.middle, after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Date of Birth', val: safeFirstValue(beneficiaryMotherRecord.ngaySinh, beneficiaryMotherRecord.birthDate, beneficiaryMotherRecord.dateOfBirth), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Gender', val: hasRecordValue(beneficiaryMotherRecord) ? 'FEMALE' : '', after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Country of Birth', val: parentBirthCountryNoInfer(beneficiaryMotherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'City/Town/Village of Residence', val: parentResidenceCity(beneficiaryMotherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },
    { label: 'Country of Residence', val: normalizeParentResidenceCountry(beneficiaryMotherRecord), after: 'Lịch Sử Công Việc', strictAfter: true },

    // --- BENEFICIARY PREVIOUS SPOUSE ---
    // Chỉ lấy tình trạng hôn nhân và hôn nhân cũ từ beneficiaryData/nguoiDuocBaoLanh.
    // Không lấy data.tinhTrangHonNhan/honNhanCu phẳng vì dễ nhảy sang người bảo lãnh.
    // Neo toàn bộ block theo section "Hôn nhân trước" để tránh nhầm với block previous marriage của người bảo lãnh.
    { label: 'Have you ever been previously married?', val: benPreviouslyMarried, after: 'Hôn nhân trước', strictAfter: true },
    { label: 'Family Name (Last Name) ( Spouse )', val: benPreviouslyMarried === 'YES' ? benFormerSpouse.family : '', after: 'Hôn nhân trước', strictAfter: true },
    { label: 'Given Name (First Name)', val: benPreviouslyMarried === 'YES' ? benFormerSpouse.given : '', after: 'Hôn nhân trước', strictAfter: true },
    { label: 'Middle Name', val: benPreviouslyMarried === 'YES' ? benFormerSpouse.middle : '', after: 'Hôn nhân trước', strictAfter: true },
    { label: 'Date Marriage Ended', val: benFormerSpouseEnded, after: 'Hôn nhân trước', strictAfter: true },

    // --- BENEFICIARY TRAVEL HISTORY ---
    { label: 'Has your beneficiary ever been in the United States?', val: beneficiaryEverBeenInUS, after: 'Đã từng tới Mỹ', strictAfter: true },
    { label: 'He or she last entered as a', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'I-94 Arrival-Departure Record Number', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Date of Arrival', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Date authorized stay expired or will expire as shown on Form I-94 or I-95', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Passport Number', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Travel Document Number', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Country of Issuance for Passport or Travel Document', val: '', after: 'Đã từng tới Mỹ' },
    { label: 'Expiration Date for Passport or Travel Document', val: '', after: 'Đã từng tới Mỹ' },

    // --- BENEFICIARY CHILDREN ---
    // Con cái của NGƯỜI ĐƯỢC BẢO LÃNH: neo sau section "Đã từng tới Mỹ" để không nhảy lên phần Con cái của người bảo lãnh.
    { label: 'Does your beneficiary have any children?', val: beneficiaryHasChildren, after: 'Đã từng tới Mỹ', strictAfter: true },
    { label: 'Family Name (Last Name)', val: beneficiaryHasChildren === 'YES' ? benChild1.family : '', after: 'Does your beneficiary have any children?' },
    { label: 'Given Name (First Name)', val: beneficiaryHasChildren === 'YES' ? benChild1.given : '', after: 'Does your beneficiary have any children?' },
    { label: 'Middle Name', val: beneficiaryHasChildren === 'YES' ? benChild1.middle : '', after: 'Does your beneficiary have any children?' },
    { label: 'Country of Birth', val: beneficiaryHasChildren === 'YES' && benChild1BirthCountry ? (knownCountryName(benChild1BirthCountry) || benChild1BirthCountry) : '', after: 'Does your beneficiary have any children?' },
    { label: 'Date of Birth', val: beneficiaryHasChildren === 'YES' ? benChild1BirthDate : '', after: 'Does your beneficiary have any children?' },
    { label: 'Does this child reside with your beneficiary?', val: beneficiaryHasChildren === 'YES' ? benChild1Resides : '', after: 'Does your beneficiary have any children?' },
    { label: 'Street Number and Name', val: beneficiaryHasChildren === 'YES' ? safeFirstValue(pickObjectValue(beneficiaryChild1Record, 'diaChiStreet', 'diaChiLine1', 'street', 'addressLine1'), benChild1Addr.street) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'APT / STE / FLR', val: beneficiaryHasChildren === 'YES' ? safeFirstValue(pickObjectValue(beneficiaryChild1Record, 'diaChiLine2', 'apt', 'suite', 'floor', 'addressLine2'), benChild1Addr.line2) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'City or Town', val: beneficiaryHasChildren === 'YES' ? safeFirstValue(pickObjectValue(beneficiaryChild1Record, 'diaChiCity', 'city', 'addressCity'), benChild1Addr.city) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'State', val: beneficiaryHasChildren === 'YES' ? childResidenceState(beneficiaryChild1Record, benChild1Addr) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'ZIP Code', val: beneficiaryHasChildren === 'YES' ? childResidenceZip(beneficiaryChild1Record, benChild1Addr) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'Province', val: beneficiaryHasChildren === 'YES' ? childResidenceProvince(beneficiaryChild1Record, benChild1Addr) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'Postal Code', val: beneficiaryHasChildren === 'YES' ? childResidencePostalCode(beneficiaryChild1Record, benChild1Addr) : '', after: 'Does this child reside with your beneficiary?' },
    { label: 'Country', val: beneficiaryHasChildren === 'YES' ? normalizeChildResidenceCountry(beneficiaryChild1Record, benChild1Addr) : '', after: 'Does this child reside with your beneficiary?' },

    // --- BENEFICIARY FOREIGN PHYSICAL ADDRESS ---
    // Theo yêu cầu mới: không truyền data cho section này, giữ trống toàn bộ.
    // Vẫn force blank để nếu mapping cũ/giá trị cũ đã fill thì bị xóa khỏi ô này.
    { label: 'Street Number and Name', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'APT / STE / FLR', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'City or Town', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'Province', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'Postal Code', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'Country', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },
    { label: 'Daytime Telephone Number', val: '', after: 'Địa chỉ thực của người được bảo lãnh của bạn ở nước ngoài', strictAfter: true, force: true },

    // --- INTENDED US ADDRESS & TELEPHONE ---
    // Nơi dự định ở của 2 đương đơn: lấy từ beneficiaryData.diaChiDuDinhSongMy*.
    // Nếu có địa chỉ mà country trống thì mặc định USA; chỉ fill State/ZIP, không fill Province/Postal Code.
    { label: 'Street Number and Name', val: intendedUsStreet, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'APT / STE / FLR', val: intendedUsApt, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'City or Town', val: intendedUsCity, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'State', val: intendedUsState, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'ZIP Code', val: intendedUsZip, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'Country', val: intendedUsCountry, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },
    { label: 'Daytime Telephone Number', val: intendedUsDaytimePhone, after: 'Nơi dự định ở của 2 đương đơn', strictAfter: true },

    // --- BENEFICIARY NATIVE LANGUAGE & PHYSICAL ADDRESS ---
    // Theo yêu cầu mới: không truyền data cho section này, giữ trống toàn bộ.
    { label: 'Family Name (Last Name)', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Given Name (First Name)', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Middle Name', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Street Number and Name', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'APT / STE / FLR', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'City or Town', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Province', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Postal Code', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },
    { label: 'Country', val: '', after: 'Tên và địa chỉ người được bảo lãnh theo ngôn ngữ mẹ đẻ', strictAfter: true, force: true },


    // ===================================
    // === RELATIONSHIP & EMBASSY INFO ===
    // ===================================
    { label: 'Is your fiancé(e) related to you? (có là họ hàng không?)', val: '', after: 'Thông tin mối quan hệ' },
    { label: 'Provide the nature and degree of relationship (for example, third cousin or maternal uncle)', val: '', after: 'Is your fiancé(e) related to you?' },
    { label: 'Have you and your fiancé(e) met in person during the two years immediately before filing this petition?', val: '', after: 'Is your fiancé(e) related to you?' },
    { label: 'Liệt kê các mốc thời gian của 2 đương đơn quen nhau', val: '', after: 'Is your fiancé(e) related to you?' },

    // --- IMB INFO ---
    { label: 'Did you meet your beneficiary through the services of an IMB?', val: '', after: 'Thông tin về công ty giới thiệu 2 đương đơn với nhau' },
    { label: 'IMB’s Name (if any)', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Family Name of IMB (Last Name)', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Given Name of IMB (First Name)', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Organization Name of IMB', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Website of IMB', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Street Number and Name', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'APT / STE / FLR', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'City or Town', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Province', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Postal Code', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Country', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },
    { label: 'Daytime Telephone Number', val: '', after: 'Did you meet your beneficiary through the services of an IMB?' },

    // --- EMBASSY/CONSULATE ---
    { label: 'City or Town', val: '', after: 'Lãnh Sự Quán gửi Người được bảo lãnh nộp đơn xin thị thực' },
    { label: 'Country', val: '', after: 'Lãnh Sự Quán gửi Người được bảo lãnh nộp đơn xin thị thực' },


    // ===================================
    // === C. CRIMINAL HISTORY & BIO ===
    // ===================================
    { label: 'Have you EVER been subject to temporary orperrnament protection or restraining order (either civil or criminal)', val: petitionerCriminalHistoryAnswer, after: 'Thông tin về tiền sử bị kết án', strictAfter: true },
    { label: 'Domestic violence, sexual assault, child abuse, dating violence, elder abuse, child neglect, stalking or an attempt to commit any of these crimes?', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'Homicide, murder, manslaughter, rape, abusive sexual contact, sexual exploitation, incest, torture, trafficking, peonage, holding hostage, involuntary,… or an attempt to commit one of these crimes?', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'Three or more arrests or convictions, not from a single act, for crimes relating to a controlled substance or acohol?', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'I was acting in self-defense', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'I violated a protection order in issued for my own protection', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'I committed, was arrested for, was convicted of, or pled guility to a crime that did not result in serious bodily injury and there was a connection between the crime and me having been battered or subjected to extreme cruelty', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'Have you ever been arrested, cited, charged, indicted, conviected, fined, or imprisoned for breaking or violating any law or ordinance in any country, excluding traffic violations (unless a traffic violation was alcohol or drug related or involed a fine or $500 or more)?', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },
    { label: 'Cung cấp thông tin về những lần bị kết án', val: '', after: 'Have you EVER been subject to temporary orperrnament protection' },

    // --- BIOMETRICS ---
    { label: 'Ethnicity', val: petitionerEthnicity, after: 'Cung cấp thông tin về những lần bị kết án' },
    { label: 'Race', val: petitionerRace, after: 'Cung cấp thông tin về những lần bị kết án' },
    { label: 'Height', val: petitionerHeight, after: 'Cung cấp thông tin về những lần bị kết án' },
    { label: 'Weight', val: petitionerWeight, after: 'Cung cấp thông tin về những lần bị kết án' },
    { label: 'Eye Color', val: petitionerEyeColor, after: 'Cung cấp thông tin về những lần bị kết án' },
    { label: 'Hair Color', val: petitionerHairColor, after: 'Cung cấp thông tin về những lần bị kết án' },

    // --- PETITIONER EMPLOYMENT ---
    // Tất cả field trong block này phải neo theo section "Việc Làm" để không bị lấy
    // nhầm các nhãn giống nhau ở phần Lịch Sử Công Việc của người được bảo lãnh.
    { label: 'Full Name of Employe (1)', val: employmentEmployerName(petEmp0), after: 'Việc Làm' },
    { label: 'Street Number and Name', val: safeFirstValue(petEmp0.diaChiStreet, petEmp0.street, petEmp0.addressLine1, petEmp0.companyAddressStreet, petEmp0Addr.street), after: 'Việc Làm' },
    { label: 'APT / STE / FLR', val: '', after: 'Việc Làm' },
    { label: 'City or Town', val: safeFirstValue(petEmp0.diaChiCity, petEmp0.city, petEmp0.addressCity, petEmp0.companyAddressCity, petEmp0Addr.city), after: 'Việc Làm' },
    { label: 'State', val: safeFirstValue(employmentState(petEmp0), isEmploymentUSA(petEmp0) ? petEmp0Addr.province : ''), after: 'Việc Làm' },
    { label: 'ZIP Code', val: safeFirstValue(employmentZip(petEmp0), isEmploymentUSA(petEmp0) ? petEmp0Addr.zip : ''), after: 'Việc Làm' },
    { label: 'Province', val: safeFirstValue(employmentProvince(petEmp0), !isEmploymentUSA(petEmp0) ? petEmp0Addr.province : ''), after: 'Việc Làm' },
    { label: 'Postal Code', val: safeFirstValue(employmentPostalCode(petEmp0), !isEmploymentUSA(petEmp0) ? petEmp0Addr.zip : ''), after: 'Việc Làm' },
    { label: 'Country', val: safeFirstValue(normalizeEmploymentCountry(petEmp0), petEmp0Addr.country), after: 'Việc Làm' },
    { label: 'Your Occupation (specify)', val: employmentOccupation(petEmp0), after: 'Việc Làm' },
    { label: 'Employment Start Date', val: employmentStartDateDisplay(petEmp0), after: 'Việc Làm' },
    { label: 'Employment End Date', val: employmentEndDateDisplay(petEmp0), after: 'Việc Làm' },

    { label: 'Petitioner’s Signature', val: '', after: 'Chữ kí người bảo lãnh' },
    { label: 'Date of Signature', val: '', after: 'Chữ kí người bảo lãnh' },

    // --- PETITIONER CONTACT ---
    // Thông tin liên hệ người bảo lãnh: lấy từ petitionerData/nguoiBaoLanh.
    { label: "Petitioner's Daytime Telephone Number", val: petitionerContactPhone, after: 'Thông tin liên hệ người bảo lãnh', strictAfter: true },
    { label: "Petitioner's Mobile Telephone Number (if any)", val: petitionerContactPhone, after: 'Thông tin liên hệ người bảo lãnh', strictAfter: true },
    { label: "Petitioner's Email Address (if any)", val: petitionerContactEmail, after: 'Thông tin liên hệ người bảo lãnh', strictAfter: true },

    // --- INTERPRETER CONTACT ---
    { label: 'Interpreter’s family name (last name)', val: '', after: 'Thông tin người phiên dịch' },
    { label: 'Interpreter’s given name (first name)', val: '', after: 'Thông tin người phiên dịch' },
    { label: 'Interpreter’s Business or Organization name (if any)', val: '', after: 'Thông tin người phiên dịch' },
    
    { label: 'Street Number and Name', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'APT/STE/FLR', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'City or Town', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'State', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'ZIP Code', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'Province', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'Postal Code', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    { label: 'Country', val: '', after: 'Địa chỉ nhận thư của người phiên dịch' },
    
    { label: 'Interpreter’s Daytime Telephone Number', val: '', after: 'Thông tin liên hệ người phiên dịch' },
    { label: 'Interpreter’s Mobile Telephone Number (if any)', val: '', after: 'Thông tin liên hệ người phiên dịch' },
    { label: 'Interpreter’s Email Address (if any)', val: '', after: 'Thông tin liên hệ người phiên dịch' },
    { label: 'Interpreter’s Signature', val: '', after: 'Chữ kí người phiên dịch' },
    { label: 'Date of Signature', val: '', after: 'Chữ kí người phiên dịch' },

    // --- PREPARER CONTACT ---
    { label: 'Preparer’s Family Name (Last Name)', val: '', after: 'Thông tin người chuẩn bị' },
    { label: 'Preparer’s Given Name (First Name)', val: '', after: 'Thông tin người chuẩn bị' },
    { label: 'Preparer’s Business or Organization Name (if any)', val: '', after: 'Thông tin người chuẩn bị' },
    
    { label: 'Street Number and Name', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'APT/STE/FLR', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'City or Town', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'State', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'ZIP Code', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'Province', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'Postal Code', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    { label: 'Country', val: '', after: 'Địa chỉ nhận thư của người chuẩn bị' },
    
    { label: 'Preparerer’s Daytime Telephone Number', val: '', after: 'Thông tin liên hệ người chuẩn bị' },
    { label: 'Preparer’s Mobile Telephone Number (if any)', val: '', after: 'Thông tin liên hệ người chuẩn bị' },
    { label: 'Preparer’s Email Address (if any)', val: '', after: 'Thông tin liên hệ người chuẩn bị' },
    { label: 'Preparer’s Signature', val: '', after: 'Chữ kí người chuẩn bị' },
    { label: 'Date of Signature', val: '', after: 'Chữ kí người chuẩn bị' }
  ]

  mappingRows.push({
    meta: 'i129fPetitionerEmploymentRecords',
    records: petitionerEmploymentRecords
  })

  mappingRows.push({
    meta: 'i129fBeneficiaryAddressRecords',
    records: beneficiaryAddressRecords
  })

  mappingRows.push({
    meta: 'i129fBeneficiaryEmploymentRecords',
    records: beneficiaryEmploymentRecords
  })

  return mappingRows
}
