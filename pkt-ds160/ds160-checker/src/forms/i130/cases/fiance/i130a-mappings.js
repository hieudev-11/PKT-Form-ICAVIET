import {
  optionKey, normalizeRelationshipText, firstItem, hasRecordValue, countRecords, itemFromLists, translateCitizenshipType, isVNDistrictOrCity, isVNCommuneOrWard, addressLooksUS, isUSStateCode, isUSZipCode, isLocalAddressPart, joinAddressLine, translateGender, translateEthnicity, translateRace, translateColor, translateImmigrationStatus, formatHeight, formatWeight
} from '../../shared/i130a-mappings-base.js'

export function buildI130AMappings(data = {}, helpers = {}) {
  const {
    firstValue,
    splitAddr,
    toUpperNoAccent,
    isAffirmativeValue
  } = helpers

  const safeFirstValue = typeof firstValue === 'function' ? firstValue : (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''
  const safeToUpperNoAccent = typeof toUpperNoAccent === 'function' ? toUpperNoAccent : (value) => String(value || '').trim().toUpperCase()
  const safeIsAffirmativeValue = typeof isAffirmativeValue === 'function' ? isAffirmativeValue : (value) => ['YES', 'Y', 'TRUE', '1', 'CO', 'CÓ'].includes(safeToUpperNoAccent(value))
  let safeSplitAddr = typeof splitAddr === 'function'
    ? splitAddr
    : () => ({ street: '', line2: '', city: '', province: '', state: '', zip: '', country: '' })

  const pickObjectValue = (source, ...keys) => {
    if (!source || typeof source !== 'object') return ''
    return safeFirstValue(...keys.map(key => source[key]))
  }

  const nameText = (value) => {
    if (Array.isArray(value)) return nameText(firstItem(value))
    if (value && typeof value === 'object') {
      const fullName = safeFirstValue(
        value.fullName,
        value.full_name,
        value.hoTen,
        value.tenTrenGiayTo
      )
      const family = safeFirstValue(value.familyName, value.lastName, value.surname, value.family, value.ho, value.ten_ho)
      const middle = safeFirstValue(value.middleName, value.middle, value.tenDem, value.tenLot, value.ten_tenLot)
      const given = safeFirstValue(value.givenName, value.firstName, value.given, value.ten_ten, value.ten)

      if (family || middle || given) {
        const givenText = String(given || '').replace(/\s+/g, ' ').trim()
        const givenKey = safeToUpperNoAccent(givenText)
        const familyKey = safeToUpperNoAccent(family)
        const familyMiddleKey = safeToUpperNoAccent([family, middle].filter(Boolean).join(' '))
        const givenLooksLikeFullName = givenText.includes(' ') && (
          !family ||
          (!!familyMiddleKey && givenKey.startsWith(`${familyMiddleKey} `)) ||
          (!!familyKey && givenKey.startsWith(`${familyKey} `))
        )

        return safeFirstValue(
          fullName,
          givenLooksLikeFullName ? givenText : '',
          [family, middle, given].filter(Boolean).join(' ')
        )
      }

      return safeFirstValue(
        fullName,
        value.name,
        value.ten
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


  const getChildRelationshipDescription = () => safeFirstValue(
    data.bestDescribesRelationship,
    data.whichBestDescribesRelationship,
    data.childRelationshipDescription,
    data.childRelationshipType,
    data.childBestRelationship,
    data.relationshipDescriptionToBeneficiary,
    data.childRelationshipToPetitionerDetail
  )

  const getParentRelationshipDetail = () => safeFirstValue(
    data.stepchildOrStepparent,
    data.parentRelationshipDetail,
    data.parentRelationshipType,
    data.whichBestDescribesRelationshipParent,
    data.bestDescribesParentRelationship,
    data.whichBestDescribesRelationship,
    data.bestDescribesRelationship
  )

  const getSiblingRelationshipType = () => safeFirstValue(
    data.siblingRelationshipType,
    data.brotherOrSister,
    data.whichSiblingRelationship,
    data.siblingType,
    data.relationshipToBeneficiarySibling,
    data.relationshipDetail
  )

  const getSiblingAdoption = () => safeFirstValue(
    data.siblingRelatedByAdoption,
    data.relatedByAdoption,
    data.areYouRelatedByAdoption,
    data.siblingAdoption,
    data.adoptionRelationship
  )

  const getPetitionRelationship = () => {
    const raw = safeFirstValue(
      data.petitionRelationship,
      data.petitionRelationshipLabel,
      data.loaiHoSoBaoLanh,
      data.dienBaoLanh,
      data.loaiHoSo,
      data.relationshipToPetitioner,
      data.relationship,
      data.caseType,
      data.petitionType,
      data.formCategory,
      data.category
    )
    const normalized = normalizeRelationshipText(raw)

    if (!normalized) return 'SPOUSE'
    if (normalized.includes('vo chong') || normalized.includes('spouse') || normalized.includes('wife') || normalized.includes('husband') || normalized.includes('cr1') || normalized.includes('ir1')) return 'SPOUSE'
    if (normalized.includes('con gai') || normalized.includes('con cai') || normalized.includes('child') || normalized.includes('son') || normalized.includes('daughter')) return 'CHILD'
    if (normalized.includes('cha me') || normalized.includes('parent') || normalized.includes('father') || normalized.includes('mother')) return 'PARENT'
    if (normalized.includes('anh chi em') || normalized.includes('sibling') || normalized.includes('brother') || normalized.includes('sister')) return 'SIBLING'
    if (normalized.includes('hon phu') || normalized.includes('hon the') || normalized.includes('fiance') || normalized.includes('fiancee')) return 'FIANCE/FIANCEE'

    return safeToUpperNoAccent(raw)
  }

  const COMMON_VN_FAMILIES = new Set([
    'NGUYEN', 'TRAN', 'LE', 'PHAM', 'HUYNH', 'HOANG', 'PHAN', 'VU', 'VO',
    'DANG', 'BUI', 'DO', 'HO', 'NGO', 'DUONG', 'LY', 'TRINH', 'VUONG',
    'MAI', 'QUACH', 'LAM', 'DIEP', 'KIM', 'TA', 'HA', 'TON'
  ])

  const splitVNName = (...values) => {
    const raw = safeFirstValue(...values)
    const clean = safeToUpperNoAccent(raw).replace(/\s+/g, ' ').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { family: '', middle: '', given: '' }
    if (parts.length === 1) return { family: '', middle: '', given: parts[0] }

    const cleanParts = parts.map(p => {
      return String(p || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toUpperCase()
    })

    const firstWord = cleanParts[0]
    const lastWord = cleanParts[cleanParts.length - 1]
    const firstIsFamily = COMMON_VN_FAMILIES.has(firstWord)
    const lastIsFamily = COMMON_VN_FAMILIES.has(lastWord)

    const isWesternOrder = lastIsFamily && !firstIsFamily

    if (parts.length === 2) {
      return isWesternOrder
        ? { family: parts[1], middle: '', given: parts[0] }
        : { family: parts[0], middle: '', given: parts[1] }
    }

    if (isWesternOrder) {
      return {
        family: parts[parts.length - 1],
        middle: parts.slice(1, -1).join(' '),
        given: parts[0]
      }
    }

    return {
      family: parts[0],
      middle: parts.slice(1, -1).join(' '),
      given: parts[parts.length - 1]
    }
  }

  const splitNameValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const family = safeFirstValue(value.familyName, value.lastName, value.surname, value.family, value.ho, value.ten_ho)
          const middle = safeFirstValue(value.middleName, value.middle, value.tenDem, value.tenLot, value.ten_tenLot)
          const given = safeFirstValue(value.givenName, value.firstName, value.given, value.ten_ten)
          if (family || middle || given) {
            return {
              family: safeToUpperNoAccent(family),
              middle: safeToUpperNoAccent(middle),
              given: safeToUpperNoAccent(given)
            }
          }
          const text = safeFirstValue(value.fullName, value.full_name, value.hoTen, value.tenTrenGiayTo, value.name, value.ten)
          if (text) {
            return splitVNName(text)
          }
        } else if (typeof value === 'string') {
          return splitVNName(value)
        }
      }
    }
    return { family: '', middle: '', given: '' }
  }

  const splitStructuredLegalName = (sources = [], fallbackValues = []) => {
    const sourceList = (Array.isArray(sources) ? sources : [sources])
      .filter(source => source && typeof source === 'object' && !Array.isArray(source))
    const firstFromSources = (...keys) => {
      for (const source of sourceList) {
        for (const key of keys) {
          const value = source[key]
          if (value !== undefined && value !== null && String(value).trim() !== '') return value
        }
      }
      return ''
    }
    const family = firstFromSources('tenTrenGiayTo_ho')
    const middle = firstFromSources('tenTrenGiayTo_tenLot')
    const given = firstFromSources('tenTrenGiayTo_ten')
    if (family || middle || given) {
      return {
        family: safeToUpperNoAccent(family),
        middle: safeToUpperNoAccent(middle),
        given: safeToUpperNoAccent(given)
      }
    }
    return splitNameValue(...fallbackValues)
  }

  const asYesNo = (value, fallback = '') => {
    if (value === undefined || value === null || String(value).trim() === '') return fallback
    return safeIsAffirmativeValue(value) ? 'YES' : 'NO'
  }

  const baseSplitAddr = safeSplitAddr

  safeSplitAddr = (addr, dataObj = null, prefix = '', isUS = false) => {
    // Nếu là địa chỉ Mỹ, giữ nguyên bộ phân tích gốc
    if (isUS) {
      return baseSplitAddr(addr, dataObj, prefix, isUS)
    }

    // Bộ phân tích địa chỉ Việt Nam thông minh để mô phỏng lại các ô nhập liệu riêng biệt
    const parts = String(addr || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)

    if (parts.length === 0) {
      return { street: '', line2: '', city: '', province: '', zip: '', country: '' }
    }

    let country = ''
    let zip = ''
    let province = ''
    let city = ''

    // 1. Tách Quốc gia
    const lastPart = parts[parts.length - 1]
    const lastKey = optionKey(lastPart)
    if (lastKey.includes('VIET') || lastKey.includes('VN') || lastKey.includes('STATES') || lastKey === 'USA' || lastKey === 'US') {
      country = parts.pop()
    } else {
      country = 'VIETNAM'
    }

    // 2. Tách Mã Zip
    if (parts.length > 0) {
      const zipPart = parts[parts.length - 1]
      if (/^\d{4,10}(?:-\d{4})?$/.test(zipPart) || optionKey(zipPart) === 'DOES NOT APPLY') {
        zip = parts.pop()
      }
    }

    // 3. Tách Tỉnh/Thành
    if (parts.length > 0) {
      province = parts.pop()
    }

    // 4. Tách Quận/Huyện (City or town)
    if (parts.length > 0) {
      const cityPart = parts[parts.length - 1]
      if (isVNDistrictOrCity(cityPart) || (!isVNCommuneOrWard(cityPart) && parts.length === 1)) {
        city = parts.pop()
      }
    }

    // 5. Phần còn lại thuộc về Địa chỉ đường phố (Số nhà, đường, xã, phường,...)
    const street = parts.join(', ')

    return {
      street,
      line2: '',
      city,
      province,
      zip,
      country
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
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}City`] : '',
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}Town`] : '',
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}Village`] : '',
      dataObj && dataObj.nguoiDuocBaoLanh && prefix ? dataObj.nguoiDuocBaoLanh[`${prefix}City`] : '',
      dataObj && dataObj.petitionerData && prefix ? dataObj.petitionerData[`${prefix}City`] : '',
      dataObj && dataObj.nguoiBaoLanh && prefix ? dataObj.nguoiBaoLanh[`${prefix}City`] : '',
      pickObjectValue(source, 'city', 'town', 'village', 'huyen', 'thanhPho')
    )
    const explicitProvince = safeFirstValue(
      dataObj && prefix ? dataObj[`${prefix}Province`] : '',
      dataObj && prefix ? dataObj[`${prefix}State`] : '',
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}Province`] : '',
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}State`] : '',
      dataObj && dataObj.nguoiDuocBaoLanh && prefix ? dataObj.nguoiDuocBaoLanh[`${prefix}Province`] : '',
      dataObj && dataObj.nguoiDuocBaoLanh && prefix ? dataObj.nguoiDuocBaoLanh[`${prefix}State`] : '',
      dataObj && dataObj.petitionerData && prefix ? dataObj.petitionerData[`${prefix}Province`] : '',
      dataObj && dataObj.petitionerData && prefix ? dataObj.petitionerData[`${prefix}State`] : '',
      dataObj && dataObj.nguoiBaoLanh && prefix ? dataObj.nguoiBaoLanh[`${prefix}Province`] : '',
      dataObj && dataObj.nguoiBaoLanh && prefix ? dataObj.nguoiBaoLanh[`${prefix}State`] : '',
      pickObjectValue(source, 'province', 'state', 'tinh')
    )
    const explicitCountry = safeFirstValue(
      dataObj && prefix ? dataObj[`${prefix}Country`] : '',
      dataObj && dataObj.beneficiaryData && prefix ? dataObj.beneficiaryData[`${prefix}Country`] : '',
      dataObj && dataObj.nguoiDuocBaoLanh && prefix ? dataObj.nguoiDuocBaoLanh[`${prefix}Country`] : '',
      dataObj && dataObj.petitionerData && prefix ? dataObj.petitionerData[`${prefix}Country`] : '',
      dataObj && dataObj.nguoiBaoLanh && prefix ? dataObj.nguoiBaoLanh[`${prefix}Country`] : '',
      pickObjectValue(source, 'country', 'quocGia')
    )
    const parts = String(raw || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)

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

    // Chuẩn hóa cho các thành phố trực thuộc trung ương ở Việt Nam (Hồ Chí Minh, Hà Nội,...)
    const countryKey = optionKey(finalCountry || 'VIETNAM')
    if (countryKey.includes('VIET') || countryKey === 'VN' || !countryKey) {
      const provKey = optionKey(finalProvince)
      const cityKey = optionKey(finalCity)
      const rawKey = optionKey(raw)

      const isHCM = provKey.includes('HO CHI MINH') || provKey.includes('SAI GON') || provKey === 'HCM' || provKey === 'TP HCM' || provKey === 'TP.HCM' ||
                    cityKey.includes('HO CHI MINH') || cityKey.includes('SAI GON') || cityKey === 'HCM' || cityKey === 'TP HCM' || cityKey === 'TP.HCM' ||
                    cityKey === 'CHO LON' || cityKey === 'CHOLON' ||
                    rawKey.includes('HO CHI MINH') || rawKey.includes('SAI GON') || rawKey.includes('CHO LON') || rawKey.includes('CHOLON')

      const isHN = provKey.includes('HA NOI') || cityKey.includes('HA NOI') || rawKey.includes('HA NOI')
      const isHP = provKey.includes('HAI PHONG') || cityKey.includes('HAI PHONG') || rawKey.includes('HAI PHONG')
      const isDN = provKey.includes('DA NANG') || cityKey.includes('DA NANG') || rawKey.includes('DA NANG')
      const isCT = provKey.includes('CAN THO') || cityKey.includes('CAN THO') || rawKey.includes('CAN THO')

      if (isHCM) {
        finalCity = 'HO CHI MINH'
        finalProvince = 'HO CHI MINH'
      } else if (isHN) {
        finalCity = 'HA NOI'
        finalProvince = 'HA NOI'
      } else if (isHP) {
        finalCity = 'HAI PHONG'
        finalProvince = 'HAI PHONG'
      } else if (isDN) {
        finalCity = 'DA NANG'
        finalProvince = 'DA NANG'
      } else if (isCT) {
        finalCity = 'CAN THO'
        finalProvince = 'CAN THO'
      }
    }

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
    if (key === 'CANADA') return 'CANADA'
    if (key === 'AUSTRALIA') return 'AUSTRALIA'
    if (key === 'FRANCE') return 'FRANCE'
    if (key === 'GERMANY') return 'GERMANY'
    if (key === 'JAPAN') return 'JAPAN'
    if (key === 'CHINA') return 'CHINA'
    if (key === 'TAIWAN') return 'TAIWAN'
    if (key === 'SINGAPORE') return 'SINGAPORE'
    if (key === 'SOUTHKOREA' || key === 'KOREA' || key === 'REPUBLICOFKOREA') return 'SOUTH KOREA'
    if (key === 'LAOS' || key === 'LAO') return 'LAOS'
    if (key === 'CAMBODIA') return 'CAMBODIA'
    if (key === 'THAILAND') return 'THAILAND'
    if (key === 'PHILIPPINES') return 'PHILIPPINES'
    return ''
  }

  const countryOnlyValue = (...values) => {
    for (const value of values) {
      const raw = safeFirstValue(nameText(value), addressText(value))
      if (!raw) continue

      const parts = String(raw)
        .split(/,|;/)
        .map(part => part.trim())
        .filter(Boolean)

      const candidates = parts.length ? [...parts].reverse() : [raw]
      for (const candidate of candidates) {
        const known = knownCountryName(candidate)
        if (known) return known
      }

      if (parts.length > 1) return safeToUpperNoAccent(parts[parts.length - 1])
      if (/^[a-zA-Z]+$/.test(String(raw).trim())) return safeToUpperNoAccent(raw)
    }
    return ''
  }

  const splitWesternName = (...values) => {
    const raw = safeFirstValue(...values.map(nameText))
    const clean = safeToUpperNoAccent(raw).replace(/\s+/g, ' ').trim()
    if (!clean) return { family: '', middle: '', given: '' }

    if (clean.includes(',')) {
      const [familyPart, ...givenParts] = clean.split(',')
      const givenTokens = givenParts.join(' ').trim().split(/\s+/).filter(Boolean)
      return {
        family: String(familyPart || '').trim(),
        middle: givenTokens.slice(1).join(' '),
        given: givenTokens[0] || ''
      }
    }

    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return { family: '', middle: '', given: parts[0] }
    if (parts.length === 2) return { family: parts[1], middle: '', given: parts[0] }
    return {
      family: parts[parts.length - 1],
      middle: parts.slice(1, -1).join(' '),
      given: parts[0]
    }
  }

  const hasNonVietnamCountryHint = (...values) => values.some(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const country = countryOnlyValue(
      pickObjectValue(value, 'birthCountry', 'countryOfBirth', 'quocGiaSinh', 'spouseBirthCountry', 'childBirthCountry'),
      pickObjectValue(value, 'noiSinh', 'birthPlace', 'placeOfBirth', 'spouseBirthPlace', 'childBirthPlace')
    )
    return !!country && country !== 'VIETNAM'
  })

  const splitNameValueSmart = (...values) => {
    for (const value of values) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const family = safeFirstValue(value.familyName, value.lastName, value.surname, value.family, value.ho, value.ten_ho)
        const middle = safeFirstValue(value.middleName, value.middle, value.tenDem, value.tenLot, value.ten_tenLot)
        const given = safeFirstValue(value.givenName, value.firstName, value.given, value.ten_ten)
        if (family || middle || given) {
          return {
            family: safeToUpperNoAccent(family),
            middle: safeToUpperNoAccent(middle),
            given: safeToUpperNoAccent(given)
          }
        }
      }
    }
    const raw = safeFirstValue(...values.map(nameText))
    return String(raw || '').includes(',') || hasNonVietnamCountryHint(...values)
      ? splitWesternName(...values)
      : splitNameValue(...values)
  }

  const countryFromAddressText = (...values) => {
    for (const value of values) {
      const raw = safeFirstValue(addressText(value), nameText(value))
      if (!raw) continue

      const parts = String(raw)
        .split(/,|;/)
        .map(part => part.trim())
        .filter(Boolean)
      const candidates = parts.length ? [...parts].reverse() : [raw]

      for (const candidate of candidates) {
        const known = knownCountryName(candidate)
        if (known) return known
      }
    }
    return ''
  }
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

  const getParentResidenceParts = (prefix, record = {}) => {
    const isDeceased = (statusVal) => {
      if (!statusVal) return false
      const status = String(statusVal).trim().toUpperCase()
      const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/Đ/gi, 'D')
      return ['DA MAT', 'DAMAT', 'QUA DOI', 'QUADOI', 'CHET', 'DECEASED', 'DEAD', 'NO', 'KHONG', 'MAT'].some(word => normalized.includes(word))
    }

    const statusVal = safeFirstValue(
      data[`${prefix}Status`],
      data[`${prefix}TinhTrang`],
      pickObjectValue(record, 'status', 'tinhTrang', 'conSong', 'con_song', 'songCon', 'tinhTrangSucKhoe', 'sucKhoe', 'tinhTrangCuTru')
    )

    if (isDeceased(statusVal)) {
      return { city: 'DECEASED', country: '' }
    }

    const address = firstAddressText(
      data[`${prefix}ResidenceAddress`],
      data[`${prefix}CurrentAddress`],
      pickObjectValue(record, 'residenceAddress', 'currentAddress', 'diaChi', 'address'),
      data[`${prefix}ResidenceCountry`],
      data[`${prefix}CurrentCountry`]
    )
    const country = countryOnlyValue(
      data[`${prefix}ResidenceCountry`],
      data[`${prefix}CurrentCountry`],
      pickObjectValue(record, 'residenceCountry', 'currentCountry', 'country', 'quocGia'),
      countryFromAddressText(address)
    )
    const isUS = country === 'USA' || addressLooksUS(address, country)
    const parsed = normalizeI130AAddressLines(safeSplitAddr(address, data, `${prefix}ResidenceAddress`, isUS))

    return {
      city: safeFirstValue(
        data[`${prefix}ResidenceCity`],
        data[`${prefix}CurrentCity`],
        pickObjectValue(record, 'residenceCity', 'currentCity', 'city', 'cityTown', 'town', 'thanhPho', 'huyen'),
        parsed.city || parsed.province
      ),
      country: safeFirstValue(country, inferUSCountryFromAddressParts({
        line1: parsed.street,
        city: parsed.city,
        state: parsed.province,
        zip: parsed.zip,
        fullAddress: address
      }))
    }
  }

  const normalizeI130AAddressLines = (parts = {}) => {
    const line1 = safeFirstValue(parts.line1, parts.street)
    const line2 = safeFirstValue(parts.line2)

    // Với địa chỉ Việt Nam, phường/xã/quận/huyện là một phần của địa chỉ chính.
    // Không đưa các phần này xuống Address line 2 vì line 2 trên form I-130A thường dùng cho Apt/Ste/Floor.
    if (line2 && isLocalAddressPart(line2)) {
      return {
        ...parts,
        line1: joinAddressLine(line1, line2),
        street: joinAddressLine(line1, line2),
        line2: ''
      }
    }

    return { ...parts, line1, street: line1, line2 }
  }

  const isCurrentlyMarried = (...values) => {
    const key = optionKey(safeFirstValue(...values))
    if (!key) return false
    if (key.includes('LY HON') || key.includes('DIVORC')) return false
    if (key.includes('GOA') || key.includes('WIDOW')) return false
    if (key.includes('DOC THAN') || key.includes('CHUA KET HON') || key.includes('SINGLE') || key.includes('NEVER MARRIED')) return false
    return key.includes('KET HON') || key.includes('TAI HON') || key.includes('MARRIED') || key.includes('REMARRIED')
  }

  const translateMaritalStatus = (value) => {
    const key = optionKey(value)
    if (!key) return ''
    // Phải kiểm tra độc thân/chưa từng kết hôn trước, vì giá trị
    // "Chưa kết hôn"/"Chưa bao giờ kết hôn" cũng chứa chuỗi con "KET HON".
    if (key.includes('DOC THAN') || key.includes('CHUA BAO GIO') || key.includes('CHUA KET HON') || key.includes('SINGLE') || key.includes('NEVER MARRIED')) return 'SINGLE'
    if (key.includes('LY HON') || key.includes('DIVORC')) return 'DIVORCED'
    if (key.includes('GOA') || key.includes('WIDOW')) return 'WIDOWED'
    if (key.includes('TAI HON') || key.includes('KET HON') || key.includes('MARRIED')) return 'MARRIED'
    return key
  }

    const explicitPetitionerSource = hasRecordValue(data.petitionerData) ? data.petitionerData : (hasRecordValue(data.nguoiBaoLanh) ? data.nguoiBaoLanh : {})
    const explicitBeneficiarySource = hasRecordValue(data.beneficiaryData) ? data.beneficiaryData : (hasRecordValue(data.nguoiDuocBaoLanh) ? data.nguoiDuocBaoLanh : {})
    const hasSeparatedSources = hasRecordValue(explicitPetitionerSource) || hasRecordValue(explicitBeneficiarySource)

    const formScope = optionKey(safeFirstValue(data.formType, data.form_type, data.formSlug, data.form_slug, data.type))
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
      formScope.includes('I130')
    )

    const petitionerSource = hasSeparatedSources
      ? explicitPetitionerSource
      : (isPetitionerOnlyForm ? data : {})
    const beneficiarySource = hasSeparatedSources
      ? explicitBeneficiarySource
      : (isBeneficiaryOnlyForm ? data : {})

    const petitionerFlatFallback = hasSeparatedSources ? {} : (isPetitionerOnlyForm ? data : {})
    const beneficiaryFlatFallback = hasSeparatedSources ? {} : (isBeneficiaryOnlyForm ? data : {})
    const isParentPetition = getPetitionRelationship() === 'PARENT'

    const beneficiary = splitNameValue(
      data.beneficiaryFullName,
      data.beneficiaryName,
      pickObjectValue(beneficiarySource, 'beneficiaryFullName', 'fullName', 'tenTrenGiayTo', 'customerName'),
      hasSeparatedSources ? '' : data.tenTrenGiayTo,
      hasSeparatedSources ? '' : data.fullName,
      hasSeparatedSources ? '' : data.customerName
    )
    const beneficiaryOther = splitNameValue(
      data.beneficiaryOtherName,
      data.beneficiaryOtherNames,
      pickObjectValue(beneficiarySource, 'beneficiaryOtherName', 'otherName', 'tenGoiKhac'),
      hasSeparatedSources ? '' : data.tenGoiKhac,
      hasSeparatedSources ? '' : data.otherName
    )
    const beneficiaryBirthPlace = splitPlace(safeFirstValue(
      data.beneficiaryBirthPlace,
      pickObjectValue(beneficiarySource, 'beneficiaryBirthPlace', 'placeBirth', 'noiSinh'),
      hasSeparatedSources ? '' : data.placeBirth,
      hasSeparatedSources ? '' : data.noiSinh
    ), data, 'noiSinh')
    const petitionerBirthPlace = splitPlace(safeFirstValue(
      data.petitionerBirthPlace,
      pickObjectValue(petitionerSource, 'petitionerBirthPlace', 'placeBirth', 'noiSinh'),
      hasSeparatedSources ? '' : data.placeBirth,
      hasSeparatedSources ? '' : data.noiSinh
    ), data, 'noiSinh')
    const beneficiaryCurrentAddressText = firstAddressText(
      data.beneficiaryCurrentAddress,
      pickObjectValue(beneficiarySource, 'beneficiaryCurrentAddress', 'diaChiNhanThuVN', 'currentAddress', 'address'),
      data.beneficiaryAddress,
      hasSeparatedSources ? '' : data.diaChiNhanThuVN,
      data.currentAddress,
      data.address
    )
    const beneficiaryCurrentAddr = normalizeI130AAddressLines(safeSplitAddr(beneficiaryCurrentAddressText, data, 'diaChiNhanThuVN', false))
    const intendedUsAddressText = firstAddressText(
      data.beneficiaryIntendedUSAddress,
      pickObjectValue(beneficiarySource, 'beneficiaryIntendedUSAddress', 'diaChiDuDinhSongMy', 'addressInUS'),
      data.intendedUSAddress,
      hasSeparatedSources ? '' : data.diaChiDuDinhSongMy,
      data.addressInUS
    )
    const intendedUsAddr = normalizeI130AAddressLines(safeSplitAddr(intendedUsAddressText, data, 'diaChiDuDinhSongMy', true))
    const beneficiaryForeignAddressText = firstAddressText(data.beneficiaryForeignAddress, data.foreignAddressOutsideUS, data.diaChiSongNgoaiHoaKy)
    const beneficiaryForeignAddr = normalizeI130AAddressLines(safeSplitAddr(beneficiaryForeignAddressText, data, 'beneficiaryForeignAddress', false))
    const usEntry1 = firstItem(beneficiarySource.lanNhapCanhMy, beneficiarySource.usEntryHistory, data.lanNhapCanhMy, data.usEntryHistory, data.previousUSEntries)
    const previousPetition1 = firstItem(beneficiarySource.lanDuocBaoLanh, data.lanDuocBaoLanh, data.previousImmigrantPetitions, data.previousPetitions)
    const currentSpouseRecord = firstItem(beneficiarySource.honPhoiHienTai, beneficiarySource.currentSpouse, data.beneficiaryCurrentSpouse, hasSeparatedSources ? {} : data.honPhoiHienTai, hasSeparatedSources ? {} : data.currentSpouse)
    const formerSpouseRecord = itemFromLists(0, beneficiarySource.honNhanCu, beneficiarySource.formerSpouses, hasSeparatedSources ? [] : data.honNhanCu, data.formerSpouses, data.previousSpouses)
    const formerSpouseRecord2 = itemFromLists(1, beneficiarySource.honNhanCu, beneficiarySource.formerSpouses, hasSeparatedSources ? [] : data.honNhanCu, data.formerSpouses, data.previousSpouses)
    const deceasedSpouseRecord = firstItem(beneficiarySource.honPhoiDaMat, data.honPhoiDaMat, data.deceasedSpouses)
    const beneficiaryMaritalStatus = safeFirstValue(data.beneficiaryMaritalStatus, beneficiarySource.beneficiaryMaritalStatus, beneficiarySource.tinhTrangHonNhan, hasSeparatedSources ? '' : data.tinhTrangHonNhan, hasSeparatedSources ? '' : data.maritalStatus, hasSeparatedSources ? '' : data.currentMaritalStatus)
    const beneficiaryHasCurrentSpouse = isCurrentlyMarried(beneficiaryMaritalStatus)
    const beneficiaryCurrentSpouseNameHint = {
      fullName: safeFirstValue(data.beneficiaryCurrentSpouseName, beneficiarySource.beneficiaryCurrentSpouseName),
      birthCountry: safeFirstValue(data.beneficiaryCurrentSpouseBirthCountry, data.spouseBirthCountry),
      birthPlace: safeFirstValue(data.beneficiaryCurrentSpouseBirthPlace, data.spouseBirthPlace)
    }
    const beneficiarySpouse = beneficiaryHasCurrentSpouse ? splitNameValueSmart(beneficiaryCurrentSpouseNameHint, currentSpouseRecord, hasSeparatedSources ? '' : data.currentSpouseFullName, hasSeparatedSources ? '' : data.spouseFullName, hasSeparatedSources ? '' : data.spouseName) : { family: '', middle: '', given: '' }
    const beneficiaryFormerSpouse = splitNameValue(data.beneficiaryFormerSpouseName, formerSpouseRecord, hasSeparatedSources ? '' : data.formerSpouseFullName, hasSeparatedSources ? '' : data.exSpouseName)
    const beneficiaryFormerSpouse2 = splitNameValue(data.formerSpouse2FullName, formerSpouseRecord2, hasSeparatedSources ? '' : data.exSpouse2Name)
    const beneficiaryMarriagePlace = splitPlace(safeFirstValue(data.beneficiaryMarriagePlace, beneficiarySource.beneficiaryMarriagePlace, pickObjectValue(currentSpouseRecord, 'noiKetHon', 'marriagePlace', 'placeOfMarriage'), hasSeparatedSources ? '' : data.currentMarriagePlace, hasSeparatedSources ? '' : data.marriagePlace), data, 'currentMarriagePlace')
    const jointAddressText = firstAddressText(
      data.lastSharedSpouseAddress,
      beneficiarySource.lastSharedSpouseAddress,
      pickObjectValue(currentSpouseRecord, 'diaChiSongChung', 'sharedAddress', 'addressLivedTogether'),
      data.spouseSharedAddress
    )
    const jointAddr = normalizeI130AAddressLines(safeSplitAddr(jointAddressText, data, 'lastSharedSpouseAddress', false))
    const recordListFromSources = (...values) => {
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
    const parseEmploymentSortDate = (value) => {
      const raw = String(value || '').trim()
      const key = optionKey(raw)
      if (!key) return 0
      if (['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)) return Date.now()

      const parts = raw.split(/[/-]/).map(part => part.trim()).filter(Boolean)
      if (parts.length === 3) {
        let year = ''
        let month = ''
        let day = ''

        if (parts[0].length === 4) {
          year = parts[0]
          month = parts[1]
          day = parts[2]
        } else {
          const first = parseInt(parts[0], 10)
          const second = parseInt(parts[1], 10)
          year = parts[2]
          if (second > 12) {
            month = parts[0]
            day = parts[1]
          } else if (first > 12) {
            day = parts[0]
            month = parts[1]
          } else {
            month = parts[0]
            day = parts[1]
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
    const isCurrentEmploymentEndValue = (value) => {
      const key = optionKey(value)
      return !key || ['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT', 'NAY'].includes(key)
    }
    const isNonEmployerEmploymentStatus = (value) => {
      const key = optionKey(value)
      if (!key) return false
      return [
        'VE HUU',
        'RETIRED',
        'UNEMPLOYED',
        'THAT NGHIEP',
        'KHONG CO VIEC LAM',
        'KHONG DI LAM',
        'HOMEMAKER',
        'HOUSEWIFE',
        'STUDENT',
        'SINH VIEN'
      ].some(status => key === status || key.includes(status))
    }
    const cleanEmployerName = (value) => {
      const raw = safeFirstValue(value)
      return isNonEmployerEmploymentStatus(raw) ? '' : raw
    }
    const getEmploymentEmployerName = (record = {}) => cleanEmployerName(safeFirstValue(
      pickObjectValue(record, 'tenCongTy', 'companyName', 'employerName', 'employer', 'company', 'currentEmployerName'),
      // Legacy payloads sometimes used "name" for employer; keep it last so occupation/status fields do not win.
      pickObjectValue(record, 'name')
    ))
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
    const beneficiaryEmploymentRecords = sortEmploymentRecordsNewestFirst(recordListFromSources(
      beneficiarySource.congViec5Nam,
      beneficiarySource.employmentHistory,
      beneficiarySource.jobs5Years,
      hasSeparatedSources ? [] : data.congViec5Nam,
      data.employmentHistory,
      data.jobs5Years
    ))
    const employment1Record = beneficiaryEmploymentRecords[0] || {}
    const employment2Record = beneficiaryEmploymentRecords[1] || {}
    const beneficiaryCurrentEmploymentRecord = beneficiaryEmploymentRecords.find(record => {
      const endDate = employmentEndDate(record)
      if (!isCurrentEmploymentEndValue(endDate)) return false

      const employer = getEmploymentEmployerName(record)
      const occupation = pickObjectValue(record, 'ngheNghiep', 'occupation', 'jobTitle', 'title', 'profession')
      return employer || !isNonEmployerEmploymentStatus(occupation)
    }) || {}
    const currentEmployerAddressText = firstAddressText(
      data.currentEmployerAddress,
      pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChi', 'address', 'employerAddress')
    )
    const currentEmployerParsedAddr = safeSplitAddr(currentEmployerAddressText, data, 'currentEmployerAddress', false)
    const currentEmployerExplicitCountry = safeFirstValue(
      countryFromAddressText(currentEmployerAddressText),
      countryOnlyValue(data.currentEmployerCountry),
      countryOnlyValue(
        pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiCountry', 'country', 'quocGia'),
        pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'country', 'quocGia')
      )
    )
    const currentEmployerLine1 = safeFirstValue(
      data.currentEmployerAddressLine1,
      pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiLine1', 'addressLine1', 'line1'),
      pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'line1', 'street'),
      pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiStreet', 'street'),
      currentEmployerParsedAddr.street
    )
    const currentEmployerCity = safeFirstValue(
      data.currentEmployerCity,
      currentEmployerExplicitCountry === 'VIETNAM' ? pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'city', 'town', 'thanhPho') : '',
      pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiCity', 'city', 'huyen', 'thanhPho'),
      pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'city', 'town', 'thanhPho'),
      currentEmployerParsedAddr.city
    )
    const currentEmployerState = safeFirstValue(
      data.currentEmployerState,
      data.currentEmployerProvince,
      pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiProvince', 'diaChiState', 'province', 'state', 'tinh'),
      pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'province', 'state', 'tinh'),
      currentEmployerParsedAddr.province
    )
    const currentEmployerZip = safeFirstValue(
      zipOnlyValue(data.currentEmployerZipCode, data.currentEmployerPostalCode),
      zipOnlyValue(
        pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiZipCode', 'zipCode', 'postalCode', 'diaChiZip', 'zip'),
        pickObjectValue(beneficiaryCurrentEmploymentRecord.diaChiParts, 'zip', 'zipCode', 'postalCode')
      ),
      zipOnlyValue(currentEmployerParsedAddr.zip)
    )
    const currentEmployerAddr = normalizeI130AAddressLines({
      street: currentEmployerLine1,
      line2: safeFirstValue(
        data.currentEmployerAddressLine2,
        pickObjectValue(beneficiaryCurrentEmploymentRecord, 'diaChiLine2', 'addressLine2', 'line2'),
        currentEmployerParsedAddr.line2
      ),
      city: currentEmployerCity,
      province: currentEmployerState,
      zip: currentEmployerZip,
      country: safeFirstValue(
        currentEmployerExplicitCountry,
        inferUSCountryFromAddressParts({
          line1: currentEmployerLine1,
          city: currentEmployerCity,
          state: currentEmployerState,
          zip: currentEmployerZip,
          fullAddress: currentEmployerAddressText
        })
      )
    })
    const passportIssuePlace = splitPlace(safeFirstValue(data.passportIssuePlace, data.noiCapPassport), data, 'noiCapPassport')
    const child1Record = itemFromLists(0, beneficiarySource.thongTinCon, beneficiarySource.children, beneficiarySource.childrenInfo, beneficiarySource.conCai, data.beneficiaryChildren, data.beneficiaryChildrenInfo, data.beneficiaryThongTinCon, hasSeparatedSources ? [] : data.thongTinCon, hasSeparatedSources ? [] : data.children, hasSeparatedSources ? [] : data.childrenInfo, hasSeparatedSources ? [] : data.conCai)
    const child2Record = itemFromLists(1, beneficiarySource.thongTinCon, beneficiarySource.children, beneficiarySource.childrenInfo, beneficiarySource.conCai, data.beneficiaryChildren, data.beneficiaryChildrenInfo, data.beneficiaryThongTinCon, hasSeparatedSources ? [] : data.thongTinCon, hasSeparatedSources ? [] : data.children, hasSeparatedSources ? [] : data.childrenInfo, hasSeparatedSources ? [] : data.conCai)
    const child1 = splitNameValue(child1Record, data.child1FullName)
    const child2 = splitNameValue(child2Record, data.child2FullName)
    const child1BirthPlace = splitPlace(safeFirstValue(pickObjectValue(child1Record, 'noiSinh', 'birthPlace', 'placeOfBirth'), data.child1BirthPlace))
    const child2BirthPlace = splitPlace(safeFirstValue(pickObjectValue(child2Record, 'noiSinh', 'birthPlace', 'placeOfBirth'), data.child2BirthPlace))
    const beneficiaryChildSectionValue = (...values) => isParentPetition ? '' : safeFirstValue(...values)
    const beneficiaryCurrentMarriageCount = beneficiaryHasCurrentSpouse ? Math.max(1, countRecords(beneficiarySource.honPhoiHienTai || (hasSeparatedSources ? [] : data.honPhoiHienTai))) : 0
    const beneficiaryPreviousMarriageCount = countRecords(beneficiarySource.honNhanCu || (hasSeparatedSources ? [] : data.honNhanCu)) + countRecords(beneficiarySource.honPhoiDaMat || (hasSeparatedSources ? [] : data.honPhoiDaMat))
    const beneficiaryMarriageCount = beneficiaryCurrentMarriageCount + beneficiaryPreviousMarriageCount ||
      (optionKey(beneficiaryMaritalStatus).includes('LY HON') || optionKey(beneficiaryMaritalStatus).includes('DIVORC') || optionKey(beneficiaryMaritalStatus).includes('GOA') || optionKey(beneficiaryMaritalStatus).includes('WIDOW') ? 1 : '')
    const isBeneficiaryInVietnam = optionKey(beneficiaryCurrentAddr.country).includes('VIET')
    const petitioner = splitStructuredLegalName(
      [petitionerSource, data],
      [data.petitionerFullName, data.sponsorFullName, data.petitionerName, pickObjectValue(petitionerSource, 'petitionerFullName', 'fullName', 'tenTrenGiayTo'), data.fullName]
    )
    const petitionerOther = splitNameValue(data.petitionerOtherName, data.sponsorOtherName, pickObjectValue(petitionerSource, 'petitionerOtherName', 'otherName', 'tenGoiKhac'), hasSeparatedSources ? '' : data.tenGoiKhac, hasSeparatedSources ? '' : data.otherName)
    const petitionerCurrentSpouseRecord = firstItem(
      petitionerSource.honPhoiHienTai,
      petitionerSource.currentMarriage,
      petitionerFlatFallback.honPhoiHienTai,
      petitionerFlatFallback.currentMarriage,
      petitionerFlatFallback.currentSpouse,
      petitionerFlatFallback.spouse
    )
    const petitionerFormerSpouseRecord = itemFromLists(
      0,
      petitionerSource.honNhanCu,
      petitionerSource.pastMarriages,
      petitionerFlatFallback.honNhanCu,
      petitionerFlatFallback.formerSpouses,
      petitionerFlatFallback.previousSpouses
    )
    const petitionerFormerSpouseRecord2 = itemFromLists(
      1,
      petitionerSource.honNhanCu,
      petitionerSource.pastMarriages,
      petitionerFlatFallback.honNhanCu,
      petitionerFlatFallback.formerSpouses,
      petitionerFlatFallback.previousSpouses
    )
    const petitionerDeceasedSpouseRecord = firstItem(
      petitionerSource.honPhoiDaMat,
      petitionerFlatFallback.honPhoiDaMat,
      petitionerFlatFallback.deceasedSpouses
    )
    const petitionerEmploymentRecords = sortEmploymentRecordsNewestFirst(recordListFromSources(
      petitionerSource.congViec5Nam,
      petitionerSource.jobs5Years,
      hasSeparatedSources ? [] : data.congViec5Nam,
      hasSeparatedSources ? [] : data.jobs5Years,
      hasSeparatedSources ? [] : data.previousJobs,
      hasSeparatedSources ? [] : data.employment5Years,
      hasSeparatedSources ? [] : data.previousJobsList
    ))
    const petitionerEmployment1Record = petitionerEmploymentRecords[0] || {}
    const petitionerEmployment2Record = petitionerEmploymentRecords[1] || {}
    const hasCurrentSpouse = isCurrentlyMarried(data.maritalStatus, data.currentMaritalStatus, data.tinhTrangHonNhan, petitionerSource.tinhTrangHonNhan)
    const translatedPetitionerMaritalStatus = translateMaritalStatus(safeFirstValue(data.maritalStatus, data.currentMaritalStatus, data.tinhTrangHonNhan, petitionerSource.tinhTrangHonNhan))
    const petitionerCurrentMarriageCount = hasCurrentSpouse ? Math.max(1, countRecords(
      petitionerSource.honPhoiHienTai ||
      petitionerSource.currentMarriage ||
      petitionerFlatFallback.honPhoiHienTai ||
      petitionerFlatFallback.currentMarriage ||
      petitionerFlatFallback.currentSpouse ||
      petitionerFlatFallback.spouse
    )) : 0
    const petitionerPreviousMarriageCount = countRecords(petitionerSource.honNhanCu || petitionerFlatFallback.honNhanCu || petitionerFlatFallback.formerSpouses || petitionerFlatFallback.previousSpouses) +
      countRecords(petitionerSource.honPhoiDaMat || petitionerFlatFallback.honPhoiDaMat || petitionerFlatFallback.deceasedSpouses)
    const petitionerMarriageCount = translatedPetitionerMaritalStatus === 'SINGLE'
      ? '0'
      : safeFirstValue(
        data.numberOfMarriages,
        data.marriageCount,
        petitionerCurrentMarriageCount + petitionerPreviousMarriageCount ||
          (['DIVORCED', 'WIDOWED'].includes(translatedPetitionerMaritalStatus) ? 1 : '')
      )
    const petitionerCurrentSpouseNameHint = {
      fullName: safeFirstValue(petitionerFlatFallback.spouseFullName, petitionerFlatFallback.spouseName, petitionerFlatFallback.currentSpouseFullName),
      birthCountry: petitionerFlatFallback.spouseBirthCountry,
      birthPlace: petitionerFlatFallback.spouseBirthPlace
    }
    const spouse = hasCurrentSpouse ? splitNameValueSmart(petitionerCurrentSpouseNameHint, petitionerCurrentSpouseRecord) : { family: '', middle: '', given: '' }
    const formerSpouse = splitNameValue(petitionerFlatFallback.formerSpouseFullName, petitionerFlatFallback.exSpouseName, petitionerFormerSpouseRecord)
    const formerSpouse2 = splitNameValue(petitionerFlatFallback.formerSpouse2FullName, petitionerFlatFallback.exSpouse2Name, petitionerFormerSpouseRecord2)
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
    const father = splitNameValue(data.fatherFullName, data.fatherName, fatherRecord)
    const mother = splitNameValue(data.motherFullName, data.motherName, motherRecord)
    const fatherBirthPlaceText = safeFirstValue(petitionerFlatFallback.fatherBirthPlace, pickObjectValue(fatherRecord, 'noiSinh', 'birthPlace', 'placeOfBirth'))
    const motherBirthPlaceText = safeFirstValue(petitionerFlatFallback.motherBirthPlace, pickObjectValue(motherRecord, 'noiSinh', 'birthPlace', 'placeOfBirth'))
    const fatherBirthPlace = splitPlace(fatherBirthPlaceText)
    const motherBirthPlace = splitPlace(motherBirthPlaceText)
    const fatherBirthCountry = safeFirstValue(
      countryOnlyValue(petitionerFlatFallback.fatherBirthCountry),
      countryOnlyValue(pickObjectValue(fatherRecord, 'birthCountry', 'countryOfBirth', 'quocGiaSinh', 'quocGia')),
      countryOnlyValue(fatherBirthPlace.country),
      countryOnlyValue(fatherBirthPlaceText),
      'VIETNAM'
    )
    const motherBirthCountry = safeFirstValue(
      countryOnlyValue(petitionerFlatFallback.motherBirthCountry),
      countryOnlyValue(pickObjectValue(motherRecord, 'birthCountry', 'countryOfBirth', 'quocGiaSinh', 'quocGia')),
      countryOnlyValue(motherBirthPlace.country),
      countryOnlyValue(motherBirthPlaceText),
      'VIETNAM'
    )
    const fatherResidence = getParentResidenceParts('father', fatherRecord)
    const motherResidence = getParentResidenceParts('mother', motherRecord)
    const otherRelative1 = splitNameValue(data.otherRelativeFullName1, data.separatePetitionRelative1Name)
    const otherRelative2 = splitNameValue(data.otherRelativeFullName2, data.separatePetitionRelative2Name)
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
    const previousAddressRecords = firstRecordList(
      data.addresses5Years,
      data.diaChi5Nam,
      data.previousAddresses,
      data.previousAddressList
    ).slice().sort((a, b) => parseAddressSortDate(getAddressRecordFromDate(b)) - parseAddressSortDate(getAddressRecordFromDate(a)))
    const previousAddress1 = previousAddressRecords[0] || firstItem(data.addresses5Years, data.diaChi5Nam)
    const mailingAddressText = firstAddressText(
      data.petitionerMailingAddress,
      data.mailingAddress,
      data.diaChiNhanThuMy,
      data.q23_typeA23,
      data.diaChiNhanThuVN,
      data.currentAddressUS,
      data.currentAddress
    )
    const previousAddress1Text = firstAddressText(
      data.petitionerPreviousAddress1,
      data.previousAddress1,
      data.oldAddress1,
      previousAddress1
    )
    const previousAddress1RawLine1 = safeFirstValue(
      data.previousAddress1Line1,
      data.oldAddress1Line1,
      pickObjectValue(previousAddress1, 'addressLine1', 'line1', 'street'),
      previousAddress1Text
    )
    const previousAddress1RawCity = safeFirstValue(
      data.previousAddress1City,
      data.oldAddress1City,
      pickObjectValue(previousAddress1, 'city', 'cityTown', 'town', 'thanhPho', 'huyen')
    )
    const previousAddress1RawState = safeFirstValue(
      data.previousAddress1State,
      data.oldAddress1State,
      pickObjectValue(previousAddress1, 'state', 'province', 'stateProvince', 'tinh')
    )
    const previousAddress1RawZip = safeFirstValue(
      data.previousAddress1ZipCode,
      data.oldAddress1ZipCode,
      pickObjectValue(previousAddress1, 'zipCode', 'zip', 'postalCode', 'postal')
    )
    const previousAddress1CountryFromText = countryFromAddressText(previousAddress1Text)
    const previousAddress1ExplicitCountry = countryOnlyValue(
      data.previousAddress1Country,
      data.oldAddress1Country,
      pickObjectValue(previousAddress1, 'country', 'quocGia')
    )
    const previousAddress1InferredCountry = inferUSCountryFromAddressParts({
      line1: previousAddress1RawLine1,
      city: previousAddress1RawCity,
      state: previousAddress1RawState,
      zip: previousAddress1RawZip,
      fullAddress: previousAddress1Text
    })
    const previousAddress1IsUS = previousAddress1CountryFromText === 'USA' ||
      previousAddress1ExplicitCountry === 'USA' ||
      previousAddress1InferredCountry === 'USA' ||
      addressLooksUS(previousAddress1Text)
    const mailingAddr = normalizeI130AAddressLines(safeSplitAddr(mailingAddressText, data, 'petitionerMailingAddress', true))
    const oldAddr1 = normalizeI130AAddressLines(safeSplitAddr(previousAddress1Text, data, 'petitionerPreviousAddress1', previousAddress1IsUS))
    const previousAddress1Country = safeFirstValue(
      previousAddress1CountryFromText,
      previousAddress1ExplicitCountry,
      previousAddress1InferredCountry
    )

    const mailingAddressForCompare = {
      country: safeFirstValue(data.petitionerMailingCountry, data.mailingAddressCountry, data.diaChiNhanThuMyCountry, mailingAddr.country, data.currentAddressCountryVN),
      line1: normalizeI130AAddressLines({
        line1: safeFirstValue(data.petitionerMailingAddressLine1, data.mailingAddressLine1, data.diaChiNhanThuMyStreet, data.diaChiNhanThuMyLine1, mailingAddr.street),
        line2: safeFirstValue(data.petitionerMailingAddressLine2, data.mailingAddressLine2, data.diaChiNhanThuMyLine2, mailingAddr.line2)
      }).line1,
      line2: normalizeI130AAddressLines({
        line1: safeFirstValue(data.petitionerMailingAddressLine1, data.mailingAddressLine1, data.diaChiNhanThuMyStreet, data.diaChiNhanThuMyLine1, mailingAddr.street),
        line2: safeFirstValue(data.petitionerMailingAddressLine2, data.mailingAddressLine2, data.diaChiNhanThuMyLine2, mailingAddr.line2)
      }).line2,
      city: safeFirstValue(data.petitionerMailingCity, data.mailingAddressCity, data.diaChiNhanThuMyCity, mailingAddr.city),
      state: safeFirstValue(data.petitionerMailingState, data.mailingAddressState, data.diaChiNhanThuMyState, data.diaChiNhanThuMyProvince, mailingAddr.province),
      zip: safeFirstValue(data.petitionerMailingZipCode, data.mailingAddressZipCode, data.diaChiNhanThuMyZipCode, data.diaChiNhanThuMyZip, mailingAddr.zip)
    }
    const previousAddress1ForCompare = {
      country: previousAddress1Country,
      line1: normalizeI130AAddressLines({
        line1: safeFirstValue(data.previousAddress1Line1, data.oldAddress1Line1, pickObjectValue(previousAddress1, 'addressLine1', 'line1', 'street'), oldAddr1.street),
        line2: safeFirstValue(data.previousAddress1Line2, data.oldAddress1Line2, pickObjectValue(previousAddress1, 'addressLine2', 'line2'), oldAddr1.line2)
      }).line1,
      line2: normalizeI130AAddressLines({
        line1: safeFirstValue(data.previousAddress1Line1, data.oldAddress1Line1, pickObjectValue(previousAddress1, 'addressLine1', 'line1', 'street'), oldAddr1.street),
        line2: safeFirstValue(data.previousAddress1Line2, data.oldAddress1Line2, pickObjectValue(previousAddress1, 'addressLine2', 'line2'), oldAddr1.line2)
      }).line2,
      city: safeFirstValue(data.previousAddress1City, data.oldAddress1City, pickObjectValue(previousAddress1, 'city', 'cityTown', 'town', 'thanhPho', 'huyen'), oldAddr1.city),
      state: safeFirstValue(data.previousAddress1State, data.oldAddress1State, pickObjectValue(previousAddress1, 'state', 'province', 'stateProvince', 'tinh'), oldAddr1.province),
      zip: safeFirstValue(data.previousAddress1ZipCode, data.oldAddress1ZipCode, pickObjectValue(previousAddress1, 'zipCode', 'zip', 'postalCode', 'postal'), oldAddr1.zip),
      to: safeFirstValue(data.previousAddress1To, data.oldAddressTo1, pickObjectValue(previousAddress1, 'to', 'end', 'endDate', 'ngayChuyenDi'))
    }
    const normalizeAddressComparePart = (value, field = '') => {
      const compact = optionKey(value).replace(/[^A-Z0-9]+/g, '')
      if (field === 'country') {
        if (['US', 'USA', 'UNITEDSTATES', 'UNITEDSTATESOFAMERICA', 'AMERICA', 'HOAKY', 'MY'].includes(compact)) return 'USA'
        if (['VN', 'VIETNAM', 'VIETNAM'].includes(compact)) return 'VIETNAM'
      }
      return compact
    }
    const isPresentAddressEnd = (value) => {
      const key = optionKey(value)
      return !key || ['PRESENT', 'HIEN TAI', 'NOW', 'CURRENT'].includes(key)
    }
    const areAddressesSame = (left = {}, right = {}) => {
      const pairs = [
        ['country', left.country, right.country],
        ['line1', left.line1, right.line1],
        ['city', left.city, right.city],
        ['state', left.state, right.state],
        ['zip', left.zip, right.zip]
      ].map(([key, a, b]) => [key, normalizeAddressComparePart(a, key), normalizeAddressComparePart(b, key)])
        .filter(([, a, b]) => a && b)

      if (!pairs.some(([key]) => key === 'line1')) return false
      if (pairs.length < 3) return false
      return pairs.every(([, a, b]) => a === b)
    }
    const liveAtMailingAddressExplicit = safeFirstValue(data.liveAtMailingAddress, data.sameAsMailingAddress)
    const liveAtMailingAddressInferred = isPresentAddressEnd(previousAddress1ForCompare.to) && areAddressesSame(mailingAddressForCompare, previousAddress1ForCompare) ? 'YES' : ''
    const getEmployerAddress = (index) => {
      const sfx = String(index).padStart(2, '0')
      const employmentRecord = index === 1 ? petitionerEmployment1Record : petitionerEmployment2Record
      const fullAddress = safeFirstValue(
        data[`petitionerEmployer${index}Address`],
        data[`employer${index}Address`],
        data[`companyAddress${sfx}`],
        pickObjectValue(employmentRecord, 'diaChi', 'address', 'employerAddress')
      )
      const employerExplicitCountry = countryOnlyValue(
        data[`petitionerEmployer${index}Country`],
        data[`employer${index}Country`],
        data[`companyAddress${sfx}Country`],
        pickObjectValue(employmentRecord, 'country', 'quocGia')
      )
      const employerCountryFromAddress = countryFromAddressText(fullAddress)
      const employerRawLine1 = safeFirstValue(
        data[`petitionerEmployer${index}AddressLine1`],
        data[`employer${index}AddressLine1`],
        data[`companyAddress${sfx}Street`],
        data[`companyAddress${sfx}Line1`],
        pickObjectValue(employmentRecord, 'addressLine1', 'line1', 'street')
      )
      const employerRawCity = safeFirstValue(
        data[`petitionerEmployer${index}City`],
        data[`employer${index}City`],
        data[`companyAddress${sfx}City`],
        pickObjectValue(employmentRecord, 'city', 'huyen', 'thanhPho')
      )
      const employerRawState = safeFirstValue(
        data[`petitionerEmployer${index}State`],
        data[`employer${index}State`],
        data[`companyAddress${sfx}Province`],
        data[`companyAddress${sfx}State`],
        pickObjectValue(employmentRecord, 'province', 'state', 'tinh')
      )
      const employerRawZip = safeFirstValue(
        data[`petitionerEmployer${index}ZipCode`],
        data[`employer${index}ZipCode`],
        data[`companyZipCode${sfx}`],
        data[`companyAddress${sfx}ZipCode`],
        data[`companyAddress${sfx}PostalCode`],
        pickObjectValue(employmentRecord, 'zip', 'zipCode', 'postalCode')
      )
      const employerInferredCountry = inferUSCountryFromAddressParts({
        line1: employerRawLine1,
        city: employerRawCity,
        state: employerRawState,
        zip: employerRawZip,
        fullAddress
      })
      const isEmployerUS = employerCountryFromAddress === 'USA' ||
        employerExplicitCountry === 'USA' ||
        employerInferredCountry === 'USA' ||
        addressLooksUS(fullAddress)
      const parsed = safeSplitAddr(fullAddress, data, `petitionerEmployer${index}Address`, isEmployerUS)
      const rawStreet = safeFirstValue(
        employerRawLine1,
        parsed.street
      )
      const rawLine2 = safeFirstValue(
        data[`petitionerEmployer${index}AddressLine2`],
        data[`employer${index}AddressLine2`],
        data[`companyAddress${sfx}Line2`],
        data[`companyAddress${sfx}Street2`],
        pickObjectValue(employmentRecord, 'addressLine2', 'line2'),
        parsed.line2
      )
      const normalizedEmployerAddress = normalizeI130AAddressLines({
        line1: rawStreet,
        street: rawStreet,
        line2: rawLine2
      })
      const city = safeFirstValue(employerRawCity, parsed.city)
      const province = safeFirstValue(employerRawState, parsed.province)
      const zip = safeFirstValue(employerRawZip, parsed.zip)

      return {
        street: normalizedEmployerAddress.street,
        line2: normalizedEmployerAddress.line2,
        city,
        province,
        zip,
        country: safeFirstValue(
          employerCountryFromAddress,
          employerExplicitCountry,
          inferUSCountryFromAddressParts({
            line1: normalizedEmployerAddress.street,
            city,
            state: province,
            zip,
            fullAddress
          })
        )
      }
    }
    const employer1Addr = getEmployerAddress(1)
    const employer2Addr = getEmployerAddress(2)
    const marriagePlace = safeSplitAddr(safeFirstValue(data.currentMarriagePlace, data.marriagePlace, pickObjectValue(petitionerCurrentSpouseRecord, 'noiKetHon', 'marriagePlace', 'placeOfMarriage')), data, 'currentMarriagePlace', false)

    return [
      { label: 'For whom are you filing this petition?', val: getPetitionRelationship(), after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      ...(getPetitionRelationship() === 'CHILD' ? [
        { label: 'Which best describes your relationship?', val: getChildRelationshipDescription(), after: 'For whom are you filing this petition?', force: true }
      ] : []),
      ...(getPetitionRelationship() === 'PARENT' ? [
        { label: 'Which best describes your relationship?', val: getParentRelationshipDetail(), after: 'For whom are you filing this petition?', force: true }
      ] : []),
      ...(getPetitionRelationship() === 'SIBLING' ? [
        { label: 'Are you related by adoption?', val: asYesNo(getSiblingAdoption()), after: 'For whom are you filing this petition?', force: true }
      ] : []),
      { label: 'Has anyone else ever filed a petition for the beneficiary?', val: asYesNo(safeFirstValue(data.hasPriorPetitionForBeneficiary, data.tungDuocBaoLanh), hasRecordValue(previousPetition1) ? 'YES' : 'NO'), after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Given name (first name)', val: beneficiary.given, after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Middle name', val: beneficiary.middle, after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Family name (last name)', val: beneficiary.family, after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Has the beneficiary used any other names since birth?', val: (beneficiaryOther.given || beneficiaryOther.middle || beneficiaryOther.family) ? 'YES' : 'NO', after: 'NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: '(1) Given name (first name)', val: beneficiaryOther.given, after: 'Has the beneficiary used any other names since birth?' },
      { label: '(1) Middle name', val: beneficiaryOther.middle, after: 'Has the beneficiary used any other names since birth?' },
      { label: '(1) Family name (last name)', val: beneficiaryOther.family, after: 'Has the beneficiary used any other names since birth?' },

      { label: 'Daytime telephone number', val: safeFirstValue(data.beneficiaryDaytimePhone, data.soDienThoai, data.phoneNumber, data.contactPrimary), after: 'SĐT + EMAIL NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Mobile telephone number', val: safeFirstValue(data.beneficiaryMobilePhone, data.soDienThoai, data.mobilePhone), after: 'SĐT + EMAIL NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Email Address', val: safeFirstValue(data.beneficiaryEmail, data.emailAddress, data.email), after: 'SĐT + EMAIL NGƯỜI ĐƯỢC BẢO LÃNH' },

      { label: 'Country', val: safeFirstValue(data.beneficiaryCurrentCountry, beneficiaryCurrentAddr.country), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },
      { label: 'Address line 1', val: safeFirstValue(data.beneficiaryCurrentAddressLine1, beneficiaryCurrentAddr.street), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },
      { label: 'Address line 2', val: safeFirstValue(data.beneficiaryCurrentAddressLine2, beneficiaryCurrentAddr.line2), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },
      { label: 'City or town', val: safeFirstValue(data.beneficiaryCurrentCity, beneficiaryCurrentAddr.city), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },
      { label: 'State/Province', val: safeFirstValue(data.beneficiaryCurrentState, data.beneficiaryCurrentProvince, beneficiaryCurrentAddr.province), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },
      { label: 'ZIP code/Postal code', val: safeFirstValue(data.beneficiaryCurrentZipCode, data.beneficiaryCurrentPostalCode, beneficiaryCurrentAddr.zip), after: 'ĐỊA CHỈ ĐANG Ở / ĐỊA CHỈ Ở NGOÀI HOA KỲ' },

      { label: 'Address line 1', val: safeFirstValue(data.intendedUSAddressLine1, intendedUsAddr.street), after: 'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ' },
      { label: 'Address line 2', val: safeFirstValue(data.intendedUSAddressLine2, intendedUsAddr.line2), after: 'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ' },
      { label: 'City or town', val: safeFirstValue(data.intendedUSCity, intendedUsAddr.city), after: 'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ' },
      { label: 'State', val: safeFirstValue(data.intendedUSState, intendedUsAddr.province), after: 'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ' },
      { label: 'ZIP code', val: safeFirstValue(data.intendedUSZipCode, intendedUsAddr.zip), after: 'ĐỊA CHỈ DỰ ĐỊNH Ở KHI TỚI HOA KỲ' },

      { label: 'Country', val: safeFirstValue(data.beneficiaryForeignCountry, beneficiaryForeignAddr.country), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },
      { label: 'Address line 1', val: safeFirstValue(data.beneficiaryForeignAddressLine1, beneficiaryForeignAddr.street), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },
      { label: 'Address line 2', val: safeFirstValue(data.beneficiaryForeignAddressLine2, beneficiaryForeignAddr.line2), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },
      { label: 'City or town', val: safeFirstValue(data.beneficiaryForeignCity, beneficiaryForeignAddr.city), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },
      { label: 'Province', val: safeFirstValue(data.beneficiaryForeignProvince, beneficiaryForeignAddr.province), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },
      { label: 'Postal code', val: safeFirstValue(data.beneficiaryForeignPostalCode, beneficiaryForeignAddr.zip), after: 'ĐỊA CHỈ SỐNG Ở NGOÀI HOA KỲ (NẾU KHÁC VỚI ĐỊA CHỈ HIỆN TẠI)' },

      { label: 'Country', val: safeFirstValue(data.lastSharedSpouseCountry, jointAddr.country), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'Address line 1', val: safeFirstValue(data.lastSharedSpouseAddressLine1, jointAddr.street), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'Address line 2', val: safeFirstValue(data.lastSharedSpouseAddressLine2, jointAddr.line2), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'City or town', val: safeFirstValue(data.lastSharedSpouseCity, jointAddr.city), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'State/Province', val: safeFirstValue(data.lastSharedSpouseState, data.lastSharedSpouseProvince, jointAddr.province), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'ZIP code/Postal code', val: safeFirstValue(data.lastSharedSpouseZipCode, data.lastSharedSpousePostalCode, jointAddr.zip), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'From', val: safeFirstValue(data.lastSharedSpouseFrom, beneficiarySource.lastSharedSpouseFrom, pickObjectValue(currentSpouseRecord, 'ngayBatDauSongChung', 'from')), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },
      { label: 'To', val: safeFirstValue(data.lastSharedSpouseTo, beneficiarySource.lastSharedSpouseTo, pickObjectValue(currentSpouseRecord, 'ngayKetThucSongChung', 'to')) || (safeFirstValue(data.lastSharedSpouseFrom, beneficiarySource.lastSharedSpouseFrom, pickObjectValue(currentSpouseRecord, 'ngayBatDauSongChung', 'from')) ? 'PRESENT' : ''), after: 'ĐỊA CHỈ SỐNG CHUNG VỚI NGƯỜI HÔN PHỐI GẦN ĐÂY NHẤT' },

      { label: 'Alien Registration Number (A-Number)', val: safeFirstValue(data.beneficiaryANumber, pickObjectValue(beneficiarySource, 'beneficiaryANumber', 'aNumber')), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'USCIS Online Account Number', val: safeFirstValue(data.beneficiaryUSCISOnlineAccountNumber, pickObjectValue(beneficiarySource, 'beneficiaryUSCISOnlineAccountNumber', 'uscisOnlineAccountNumber')), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'U.S. Social Security Number', val: safeFirstValue(data.beneficiarySSN, pickObjectValue(beneficiarySource, 'beneficiarySSN', 'ssn', 'socialSecurityNumber')), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Date of birth', val: safeFirstValue(data.beneficiaryBirthDate, data.ngaySinh, data.birthDate), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Country of birth', val: safeFirstValue(beneficiaryBirthPlace.country, 'VIETNAM'), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'City/Town/Village of birth', val: beneficiaryBirthPlace.city, after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Gender', val: translateGender(safeFirstValue(data.beneficiaryGender, data.gioiTinh, data.gender)), after: 'THÔNG TIN THÊM NGƯỜI ĐƯỢC BẢO LÃNH' },

      { label: 'Was the beneficiary EVER in the United States?', val: asYesNo(safeFirstValue(data.beneficiaryEverInUS, data.tungNhapCanhMy), hasRecordValue(usEntry1) ? 'YES' : 'NO'), after: 'THÔNG TIN NHẬP CƯ' },
      { label: 'Class of Admission', val: safeFirstValue(data.classOfAdmission, pickObjectValue(usEntry1, 'dien', 'classOfAdmission', 'visaType')), after: 'THÔNG TIN NHẬP CƯ' },
      { label: 'Form I-94 Arrival-Departure Record Number', val: safeFirstValue(data.i94Number, pickObjectValue(usEntry1, 'i94Number')), after: 'THÔNG TIN NHẬP CƯ' },
      { label: 'Date of Arrival', val: safeFirstValue(data.dateOfArrival, pickObjectValue(usEntry1, 'ngayNhapCanh', 'dateOfArrival', 'arrivalDate')), after: 'THÔNG TIN NHẬP CƯ' },
      { label: 'Date authorized stay expired, or will expire, as shown on Form I-94', val: safeFirstValue(data.authorizedStayExpireDate, pickObjectValue(usEntry1, 'authorizedStayExpireDate', 'stayExpireDate')), after: 'THÔNG TIN NHẬP CƯ' },

      { label: 'Passport number', val: safeFirstValue(data.passportNumber, data.passport), after: 'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH' },
      { label: 'Travel Document number', val: safeFirstValue(data.travelDocumentNumber), after: 'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH' },
      { label: 'Country of issuance for passport or travel document', val: safeFirstValue(data.passportIssueCountry, passportIssuePlace.country, safeFirstValue(data.passportNumber, data.passport) ? 'VIETNAM' : ''), after: 'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH' },
      { label: 'Expiration date for passport or travel document', val: safeFirstValue(data.passportExpirationDate, data.ngayHetHanPassport), after: 'THÔNG TIN HỘ CHIẾU / GIẤY THÔNG HÀNH' },

      { label: 'Was the beneficiary EVER in immigration proceedings?', val: asYesNo(safeFirstValue(data.tungNhapCanhMy, beneficiarySource.tungNhapCanhMy, data.beneficiaryEverInUS, beneficiarySource.beneficiaryEverInUS, data.beneficiaryImmigrationProceedings, beneficiarySource.beneficiaryImmigrationProceedings)), after: 'THỦ TỤC DI TRÚ' },
      { label: 'Type of proceedings', val: safeFirstValue(data.immigrationProceedingType), after: 'THỦ TỤC DI TRÚ' },
      { label: 'Where were the proceedings held?', val: safeFirstValue(data.immigrationProceedingPlace), after: 'THỦ TỤC DI TRÚ' },
      { label: 'City or town', val: safeFirstValue(data.immigrationProceedingCity), after: 'Where were the proceedings held?' },
      { label: 'State', val: safeFirstValue(data.immigrationProceedingState), after: 'Where were the proceedings held?' },
      { label: 'Date', val: safeFirstValue(data.immigrationProceedingDate), after: 'Where were the proceedings held?' },

      { label: '(1) Name of current employer', val: safeFirstValue(getEmploymentEmployerName(beneficiaryCurrentEmploymentRecord), cleanEmployerName(data.currentEmployerName)), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) Country', val: safeFirstValue(data.currentEmployerCountry, currentEmployerAddr.country), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) Address line 1', val: safeFirstValue(data.currentEmployerAddressLine1, currentEmployerAddr.street), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) Address line 2', val: safeFirstValue(data.currentEmployerAddressLine2, currentEmployerAddr.line2), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) City or town', val: safeFirstValue(data.currentEmployerCity, currentEmployerAddr.city), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) State/Province', val: safeFirstValue(data.currentEmployerState, data.currentEmployerProvince, currentEmployerAddr.province), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) ZIP code/Postal code', val: safeFirstValue(data.currentEmployerZipCode, data.currentEmployerPostalCode, currentEmployerAddr.zip), after: 'VIỆC LÀM HIỆN TẠI' },
      { label: '(1) Date employment began', val: safeFirstValue(data.currentEmploymentBeginDate, pickObjectValue(beneficiaryCurrentEmploymentRecord, 'ngayNhanViec', 'from', 'startDate', 'ngayBatDau')), after: 'VIỆC LÀM HIỆN TẠI' },

      { label: "What is the beneficiary's current marital status?", val: translateMaritalStatus(beneficiaryMaritalStatus), after: 'THÔNG TIN GIA ĐÌNH NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'How many times has the beneficiary been married?', val: safeFirstValue(data.beneficiaryMarriageCount, data.numberOfMarriages, beneficiaryMarriageCount), after: 'THÔNG TIN GIA ĐÌNH NGƯỜI ĐƯỢC BẢO LÃNH' },

      { label: 'Given name (first name)', val: beneficiarySpouse.given, after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Middle name', val: beneficiarySpouse.middle, after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Family name (last name)', val: beneficiarySpouse.family, after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Date married', val: beneficiaryHasCurrentSpouse ? safeFirstValue(data.beneficiaryCurrentMarriageDate, beneficiarySource.beneficiaryCurrentMarriageDate, pickObjectValue(currentSpouseRecord, 'ngayKetHon', 'marriageDate'), hasSeparatedSources ? '' : data.marriageDate) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'Country of marriage', val: beneficiaryHasCurrentSpouse ? safeFirstValue(data.beneficiaryMarriageCountry, beneficiaryMarriagePlace.country) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'State or province of marriage', val: beneficiaryHasCurrentSpouse ? safeFirstValue(data.beneficiaryMarriageProvince, data.beneficiaryMarriageState, beneficiaryMarriagePlace.province) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: 'City or town of marriage', val: beneficiaryHasCurrentSpouse ? safeFirstValue(data.beneficiaryMarriageCity, beneficiaryMarriagePlace.city) : '', after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: "Date the beneficiary's last marriage ended", val: safeFirstValue(data.beneficiaryLastMarriageEndDate, beneficiarySource.beneficiaryLastMarriageEndDate, pickObjectValue(formerSpouseRecord, 'ngayLyHon', 'marriageEndDate'), pickObjectValue(deceasedSpouseRecord, 'ngayMat', 'dateOfDeath'), hasSeparatedSources ? '' : data.divorceDate), after: 'CUỘC HÔN NHÂN HIỆN TẠI CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },

      { label: '(1) Given name (first name)', val: beneficiaryFormerSpouse.given, after: 'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: '(1) Middle name', val: beneficiaryFormerSpouse.middle, after: 'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: '(1) Family name (last name)', val: beneficiaryFormerSpouse.family, after: 'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },
      { label: '(1) When did your marriage end?', val: safeFirstValue(data.beneficiaryFormerMarriageEndDate, pickObjectValue(formerSpouseRecord, 'ngayLyHon', 'marriageEndDate'), pickObjectValue(deceasedSpouseRecord, 'ngayMat', 'dateOfDeath')), after: 'CUỘC HÔN NHÂN TRƯỚC ĐÂY CỦA NGƯỜI ĐƯỢC BẢO LÃNH' },

      { label: '(1) Given name (first name)', val: beneficiaryChildSectionValue(child1.given), after: 'THÔNG TIN CON' },
      { label: '(1) Middle name', val: beneficiaryChildSectionValue(child1.middle), after: 'THÔNG TIN CON' },
      { label: '(1) Family name (last name)', val: beneficiaryChildSectionValue(child1.family), after: 'THÔNG TIN CON' },
      { label: "(1) What is your child's relationship to beneficiary?", val: beneficiaryChildSectionValue(data.child1Relationship, pickObjectValue(child1Record, 'relationship', 'moiQuanHe', 'quanHe')), after: 'THÔNG TIN CON' },
      { label: '(1) Date of birth', val: beneficiaryChildSectionValue(data.child1BirthDate, pickObjectValue(child1Record, 'ngaySinh', 'birthDate')), after: 'THÔNG TIN CON' },
      { label: '(1) Country of birth', val: beneficiaryChildSectionValue(data.child1BirthCountry, child1BirthPlace.country), after: 'THÔNG TIN CON' },
      { label: '(2) Given name (first name)', val: beneficiaryChildSectionValue(child2.given), after: 'THÔNG TIN CON' },
      { label: '(2) Middle name', val: beneficiaryChildSectionValue(child2.middle), after: 'THÔNG TIN CON' },
      { label: '(2) Family name (last name)', val: beneficiaryChildSectionValue(child2.family), after: 'THÔNG TIN CON' },
      { label: "(2) What is your child's relationship to beneficiary?", val: beneficiaryChildSectionValue(data.child2Relationship, pickObjectValue(child2Record, 'relationship', 'moiQuanHe', 'quanHe')), after: 'THÔNG TIN CON' },
      { label: '(2) Date of birth', val: beneficiaryChildSectionValue(data.child2BirthDate, pickObjectValue(child2Record, 'ngaySinh', 'birthDate')), after: 'THÔNG TIN CON' },
      { label: '(2) Country of birth', val: beneficiaryChildSectionValue(data.child2BirthCountry, child2BirthPlace.country), after: 'THÔNG TIN CON' },

      { label: 'At which USCIS office will the beneficiary apply for adjustment of status to lawful permanent resident?', val: safeFirstValue(data.adjustmentStatusOffice, data.uscisAdjustmentOffice), after: 'ĐỊA ĐIỂM NỘP HỒ SƠ' },
      { label: 'City or town', val: safeFirstValue(data.adjustmentStatusCity, data.uscisAdjustmentCity), after: 'At which USCIS office will the beneficiary apply for adjustment of status' },
      { label: 'State', val: safeFirstValue(data.adjustmentStatusState, data.uscisAdjustmentState), after: 'At which USCIS office will the beneficiary apply for adjustment of status' },
      { label: 'At which U.S. Embassy or Consulate location will the beneficiary apply for an immigrant visa?', val: safeFirstValue(data.immigrantVisaConsulate, data.consulateName), after: 'ĐỊA ĐIỂM NỘP HỒ SƠ' },
      { label: 'Country', val: safeFirstValue(data.immigrantVisaCountry, data.consulateCountry, isBeneficiaryInVietnam ? 'VIETNAM' : ''), after: 'At which U.S. Embassy or Consulate location will the beneficiary apply for an immigrant visa?' },
      { label: 'City or town', val: safeFirstValue(data.immigrantVisaCity, data.consulateCity, isBeneficiaryInVietnam ? 'HO CHI MINH' : ''), after: 'At which U.S. Embassy or Consulate location will the beneficiary apply for an immigrant visa?' },
      { label: 'Province', val: safeFirstValue(data.immigrantVisaProvince, data.consulateProvince, isBeneficiaryInVietnam ? 'HO CHI MINH' : ''), after: 'At which U.S. Embassy or Consulate location will the beneficiary apply for an immigrant visa?' },

      { label: 'Is someone assisting you with completing this petition?', val: asYesNo(data.isAssisted || data.hasPreparer, 'NO') },
      { label: 'Given name (first name)', val: petitioner.given, after: 'TÊN NGƯỜI BẢO LÃNH' },
      { label: 'Middle name', val: petitioner.middle, after: 'TÊN NGƯỜI BẢO LÃNH' },
      { label: 'Family name (last name)', val: petitioner.family, after: 'TÊN NGƯỜI BẢO LÃNH' },
      { label: 'Have you used any other names since birth?', val: (petitionerOther.given || petitionerOther.middle || petitionerOther.family) ? 'YES' : 'NO' },
      { label: 'Given name (first name)', val: petitionerOther.given, after: 'Have you used any other names since birth?' },
      { label: 'Middle name', val: petitionerOther.middle, after: 'Have you used any other names since birth?' },
      { label: 'Family name (last name)', val: petitionerOther.family, after: 'Have you used any other names since birth?' },

      { label: 'Daytime telephone number', val: safeFirstValue(data.petitionerDaytimePhone, data.daytimePhone, data.contactPrimary) },
      { label: 'Mobile telephone number', val: safeFirstValue(data.petitionerMobilePhone, data.mobilePhone, data.contactPrimary) },
      { label: 'Email Address', val: safeFirstValue(data.petitionerEmail, data.emailAddress, data.email) },

      { label: 'In care of name', val: (() => {
        const rawName = safeFirstValue(data.inCareOfName, data.petitionerInCareOfName)
        if (rawName) {
          const split = splitNameValue(rawName)
          return [split.given, split.middle, split.family].filter(Boolean).join(' ')
        }
        return [petitioner.given, petitioner.middle, petitioner.family].filter(Boolean).join(' ')
      })() },
      { label: 'Country', val: safeFirstValue(data.petitionerMailingCountry, data.mailingAddressCountry, data.diaChiNhanThuMyCountry, mailingAddr.country, data.currentAddressCountryVN), after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'Address line 1', val: normalizeI130AAddressLines({ line1: safeFirstValue(data.petitionerMailingAddressLine1, data.mailingAddressLine1, data.diaChiNhanThuMyStreet, data.diaChiNhanThuMyLine1, mailingAddr.street), line2: safeFirstValue(data.petitionerMailingAddressLine2, data.mailingAddressLine2, data.diaChiNhanThuMyLine2, mailingAddr.line2) }).line1, after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'Address line 2', val: normalizeI130AAddressLines({ line1: safeFirstValue(data.petitionerMailingAddressLine1, data.mailingAddressLine1, data.diaChiNhanThuMyStreet, data.diaChiNhanThuMyLine1, mailingAddr.street), line2: safeFirstValue(data.petitionerMailingAddressLine2, data.mailingAddressLine2, data.diaChiNhanThuMyLine2, mailingAddr.line2) }).line2, after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'City or town', val: safeFirstValue(data.petitionerMailingCity, data.mailingAddressCity, data.diaChiNhanThuMyCity, mailingAddr.city), after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'State/Province', val: safeFirstValue(data.petitionerMailingState, data.mailingAddressState, data.diaChiNhanThuMyState, data.diaChiNhanThuMyProvince, mailingAddr.province), after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'ZIP code/Postal code', val: safeFirstValue(data.petitionerMailingZipCode, data.mailingAddressZipCode, data.diaChiNhanThuMyZipCode, data.diaChiNhanThuMyZip, mailingAddr.zip), after: 'ĐỊA CHỈ NHẬN THƯ' },
      { label: 'Do you live at your current mailing address?', val: asYesNo(safeFirstValue(liveAtMailingAddressInferred, liveAtMailingAddressExplicit), 'NO') },

      { label: '(1) Country', val: previousAddress1Country, after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) Address line 1', val: normalizeI130AAddressLines({ line1: safeFirstValue(data.previousAddress1Line1, pickObjectValue(previousAddress1, 'addressLine1', 'line1', 'street'), oldAddr1.street), line2: safeFirstValue(data.previousAddress1Line2, pickObjectValue(previousAddress1, 'addressLine2', 'line2'), oldAddr1.line2) }).line1, after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) Address line 2', val: normalizeI130AAddressLines({ line1: safeFirstValue(data.previousAddress1Line1, pickObjectValue(previousAddress1, 'addressLine1', 'line1', 'street'), oldAddr1.street), line2: safeFirstValue(data.previousAddress1Line2, pickObjectValue(previousAddress1, 'addressLine2', 'line2'), oldAddr1.line2) }).line2, after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) City or town', val: safeFirstValue(data.previousAddress1City, pickObjectValue(previousAddress1, 'city', 'thanhPho', 'huyen'), oldAddr1.city), after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) State/Province', val: safeFirstValue(data.previousAddress1State, pickObjectValue(previousAddress1, 'state', 'province', 'tinh'), oldAddr1.province), after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) ZIP code/Postal code', val: safeFirstValue(data.previousAddress1ZipCode, pickObjectValue(previousAddress1, 'zipCode', 'zip', 'postalCode'), oldAddr1.zip), after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) From', val: safeFirstValue(data.previousAddress1From, data.oldAddressFrom1, previousAddress1.start, previousAddress1.ngayBatDau), after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },
      { label: '(1) To', val: safeFirstValue(data.previousAddress1To, data.oldAddressTo1, previousAddress1.end, previousAddress1.ngayChuyenDi) || (safeFirstValue(data.previousAddress1From, data.oldAddressFrom1, previousAddress1.start, previousAddress1.ngayBatDau) ? 'PRESENT' : ''), after: 'ĐỊA CHỈ CŨ TRONG 5 NĂM QUA' },

      { label: 'What is your gender?', val: translateGender(safeFirstValue(data.petitionerGender, data.gender, data.q15_giiTinh, data.gioiTinh)) },
      { label: 'What is your ethnicity?', val: translateEthnicity(safeFirstValue(data.ethnicity, data.petitionerEthnicity, data.q115_coPhai, data.danToc, data.dan_toc)) },
      { label: 'What is your race?', val: translateRace(safeFirstValue(data.race, data.petitionerRace, data.q118_chungTc, data.q118_chungToc, data.chungToc, data.chung_toc)) },
      { label: 'What is your height?', val: formatHeight(safeFirstValue(data.height, data.petitionerHeight, data.q112_chiuCao, data.q112_chieuCao, data.chieuCao, data.chieu_cao)) },
      { label: 'What is your weight?', val: formatWeight(safeFirstValue(data.weight, data.petitionerWeight, data.q114_canNng, data.q114_canNang, data.canNang, data.can_nang)) },
      { label: 'What is the color of your eyes?', val: translateColor(safeFirstValue(data.eyeColor, data.petitionerEyeColor, data.q116_mauMt_other, data.q116_mauMat_other, data.q116_mauMt, data.q116_mauMat, data.mauMat, data.mau_mat), 'eye') },
      { label: 'What is the color of your hair?', val: translateColor(safeFirstValue(data.hairColor, data.petitionerHairColor, data.q117_mauToc_other, data.q117_mauToc, data.mauToc, data.mau_toc), 'hair') },

      { label: '(1) What is the name of the employer?', val: safeFirstValue(data.employer1Name, data.companyName01, data.petitionerEmployer1Name, pickObjectValue(petitionerEmployment1Record, 'tenCongTy', 'companyName', 'employerName')), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) Country', val: safeFirstValue(data.employer1Country, employer1Addr.country), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) Address line 1', val: safeFirstValue(data.employer1AddressLine1, employer1Addr.street), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) Address line 2', val: safeFirstValue(data.employer1AddressLine2, employer1Addr.line2), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) City or town', val: safeFirstValue(data.employer1City, employer1Addr.city), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) State/Province', val: safeFirstValue(data.employer1State, employer1Addr.province), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) ZIP code/Postal code', val: safeFirstValue(data.employer1ZipCode, employer1Addr.zip), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) What was your occupation?', val: safeFirstValue(data.employer1Occupation, data.petitionerEmployer1Occupation, data.occupationTitle01, pickObjectValue(petitionerEmployment1Record, 'ngheNghiep', 'occupation', 'jobTitle')), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) From', val: safeFirstValue(data.employer1From, data.petitionerEmployer1From, data.occupationFrom01, data.employmentStartDate01, pickObjectValue(petitionerEmployment1Record, 'ngayNhanViec', 'from', 'startDate', 'ngayBatDau')), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(1) To', val: safeFirstValue(data.employer1To, data.petitionerEmployer1To, data.occupationTo01, data.employmentEndDate01, pickObjectValue(petitionerEmployment1Record, 'ngayNghiViec', 'to', 'endDate', 'ngayKetThuc')) || (safeFirstValue(data.employer1From, data.petitionerEmployer1From, data.occupationFrom01, data.employmentStartDate01, pickObjectValue(petitionerEmployment1Record, 'ngayNhanViec', 'from', 'startDate', 'ngayBatDau')) ? 'PRESENT' : ''), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(2) What is the name of the employer?', val: safeFirstValue(data.employer2Name, data.companyName02, pickObjectValue(petitionerEmployment2Record, 'tenCongTy', 'companyName', 'employerName')), after: 'VIỆC LÀM TRONG 5 NĂM QUA' },
      { label: '(2) Country', val: safeFirstValue(data.employer2Country, employer2Addr.country), after: '(2) What is the name of the employer?' },
      { label: '(2) Address line 1', val: safeFirstValue(data.employer2AddressLine1, employer2Addr.street), after: '(2) What is the name of the employer?' },
      { label: '(2) Address line 2', val: safeFirstValue(data.employer2AddressLine2, employer2Addr.line2), after: '(2) What is the name of the employer?' },
      { label: '(2) City or town', val: safeFirstValue(data.employer2City, employer2Addr.city), after: '(2) What is the name of the employer?' },
      { label: '(2) State/Province', val: safeFirstValue(data.employer2State, employer2Addr.province), after: '(2) What is the name of the employer?' },
      { label: '(2) ZIP code/Postal code', val: safeFirstValue(data.employer2ZipCode, employer2Addr.zip), after: '(2) What is the name of the employer?' },
      { label: '(2) What was your occupation?', val: safeFirstValue(data.employer2Occupation, data.petitionerEmployer2Occupation, data.occupationTitle02, pickObjectValue(petitionerEmployment2Record, 'ngheNghiep', 'occupation', 'jobTitle')), after: '(2) What is the name of the employer?' },
      { label: '(2) From', val: safeFirstValue(data.employer2From, data.petitionerEmployer2From, data.occupationFrom02, data.employmentStartDate02, pickObjectValue(petitionerEmployment2Record, 'ngayNhanViec', 'from', 'startDate', 'ngayBatDau')), after: '(2) What is the name of the employer?' },
      { label: '(2) To', val: safeFirstValue(data.employer2To, data.petitionerEmployer2To, data.occupationTo02, data.employmentEndDate02, pickObjectValue(petitionerEmployment2Record, 'ngayNghiViec', 'to', 'endDate', 'ngayKetThuc')) || (safeFirstValue(data.employer2From, data.petitionerEmployer2From, data.occupationFrom02, data.employmentStartDate02, pickObjectValue(petitionerEmployment2Record, 'ngayNhanViec', 'from', 'startDate', 'ngayBatDau')) ? 'PRESENT' : ''), after: '(2) What is the name of the employer?' },

      { label: 'What is your current immigration status?', val: translateImmigrationStatus(safeFirstValue(data.currentImmigrationStatus, data.petitionerStatus)) },
      { label: 'Did you gain lawful permanent resident status or citizenship through adoption?', val: asYesNo(data.citizenshipThroughAdoption, 'NO') },
      { label: 'What is your A-Number?', val: safeFirstValue(data.aNumber, data.petitionerANumber) },
      { label: 'What is your USCIS Online Account Number?', val: safeFirstValue(data.uscisOnlineAccountNumber, data.petitionerUSCISOnlineAccountNumber) },
      { label: 'What is your U.S. Social Security number?', val: safeFirstValue(data.ssn, data.socialSecurityNumber) },
      { label: 'What is your date of birth?', val: safeFirstValue(data.petitionerBirthDate, data.birthDate, data.ngaySinh) },
      { label: 'What is your country of birth?', val: safeFirstValue(petitionerBirthPlace.country, 'VIETNAM') },
      { label: 'What is your city, town, or village of birth?', val: petitionerBirthPlace.city },
      
      { label: 'What is your class of admission?', val: safeFirstValue(data.petitionerClassOfAdmission, data.lprClassOfAdmission, data.classOfAdmission, pickObjectValue(petitionerSource, 'classOfAdmission', 'class')), after: 'THÔNG TIN CHO THƯỜNG TRÚ NHÂN' },
      { label: 'What was your date of admission?', val: safeFirstValue(data.petitionerDateOfAdmission, data.lprDateOfAdmission, data.dateOfAdmission, pickObjectValue(petitionerSource, 'dateOfAdmission', 'ngayCapTheGreenCard', 'ngayGreenCard')), after: 'What is your class of admission?' },
      { label: 'City or Town', val: safeFirstValue(data.petitionerPlaceOfAdmissionCity, data.lprPlaceOfAdmissionCity, data.placeOfAdmissionCity, pickObjectValue(petitionerSource, 'placeOfAdmissionCity', 'placeOfAdmission')), after: 'What was your date of admission?' },
      { label: 'State', val: safeFirstValue(data.petitionerPlaceOfAdmissionState, data.lprPlaceOfAdmissionState, data.placeOfAdmissionState, pickObjectValue(petitionerSource, 'placeOfAdmissionState', 'stateOfAdmission')), after: 'City or Town' },
      { label: 'Did you gain lawful permanent resident status through marriage to a U.S. citizen or lawful permanent resident?', val: asYesNo(safeFirstValue(data.petitionerLPRMarriage, data.lprThroughMarriage, data.gainedPRThroughMarriage, pickObjectValue(petitionerSource, 'lprThroughMarriage', 'residentStatusThroughMarriage'))), after: 'State' },

      { label: 'How did you obtain U.S. citizenship?', val: translateCitizenshipType(safeFirstValue(data.howObtainedCitizenship, data.citizenshipMethod, data.dienQuocTich)) },
      { label: 'Have you obtained a Certificate of Naturalization or a Certificate of Citizenship?', val: asYesNo(data.hasNaturalizationCertificate) },
      { label: 'What is your Certificate Number?', val: safeFirstValue(data.certificateNumber, data.naturalizationCertificateNumber) },
      { label: 'Where was the Certificate issued?', val: safeFirstValue(data.certificateIssuedPlace, data.naturalizationCertificateIssuedPlace) },
      { label: 'On what date was the Certificate issued?', val: safeFirstValue(data.certificateIssuedDate, data.naturalizationCertificateIssuedDate) },

      { label: 'What is your current marital status?', val: translateMaritalStatus(safeFirstValue(data.maritalStatus, data.currentMaritalStatus, data.tinhTrangHonNhan)) },
      { label: 'How many times have you been married?', val: petitionerMarriageCount },

      { label: 'Given name (first name)', val: spouse.given, after: 'CUỘC HÔN NHÂN HIỆN TẠI' },
      { label: 'Middle name', val: spouse.middle, after: 'CUỘC HÔN NHÂN HIỆN TẠI' },
      { label: 'Family name (last name)', val: spouse.family, after: 'CUỘC HÔN NHÂN HIỆN TẠI' },
      { label: 'On what date did you marry your current spouse?', val: hasCurrentSpouse ? safeFirstValue(data.currentMarriageDate, data.marriageDate, pickObjectValue(petitionerCurrentSpouseRecord, 'ngayKetHon', 'marriageDate')) : '' },
      { label: 'Country of marriage', val: hasCurrentSpouse ? safeFirstValue(data.marriageCountry, beneficiaryMarriagePlace.country, marriagePlace.country) : '' },
      { label: 'State of marriage', val: hasCurrentSpouse ? safeFirstValue(data.marriageState, beneficiaryMarriagePlace.province, marriagePlace.province) : '' },
      { label: 'City or town of marriage', val: hasCurrentSpouse ? safeFirstValue(data.marriageCity, beneficiaryMarriagePlace.city, marriagePlace.city) : '' },
      { label: 'When did your last marriage end?', val: safeFirstValue(data.lastMarriageEndDate, pickObjectValue(petitionerFormerSpouseRecord, 'ngayLyHon', 'marriageEndDate'), pickObjectValue(petitionerDeceasedSpouseRecord, 'ngayMat', 'dateOfDeath'), data.divorceDate) },

      { label: '(1) Given name (first name)', val: formerSpouse.given, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(1) Middle name', val: formerSpouse.middle, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(1) Family name (last name)', val: formerSpouse.family, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(1) When did your marriage end?', val: safeFirstValue(data.formerMarriageEndDate, pickObjectValue(petitionerFormerSpouseRecord, 'ngayLyHon', 'marriageEndDate'), data.divorceDate), after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(2) Given name (first name)', val: formerSpouse2.given, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(2) Middle name', val: formerSpouse2.middle, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(2) Family name (last name)', val: formerSpouse2.family, after: 'CUỘC HÔN NHÂN CŨ' },
      { label: '(2) When did your marriage end?', val: safeFirstValue(data.formerMarriage2EndDate, pickObjectValue(petitionerFormerSpouseRecord2, 'ngayLyHon', 'marriageEndDate')), after: 'CUỘC HÔN NHÂN CŨ' },

      { label: 'Given name (first name)', val: father.given, after: 'THÔNG TIN CHA' },
      { label: 'Middle name', val: father.middle, after: 'THÔNG TIN CHA' },
      { label: 'Family name (last name)', val: father.family, after: 'THÔNG TIN CHA' },
      { label: 'What is their date of birth?', val: safeFirstValue(data.fatherBirthDate, pickObjectValue(fatherRecord, 'ngaySinh', 'birthDate')), after: 'THÔNG TIN CHA' },
      { label: 'What is their gender?', val: 'MALE', after: 'THÔNG TIN CHA' },
      { label: 'What is their country of birth?', val: fatherBirthCountry, after: 'THÔNG TIN CHA' },
      { label: 'What is their city/town/village of residence?', val: fatherResidence.city, after: 'THÔNG TIN CHA' },
      { label: 'What is their country of residence?', val: fatherResidence.country, force: fatherResidence.city === 'DECEASED', after: 'THÔNG TIN CHA' },

      { label: 'Given name (first name)', val: mother.given, after: 'THÔNG TIN MẸ' },
      { label: 'Middle name', val: mother.middle, after: 'THÔNG TIN MẸ' },
      { label: 'Family name (last name)', val: mother.family, after: 'THÔNG TIN MẸ' },
      { label: 'What is their date of birth?', val: safeFirstValue(data.motherBirthDate, pickObjectValue(motherRecord, 'ngaySinh', 'birthDate')), after: 'THÔNG TIN MẸ' },
      { label: 'What is their gender?', val: 'FEMALE', after: 'THÔNG TIN MẸ' },
      { label: 'What is their country of birth?', val: motherBirthCountry, after: 'THÔNG TIN MẸ' },
      { label: 'What is their city/town/village of residence?', val: motherResidence.city, after: 'THÔNG TIN MẸ' },
      { label: 'What is their country of residence?', val: motherResidence.country, force: motherResidence.city === 'DECEASED', after: 'THÔNG TIN MẸ' },

      { label: 'Have you EVER previously filed a petition for this beneficiary or any other alien?', val: asYesNo(safeFirstValue(data.previouslyFiledPetition, data.tungBaoLanh, data.tungDuocBaoLanh), hasRecordValue(previousPetition1) ? 'YES' : 'NO') },
      { label: '(1) Given name (first name)', val: splitVNName(data.previousPetitionBeneficiaryName).given, after: 'Have you EVER previously filed a petition' },
      { label: '(1) Middle name', val: splitVNName(data.previousPetitionBeneficiaryName).middle, after: 'Have you EVER previously filed a petition' },
      { label: '(1) Family name (last name)', val: splitVNName(data.previousPetitionBeneficiaryName).family, after: 'Have you EVER previously filed a petition' },
      { label: '(1) WHERE WAS THE PETITION FILED?', val: safeFirstValue(data.previousPetitionFiledPlace, pickObjectValue(previousPetition1, 'trungTamUscis', 'uscisCenter')), after: 'Have you EVER previously filed a petition' },
      { label: '(1) City or town', val: safeFirstValue(data.previousPetitionFiledCity), after: 'WHERE WAS THE PETITION FILED?' },
      { label: '(1) State', val: safeFirstValue(data.previousPetitionFiledState), after: 'WHERE WAS THE PETITION FILED?' },
      { label: '(1) When was the petition filed?', val: safeFirstValue(data.previousPetitionFiledDate, pickObjectValue(previousPetition1, 'ngayUuTien', 'priorityDate', 'filedDate')), after: 'WHERE WAS THE PETITION FILED?' },
      { label: '(1) What was the result?', val: safeFirstValue(data.previousPetitionResult, pickObjectValue(previousPetition1, 'ketQua', 'result')), after: 'WHERE WAS THE PETITION FILED?' },

      { label: 'Are you submitting separate petitions for other relatives?', val: asYesNo(safeFirstValue(data.submittingSeparatePetitions, data.dangBaoLanhAiKhac)) },
      { label: 'Given name (first name)', val: otherRelative1.given, after: 'Are you submitting separate petitions' },
      { label: 'Middle name', val: otherRelative1.middle, after: 'Are you submitting separate petitions' },
      { label: 'Family name (last name)', val: otherRelative1.family, after: 'Are you submitting separate petitions' },
      { label: 'Relationship', val: safeFirstValue(data.otherRelativeRelationship1, data.separatePetitionRelative1Relationship), after: 'Are you submitting separate petitions' },
      { label: 'Given name (first name)', val: otherRelative2.given, after: 'Relationship' },
      { label: 'Middle name', val: otherRelative2.middle, after: 'Relationship' },
      { label: 'Family name (last name)', val: otherRelative2.family, after: 'Relationship' },
      { label: 'Relationship', val: safeFirstValue(data.otherRelativeRelationship2, data.separatePetitionRelative2Relationship), after: 'Relationship' }
    ]
}
