import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'sepia'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleDark: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('app-theme') as Theme) || 'light',

  setTheme: (theme: Theme) => {
    localStorage.setItem('app-theme', theme)
    set({ theme })
    applyTheme(theme)
  },

  toggleDark: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  }
}))

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('dark', 'sepia')
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'sepia') {
    root.classList.add('sepia')
  }
}

// Apply on load
const saved = localStorage.getItem('app-theme') as Theme | null
if (saved) {
  applyTheme(saved)
}
