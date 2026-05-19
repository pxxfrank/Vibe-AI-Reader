import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Library, BookOpen, Settings, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, type Theme } from '@/stores/theme-store'

const navItems = [
  { to: '/', icon: Library, label: '书架' },
  { to: '/settings', icon: Settings, label: '设置' }
]

const themeNext: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'sepia',
  sepia: 'light'
}

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  sepia: <Sun className="h-4 w-4 text-amber-600" />
}

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'flex flex-col border-r border-white/10 bg-background/40 backdrop-blur-xl transition-all duration-200',
          collapsed ? 'w-14' : 'w-52'
        )}
      >
        <div className="flex h-12 items-center justify-center border-b">
          {collapsed ? (
            <BookOpen className="h-5 w-5" />
          ) : (
            <span className="font-semibold text-sm">AI Reader</span>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-gradient-to-r from-[#667eea]/15 to-[#764ba2]/15 text-brand font-medium shadow-[inset_0_1px_0_rgba(102,126,234,0.1)]'
                    : 'text-muted-foreground hover:bg-brand-light/30 hover:text-brand'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2 space-y-1">
          <button
            onClick={() => setTheme(themeNext[theme])}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-xs w-full transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            {themeIcons[theme]}
            {!collapsed && <span>主题</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-xs w-full transition-colors text-muted-foreground hover:bg-accent',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? <span>→</span> : <span>←</span>}
            {!collapsed && <span>收起</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
