import { useTranslation } from 'react-i18next'

import { Check, Languages, Moon, Settings, Sun } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@nicenote/ui'

import { WEB_ICON_BUTTON_CLASS, WEB_ICON_MD_CLASS, WEB_ICON_SM_CLASS } from '../lib/class-names'
import { useLanguageStore } from '../store/useLanguageStore'
import { useThemeStore } from '../store/useThemeStore'

export function SettingsDropdown() {
  const { t } = useTranslation()

  const { theme, toggle: toggleTheme } = useThemeStore(
    useShallow((s) => ({
      theme: s.theme,
      toggle: s.toggle,
    }))
  )
  const { language, setLanguage } = useLanguageStore(
    useShallow((s) => ({
      language: s.language,
      setLanguage: s.setLanguage,
    }))
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('settings.title')}
          className={`${WEB_ICON_BUTTON_CLASS} focus-visible:ring-2 focus-visible:ring-primary`}
        >
          <Settings className={WEB_ICON_MD_CLASS} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent portal align="end" className="w-48 border border-border p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t('settings.theme')}
        </div>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          onSelect={() => {
            if (theme === 'dark') toggleTheme()
          }}
        >
          <Sun className={WEB_ICON_SM_CLASS} />
          <span className="flex-1 text-left">{t('settings.light')}</span>
          {theme === 'light' && <Check className={WEB_ICON_SM_CLASS} />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          onSelect={() => {
            if (theme === 'light') toggleTheme()
          }}
        >
          <Moon className={WEB_ICON_SM_CLASS} />
          <span className="flex-1 text-left">{t('settings.dark')}</span>
          {theme === 'dark' && <Check className={WEB_ICON_SM_CLASS} />}
        </DropdownMenuItem>

        <div className="my-1 h-px bg-border" />

        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t('settings.language')}
        </div>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          onSelect={() => setLanguage('en')}
        >
          <Languages className={WEB_ICON_SM_CLASS} />
          <span className="flex-1 text-left">{t('settings.english')}</span>
          {language === 'en' && <Check className={WEB_ICON_SM_CLASS} />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          onSelect={() => setLanguage('zh')}
        >
          <Languages className={WEB_ICON_SM_CLASS} />
          <span className="flex-1 text-left">{t('settings.chinese')}</span>
          {language === 'zh' && <Check className={WEB_ICON_SM_CLASS} />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
