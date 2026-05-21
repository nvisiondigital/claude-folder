'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Mijn kanban', href: '/app/kanban', icon: '⬛' },
  { label: 'Dispatch',    href: '/app/dispatch', icon: '📋' },
  { label: 'Agenda',      href: '/app/agenda',   icon: '📅' },
]

export default function Sidebar() {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="w-48 shrink-0 bg-[#080f0d] border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-3.5 py-4 border-b border-white/[0.04] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ghs-green to-ghs-teal shadow-[0_0_10px_rgba(114,217,70,0.2)] shrink-0" />
        <div>
          <div className="text-xs font-bold text-white">GHS</div>
          <div className="text-[9px] text-white/25 mt-0.5">Florian · Operaties</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        <p className="text-[9px] uppercase tracking-widest text-white/20 px-2.5 py-2.5 pt-3">
          Planning
        </p>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                active
                  ? 'bg-ghs-green/[0.08] text-ghs-green font-semibold'
                  : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70'
              }`}
            >
              <span className="w-4 text-center text-[13px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="m-2 p-2.5 rounded-lg text-[10px] text-white/20 hover:text-white/40 hover:bg-white/[0.03] text-left transition-colors"
      >
        ↗ Uitloggen
      </button>
    </aside>
  )
}
