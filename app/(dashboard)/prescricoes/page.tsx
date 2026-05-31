'use client'
import { useQuery } from '@tanstack/react-query'
import { studentService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

const NUTRI_ID = 'nutri-1'

export default function PrescricoesPage() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', NUTRI_ID],
    queryFn: () => studentService.list(NUTRI_ID),
  })

  const activeStudents = students.filter(s => s.status === 'ativo')

  return (
    <div>
      <Topbar title="Prescrições" subtitle="Planos alimentares de todos os alunos" />
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" style={{ background: '#222222' }} />)}
          </div>
        ) : (
          <table className="w-full">
            <thead><tr style={{ borderBottom: '1px solid #2A2A2A' }}>
              {['Aluno', 'Objetivo', 'Plano', 'Última atualização'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-medium uppercase tracking-wide" style={{ color: '#555555' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {activeStudents.map(s => (
                <tr key={s.id} className="transition-all" style={{ borderBottom: '1px solid #2A2A2A' }}>
                  <td className="px-5 py-4">
                    <Link href={`/alunos/${s.id}?tab=prescricao`} className="flex items-center gap-3 hover:underline">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: '#C8FF00', color: '#111111' }}>{s.name.charAt(0)}</div>
                      <span className="text-sm" style={{ color: '#FFFFFF' }}>{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{s.goal_label}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>—</td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
