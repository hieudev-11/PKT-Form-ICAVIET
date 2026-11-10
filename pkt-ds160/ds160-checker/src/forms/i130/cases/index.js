import { resolveI130CaseType } from '../relationship-resolver.js'

import * as spouseMappings from './spouse/i130a-mappings.js'
import * as childMappings from './child/i130a-mappings.js'
import * as parentMappings from './parent/i130a-mappings.js'
import * as siblingMappings from './sibling/i130a-mappings.js'
import * as fianceMappings from './fiance/i130a-mappings.js'

import * as spouseSections from './spouse/i130a-dynamic-sections.js'
import * as childSections from './child/i130a-dynamic-sections.js'
import * as parentSections from './parent/i130a-dynamic-sections.js'
import * as siblingSections from './sibling/i130a-dynamic-sections.js'
import * as fianceSections from './fiance/i130a-dynamic-sections.js'

const mappingModules = {
  spouse: spouseMappings,
  child: childMappings,
  parent: parentMappings,
  sibling: siblingMappings,
  fiance: fianceMappings
}

const sectionModules = {
  spouse: spouseSections,
  child: childSections,
  parent: parentSections,
  sibling: siblingSections,
  fiance: fianceSections
}

export function getI130MappingModule(data = {}) {
  return mappingModules[resolveI130CaseType(data)] || mappingModules.spouse
}

export function getI130SectionModule(data = {}) {
  return sectionModules[resolveI130CaseType(data)] || sectionModules.spouse
}
