'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/api/dashboard'
import { studentService, dietReviewService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Users, Clock, ClipboardCheck, ChevronRight } from 'lucide-react'
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

  const { data: needsDietReview = [] } = useQuery({
    queryKey: ['needs-diet-review', NUTRI_ID],
    queryFn: () => dietReviewService.getNeedingReview(NUTRI_ID),
  })

  const expiring = students?.filter(
    s => s.subscription?.status === 'vencendo' || s.subscription?.status === 'vencido'
  ) ?? []

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral dos seus alunos" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" style={{ background: '#1A1A1A' }} />
          ))
        ) : (
          <>
            <StatCard label="Alunos ativos" value={stats?.active_students ?? 0} icon={Users} accent />
            <StatCard label="Vencendo em 7d" value={stats?.expiring_7d ?? 0} icon={Clock} warning />
            <StatCard label="Vencendo em 15d" value={stats?.expiring_15d ?? 0} icon={Clock} />
            <StatCard
              label="Verificar dieta"
              value={needsDietReview.length}
              icon={ClipboardCheck}
              warning={needsDietReview.length > 0}
            />
          </>
        )}
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Planos vencendo */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <h2 className="font-semibold text-base mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
            Planos vencendo
          </h2>
          {expiring.length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Nenhum plano vencendo em breve.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expiring.map(s => (
                <Link key={s.id} href={`/alunos/${s.id}`}>
                  <div
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                    style={{ background: '#222222' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: '#C8FF00', color: '#111111' }}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                          Expira em: {s.subscription?.expires_at
                            ? new Date(s.subscription.expires_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge style={{
                        background: s.subscription?.status === 'vencido'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)',
                        color: s.subscription?.status === 'vencido' ? '#EF4444' : '#F59E0B',
                        border: 'none', borderRadius: '9999px', fontSize: '11px'
                      }}>
                        {s.subscription?.status === 'vencido' ? 'Vencido' : 'Vencendo'}
                      </Badge>
                      <ChevronRight size={14} style={{ color: '#555555' }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alunos que faltam analisar a dieta */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
              Alunos que faltam analisar a dieta
            </h2>
            {needsDietReview.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                {needsDietReview.length} pendente{needsDietReview.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: '#555555' }}>
            Alunos que preencheram a anamnese no app e aguardam revisão da dieta gerada pela IA.
          </p>
          {needsDietReview.length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Tudo em dia! Nenhuma dieta pendente.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {needsDietReview.map(s => (
                <Link key={s.id} href={`/alunos/${s.id}`}>
                  <div
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                    style={{ background: '#222222' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{s.goal_label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#F59E0B' }}>Verificar dieta</span>
                      <ChevronRight size={14} style={{ color: '#555555' }} />
                    </div>
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
