'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ThemeDefinition {
  id: string
  name: string
  isDark?: boolean // not used in definitions, computed from mode
}

// 5 color themes — each has dark + light variants in CSS
export const themes: ThemeDefinition[] = [
  { id: 'midnight',  name: 'Midnight' },
  { id: 'volta',     name: 'Volta' },
  { id: 'emerald',   name: 'Emerald' },
  { id: 'amethyst',  name: 'Amethyst' },
  { id: 'sunset',    name: 'Sunset' },
]

interface ThemeContextType {
  colorTheme: string       // 'midnight' | 'volta' | 'emerald' | 'amethyst' | 'sunset'
  isDark: boolean
  setColorTheme: (id: string) => void
  toggleMode: () => void
  setMode: (dark: boolean) => void
  // Backward compat aliases
  theme: string
  setTheme: (id: string) => void
  currentTheme: ThemeDefinition & { isDark: boolean }
}

const ThemeContext = createContext<ThemeContextType>({
  colorTheme: 'midnight',
  isDark: true,
  setColorTheme: () => {},
  toggleMode: () => {},
  setMode: () => {},
  theme: 'midnight',
  setTheme: () => {},
  currentTheme: { ...themes[0], isDark: true },
})

function applyToDOM(color: string, dark: boolean) {
  document.documentElement.setAttribute('data-theme', color)
  document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light')

  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState('midnight')
  const [isDark, setIsDarkState] = useState(true)

  useEffect(() => {
    const savedColor = localStorage.getItem('app-color-theme') || localStorage.getItem('app-theme') || 'midnight'
    // Migrate old 'frost' theme
    const color = savedColor === 'frost' ? 'midnight' : savedColor
    const savedMode = localStorage.getItem('app-theme-mode')
    const dark = savedMode ? savedMode === 'dark' : savedColor !== 'frost'

    setColorThemeState(color)
    setIsDarkState(dark)
    applyToDOM(color, dark)
  }, [])

  const setColorTheme = (id: string) => {
    setColorThemeState(id)
    localStorage.setItem('app-color-theme', id)
    document.documentElement.classList.add('transition-colors')
    applyToDOM(id, isDark)
    setTimeout(() => document.documentElement.classList.remove('transition-colors'), 400)
  }

  const toggleMode = () => {
    const newDark = !isDark
    setIsDarkState(newDark)
    localStorage.setItem('app-theme-mode', newDark ? 'dark' : 'light')
    document.documentElement.classList.add('transition-colors')
    applyToDOM(colorTheme, newDark)
    setTimeout(() => document.documentElement.classList.remove('transition-colors'), 400)
  }

  const setMode = (dark: boolean) => {
    setIsDarkState(dark)
    localStorage.setItem('app-theme-mode', dark ? 'dark' : 'light')
    document.documentElement.classList.add('transition-colors')
    applyToDOM(colorTheme, dark)
    setTimeout(() => document.documentElement.classList.remove('transition-colors'), 400)
  }

  const currentTheme = { ...(themes.find(t => t.id === colorTheme) || themes[0]), isDark }

  return (
    <ThemeContext.Provider value={{
      colorTheme,
      isDark,
      setColorTheme,
      toggleMode,
      setMode,
      // Backward compat
      theme: colorTheme,
      setTheme: setColorTheme,
      currentTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
