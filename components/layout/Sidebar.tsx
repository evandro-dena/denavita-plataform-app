'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, UtensilsCrossed, BookOpen, Settings, LogOut, Dumbbell, Megaphone, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/alunos', icon: Users, label: 'Alunos' },
  { href: '/prescricoes', icon: UtensilsCrossed, label: 'Nutrição' },
  { href: '/comunicacao', icon: Megaphone, label: 'Comunicação' },
  { href: '/receitas', icon: BookOpen, label: 'Receitas' },
  { href: '/videoaulas', icon: Video, label: 'Videoaulas' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col border-r" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b" style={{ borderColor: '#3D3D3D' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#C8FF00' }}>
          <Dumbbell size={16} style={{ color: '#1C1C1C' }} />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>DenaVita</p>
          <p className="text-xs" style={{ color: '#888888' }}>Nutricionista</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'text-black font-semibold'
                  : 'hover:bg-white/5'
              )}
              style={active ? { background: '#C8FF00', color: '#1C1C1C' } : { color: '#888888' }}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#3D3D3D' }}>
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full transition-all hover:bg-white/5"
          style={{ color: '#888888' }}
          onClick={() => {}}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
