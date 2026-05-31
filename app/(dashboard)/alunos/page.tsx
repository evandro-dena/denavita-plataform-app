'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, UtensilsCrossed, Activity, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Student } from '@/types'

const NUTRI_ID = 'nutri-1'

const TABS = [
  { key: 'ativo', label: 'Aceitos' },
  { key: 'espera', label: 'Lista de espera' },
  { key: 'excluido', label: 'Excluídos' },
]

function statusColor(status: Student['status']) {
  if (status === 'ativo') return { bg: 'rgba(200,255,0,0.12)', color: '#C8FF00' }
  if (status === 'inativo') return { bg: 'rgba(136,136,136,0.12)', color: '#888888' }
  if (status === 'espera') return { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
  return { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' }
}

export default function AlunosPage() {
  const [tab, setTab] = useState<'ativo' | 'espera' | 'excluido'>('ativo')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', NUTRI_ID],
    queryFn: () => studentService.list(NUTRI_ID),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Student['status'] }) =>
      studentService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Status atualizado') },
  })

  const filtered = students
    .filter(s => tab === 'excluido' ? s.status === 'excluido' : tab === 'espera' ? s.status === 'espera' : (s.status === 'ativo' || s.status === 'inativo'))
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <Topbar
        title="Alunos"
        subtitle={`${students.filter(s => s.status === 'ativo').length} alunos ativos`}
        action={
          <Link href="/alunos/novo">
            <Button style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              <Plus size={16} className="mr-2" /> Novo aluno
            </Button>
          </Link>
        }
      />

      {/* Search + Tabs */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555555' }} />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 border-0"
            style={{ background: '#1A1A1A', color: '#FFFFFF', borderRadius: '12px', borderColor: '#2A2A2A' }}
          />
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={tab === t.key
                ? { background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' }
                : { background: '#1A1A1A', color: '#888888' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" style={{ background: '#222222' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: '#555555' }}>Nenhum aluno encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                {['Aluno', 'Objetivo', 'Plano', 'Expira em', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-medium uppercase tracking-wide" style={{ color: '#555555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sc = statusColor(s.status)
                return (
                  <tr key={s.id} className="transition-all" style={{ borderBottom: '1px solid #2A2A2A' }}>
                    <td className="px-5 py-4">
                      <Link href={`/alunos/${s.id}`} className="flex items-center gap-3 hover:underline">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: '#C8FF00', color: '#111111' }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                          <p className="text-xs" style={{ color: '#888888' }}>{s.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{s.goal_label ?? '-'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{s.subscription?.plan ?? '-'}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>
                      {s.subscription?.expires_at ? new Date(s.subscription.expires_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.status === 'ativo'}
                          onCheckedChange={checked => toggleStatus.mutate({ id: s.id, status: checked ? 'ativo' : 'inativo' })}
                        />
                        <Badge style={{ background: sc.bg, color: sc.color, border: 'none', borderRadius: '9999px', fontSize: '11px' }}>
                          {s.status === 'ativo' ? 'Ativo' : s.status === 'inativo' ? 'Inativo' : s.status === 'espera' ? 'Espera' : 'Excluído'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/alunos/${s.id}?tab=prescricao`}>
                          <button className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Prescrição">
                            <UtensilsCrossed size={15} style={{ color: '#888888' }} />
                          </button>
                        </Link>
                        <Link href={`/alunos/${s.id}?tab=avaliacao`}>
                          <button className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Avaliação">
                            <Activity size={15} style={{ color: '#888888' }} />
                          </button>
                        </Link>
                        <Link href={`/alunos/${s.id}?tab=exames`}>
                          <button className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Exames">
                            <FileText size={15} style={{ color: '#888888' }} />
                          </button>
                        </Link>
                        <button className="p-2 rounded-lg hover:bg-red-500/10 transition-all" title="Excluir"
                          onClick={() => { if (confirm(`Excluir ${s.name}?`)) toggleStatus.mutate({ id: s.id, status: 'excluido' }) }}>
                          <Trash2 size={15} style={{ color: '#EF4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
