import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Library, GitBranch, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, type Theme } from '@/stores/theme-store'

const navItems = [
  { to: '/', icon: Library, label: '书架' },
  { to: '/knowledge', icon: GitBranch, label: '知识树' },
  { to: '/settings', icon: Settings, label: '设置' },
]

const themeNext: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'sepia',
  sepia: 'light',
}

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  sepia: <Sun className="h-4 w-4 text-amber-500" />,
}

const themeLabels: Record<Theme, string> = {
  light: '浅色',
  dark: '深色',
  sepia: '护眼',
}

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-surface shrink-0 transition-all duration-200',
          collapsed ? 'w-14' : 'w-[220px]',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-border px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-semibold tracking-tight text-primary-foreground">R</span>
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">AI Reader</span>}
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="space-y-1 border-t border-border p-2">
          <button
            onClick={() => setTheme(themeNext[theme])}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
              collapsed && 'justify-center px-2',
            )}
            title={`当前: ${themeLabels[theme]}`}
          >
            {themeIcons[theme]}
            {!collapsed && <span>{themeLabels[theme]}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary',
              collapsed && 'justify-center px-2',
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span>收起</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-background">{children}</main>
    </div>
  )
}
