'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/api/dashboard'
import { studentService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Users, Clock, FileWarning, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

const NUTRI_ID = 'nutri-1'

function StatCard({ label, value, icon: Icon, accent = false, warning = false }: {
  label: string; value: number; icon: React.ElementType; accent?: boolean; warning?: boolean
}) {
  return (
    <div className="rounded-2xl p-6 border flex items-center gap-4" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? 'rgba(200,255,0,0.12)' : warning ? 'rgba(245,158,11,0.12)' : '#222222' }}>
        <Icon size={22} style={{ color: accent ? '#C8FF00' : warning ? '#F59E0B' : '#888888' }} />
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: accent ? '#C8FF00' : '#FFFFFF' }}>{value}</p>
        <p className="text-sm mt-0.5" style={{ color: '#888888' }}>{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', NUTRI_ID],
    queryFn: () => dashboardService.getStats(NUTRI_ID),
  })

  const { data: students } = useQuery({
    queryKey: ['students', NUTRI_ID],
    queryFn: () => studentService.list(NUTRI_ID),
  })

  const expiring = students?.filter(s => s.subscription?.status === 'vencendo' || s.subscription?.status === 'vencido') ?? []

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral dos seus alunos" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" style={{ background: '#1A1A1A' }} />)
        ) : (
          <>
            <StatCard label="Alunos ativos" value={stats?.active_students ?? 0} icon={Users} accent />
            <StatCard label="Vencendo em 7d" value={stats?.expiring_7d ?? 0} icon={Clock} warning />
            <StatCard label="Vencendo em 15d" value={stats?.expiring_15d ?? 0} icon={Clock} />
            <StatCard label="Exames pendentes" value={stats?.pending_exams ?? 0} icon={FileWarning} warning />
          </>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring subscriptions */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <h2 className="font-semibold text-base mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>Planos vencendo</h2>
          {expiring.length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Nenhum plano vencendo em breve.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {expiring.map(s => (
                <Link key={s.id} href={`/alunos/${s.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all" style={{ background: '#222222' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                        Expira em: {s.subscription?.expires_at ? new Date(s.subscription.expires_at).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                    <Badge style={{
                      background: s.subscription?.status === 'vencido' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: s.subscription?.status === 'vencido' ? '#EF4444' : '#F59E0B',
                      border: 'none', borderRadius: '9999px'
                    }}>
                      {s.subscription?.status === 'vencido' ? 'Vencido' : 'Vencendo'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Lista de espera */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <h2 className="font-semibold text-base mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>Lista de espera</h2>
          {students?.filter(s => s.status === 'espera').length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Nenhum aluno na lista de espera.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {students?.filter(s => s.status === 'espera').map(s => (
                <Link key={s.id} href={`/alunos/${s.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all" style={{ background: '#222222' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{s.goal_label}</p>
                    </div>
                    <UserPlus size={16} style={{ color: '#C8FF00' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
