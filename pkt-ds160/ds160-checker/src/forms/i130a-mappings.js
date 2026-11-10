import { getI130MappingModule } from './i130/cases/index.js'

// Legacy entrypoint. I-130/I-130A is now split by case type under src/forms/i130/cases/*.
// Keep this file so older imports continue to work.
export function buildI130AMappings(data = {}, helpers = {}) {
  const mod = getI130MappingModule(data)
  return mod.buildI130AMappings(data, helpers)
}
