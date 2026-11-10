import { getI130SectionModule } from './i130/cases/index.js'

// Legacy entrypoint. I-130/I-130A dynamic sections are now split by case type under src/forms/i130/cases/*.
// Keep this file so older imports continue to work.
export function renderI130ADynamicSections(options = {}) {
  const mod = getI130SectionModule(options.data || {})
  return mod.renderI130ADynamicSections(options)
}
