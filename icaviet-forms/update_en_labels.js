const fs = require('fs');
const path = 'c:/Users/PC/Downloads/plugin-ica/icaviet-forms/forms/ds-160/schema.json';
const schema = JSON.parse(fs.readFileSync(path, 'utf8'));

const fieldMap = {
  // Part 1: Personal Information
  "fullName": "Surnames and Given Names",
  "otherName": "Have ever used other names?",
  "gender": "Sex",
  "birthDate": "Date of Birth",
  "placeBirth": "City of Birth",
  "maritalStatus": "Current Marital Status:",
  "numberOfMarriages": "Number of Former Spouses",
  "hasChild": "Do you have any children?",
  "educationSecondary": "Did you continue education after secondary school?",
  "idNumber": "National Identification Number",
  "passportNumberVN": "Passport/Travel Document Number",
  "passportIssuePlaceVN": "City of Issuance",
  "passportIssueDateVN": "Issuance Date",
  "passportExpiryDateVN": "Expiration Date",
  "lostPassport": "Have you ever lost a passport or had one stolen?",
  "lostPassportNumberVN": "Passport/Travel Document Number",
  "reasonLostPassportVN": "Explain",

  // Part 2: Trip Information
  "addressInUS": "U.S. Street Address",
  "expectedDateToUS": "Intended Date of Arrival",
  "durationInUS": "Intended Length of Stay in U.S.",
  "tripSponsor": "Person/Entity Paying for Your Trip",
  "sponsorDetails": "Surnames / Given names of Person Paying for Trip",
  "companionsToUS": "Are there other person traveling with you?",
  "companionDetails": "Surnames / Given Names of Person Traveling With You",
  "otherPhoneNumbers": "Have you used any other telephone numbers during the last five years?",
  "otherEmails": "Have you used any other email addresses during the last five years?",
  "useSocialMedia": "Social Media Provider/Platform",
  "socialMediaLinks": "Social Media Identifier",
  "otherNationality": "Do you hold or have you held any nationality other than the one you have indicated above?",
  "otherPassportNumber": "Passport Number",
  "otherPassportImage": "Passport Image",

  // Background Questions
  "otherLanguages": "Languages",
  "overseasSince16Over6Months": "Have you resided in any county/region for six months or longer since you attained 16 years of age?",
  "overseasCountriesList": "Country/Region",
  "charityInvolvement": "Have you belonged to, contributed to, or worked for any professional, social, or charitable organization?",
  "charityDetails": "Explain",
  "countriesVisited": "Have you traveled to any countries/regions within the last five years?",

  // Travel History
  "visitedUS": "Have you ever been in the U.S.?",
  "usArrivalDate1": "Date Arrived",
  "usStayDuration1": "Length of Stay",
  "usArrivalDate2": "Date Arrived",
  "usStayDuration2": "Length of Stay",
  "driverLicense": "Do you or did you ever hold a U.S. Driver’s License",
  "hasUSVisa": "Have you ever been issued a US Visa?",
  "usVisaIssueDate": "Date issued",
  "usVisaNumber": "Visa number",
  "visaUSRejected": "Have you ever been refused a US Visa, been refused admission to the United States, or withdrawn your application for admission at the port of entry?",
  "visaUSRejectedDetails": "Explain",
  "entryDeniedUS": "Have you ever been denied entry into the U.S.?",
  "entryDeniedUSDetails": "Explain",
  "deported": "Have you ever been deported?",
  "deportedReason": "Explain",
  "illegalStayUS": "Have you ever stayed illegally in the U.S.?",
  "illegalEntryDate": "Date of illegal entry:",
  "illegalEntryReason": "Explain",
  "previousSponsorship": "Has anyone ever filed an immigrant petition on your behalf with the United States Citizenship and Immigration Services?",
  "sponsorName": "Name of sponsor:",
  "sponsorRelationship": "Relationship:",
  "sponsorCaseNumber": "Case/File number:",
  "sponsorResult": "Result of sponsorship:",

  // Military & Security
  "militaryService": "Have you ever served in the military?",
  "militaryEnlistmentDate": "Date of Service From",
  "militaryDischargeDate": "Date of Service To",
  "militaryRank": "Rank/Position",
  "militaryUnit": "Military Specialty",
  "militaryBranch": "Branch of Service",
  "militaryCommander": "Name of direct commander:",
  "militaryCountry": "Name of Country/Region",
  "criminalRecord": "Do you have any criminal record?",
  "criminalRecordDetails": "Explain",
  "partyMembership": "Are you a member of or affiliated with the Communist or other totalitarian party",
  "partyJoinDate": "Date of joining party:",
  "partyLeaveDate": "Date of leaving party:",
  "partyRole": "Role/Position:",
  "partyLeaveReason": "Explain",

  // Employment
  "occupationTitle01": "Primary Occupation",
  "companyName01": "Present Employer or School Name",
  "companyAddress01": "Street Address (Line 1)",
  "companyPhone01": "Telephone Number",
  "managerName01": "Supervisor’s Surname / Given Names",
  "jobDescription01": "Briefly describe your duties",
  "monthlySalary01": "Monthly Salary",
  "employmentStartDate01": "Start Date",
  "employmentEndDate01": "End Date",

  // Previous Employment
  "occupationTitle02": "Previous Occupation",
  "companyName02": "Employer Name",
  "companyAddress02": "Employer Street Address",
  "companyPhone02": "Telephone Number",
  "managerName02": "Supervisor’s Surname / Given Names",
  "jobDescription02": "Briefly describe your duties",
  "monthlySalary02": "Monthly Salary",
  "employmentStartDate02": "Employment Date From",
  "employmentEndDate02": "Employment Date To",

  // Education
  "schoolList": "Have you attended any educational institutions at a secondary level or above?",

  // Previous Marriages
  "exSpouseName": "Former Spouse's Surname / Given name",
  "exSpouseBirthDate": "Date of birth",
  "exSpouseBirthPlace": "City",
  "exSpouseCurrentAddress": "Country/Region",
  "exSpouseOccupation": "Occupation",
  "marriageDate": "Date of Marriage",
  "marriagePlace": "City",
  "divorceDate": "Date Marriage Ended",
  "divorceReason": "How the Marriage Ended",

  // Current Marriage
  "spouseName": "Spouse/Fiancé/ Fiancée's Surnames / Given Names",
  "spouseBirthDate": "Spouse/Fiancé/ Fiancée’s Date of birth",
  "spouseBirthPlace": "Spouse/Fiancé/ Fiancée’s City of Birth",
  "spouseCurrentAddress": "Spouse/Fiancé/ Fiancée’s’s Address",
  "spouseOccupation": "Spouse/Fiancé/ Fiancée’s Occupation",
  "spouseMarriageDate": "Date of Marriage",
  "spouseMarriagePlace": "Place of Marriage",

  // Family
  "fatherName": "Father's Surnames / Given Names",
  "fatherBirthPlace": "City of Birth",
  "fatherBirthDate": "Date of Birth",
  "fatherStatus": "Is your father still living",
  "fatherDeathYear": "Year of Death",
  "fatherCurrentAddress": "U.S. Street Address",
  "motherName": "Mother’s Surnames / Given Names",
  "motherBirthDate": "Date of birth",
  "motherBirthPlace": "City of Birth",
  "motherStatus": "Is your mother still living",
  "motherDeathYear": "Year of Death",
  "motherCurrentAddress": "U.S. Street Address",
  "siblingsInUS": "Do you have any immediate relatives, not including parents, in the U.S.?",

  // U.S Contact
  "usContactFullName": "Contact Person Surnames / Given Names",
  "usContactAddress": "U.S. Street Address",
  "usContactPhone": "Phone Number",
  "usContactEmail": "Email Address",
  "usContactRelationship": "Relationship to you"
};

const optionsMap = {
  "Male": "MALE",
  "Female": "FEMALE",
  "Single (Never married)": "SINGLE",
  "First Marriage": "MARRIED",
  "Remarried": "MARRIED",
  "Divorced": "DIVORCED",
  "Widowed": "WIDOWED",
  "Yes": "YES",
  "No": "NO",
  "Có": "YES",
  "Không": "NO",
  "Chưa": "NO",
  "Self": "SELF",
  "Relative": "RELATIVE",
  "Company": "COMPANY"
};

schema.sections.forEach(s => {
  if (s.groups) {
    s.groups.forEach(g => {
      if (g.fields) {
        g.fields.forEach(f => {
          if (fieldMap[f.id] && f.label && f.label.en) {
            f.label.en = fieldMap[f.id];
          }
          if (f.options) {
            f.options.forEach(o => {
              if (optionsMap[o.label.en]) {
                o.label.en = optionsMap[o.label.en];
              }
            });
          }
        });
      }
    });
  }
});

fs.writeFileSync(path, JSON.stringify(schema, null, 4));
console.log("Updated schema.json successfully!");
