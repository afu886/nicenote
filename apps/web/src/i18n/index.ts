import { initReactI18next } from 'react-i18next'

import i18n from 'i18next'

import en from './locales/en'
import zh from './locales/zh'

const LANG_STORAGE_KEY = 'nicenote-lang'

function detectLanguage(): string {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LANG_STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  }

  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language
    if (browserLang.startsWith('zh')) return 'zh'
  }
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
