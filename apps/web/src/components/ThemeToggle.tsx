import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../hooks/useTheme'
import { WEB_ICON_BUTTON_CLASS, WEB_ICON_MD_CLASS } from '../lib/class-names'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={WEB_ICON_BUTTON_CLASS}
    >
      {theme === 'dark' ? (
        <Sun className={WEB_ICON_MD_CLASS} />
      ) : (
        <Moon className={WEB_ICON_MD_CLASS} />
      )}
    </button>
  )
}
