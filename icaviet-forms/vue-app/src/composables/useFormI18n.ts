import { ref, provide, inject, type Ref } from 'vue'

import dict from '../../translations.json'

const LOCALE_KEY = Symbol('form-locale')

export type Locale = 'vi' | 'en'

export function useFormI18nProvider(defaultLocale: Locale = 'vi') {
  const locale = ref<Locale>(defaultLocale)
  
  const t = (vi: string, en: string) => locale.value === 'vi' ? vi : en
  const td = (vi: string) => {
    if (locale.value === 'vi') return vi;
    return (dict as any)[vi] || vi;
  }
  const toggleLocale = () => { locale.value = locale.value === 'vi' ? 'en' : 'vi' }

  provide(LOCALE_KEY, { locale, t, td, toggleLocale })
  return { locale, t, td, toggleLocale }
}

export function useFormI18n() {
  const injected = inject<{ locale: Ref<Locale>, t: (vi: string, en: string) => string, td: (vi: string) => string, toggleLocale: () => void }>(LOCALE_KEY)
  if (!injected) {
    // Fallback nếu không có provider (chạy standalone)
    const locale = ref<Locale>('vi')
    return {
      locale,
      t: (vi: string, en: string) => locale.value === 'vi' ? vi : en,
      td: (vi: string) => locale.value === 'vi' ? vi : ((dict as any)[vi] || vi),
      toggleLocale: () => { locale.value = locale.value === 'vi' ? 'en' : 'vi' }
    }
  }
  return injected
}
