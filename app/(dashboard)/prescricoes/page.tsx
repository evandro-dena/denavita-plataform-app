'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlanService } from '@/lib/api/diet'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Pencil, Send, Copy, Trash2, FileText, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DietPlan } from '@/types'

const NUTRI_ID = 'nutri-1'

function typeLabel(type: DietPlan['type']) {
  return type === 'textos_livres' ? 'Textos livres' : 'Por alimentos'
}

export default function PrescricoesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['diet-plans-all'],
    queryFn: () => mealPlanService.listAll(NUTRI_ID),
  })

  const deletePlan = useMutation({
    mutationFn: (id: string) => mealPlanService.deletePlan(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet-plans-all'] }); toast.success('Plano excluído.') },
  })

  const clonePlan = useMutation({
    mutationFn: (plan: DietPlan) => mealPlanService.upsertMealPlan({
      ...plan, id: undefined, name: `${plan.name} (cópia)`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet-plans-all'] }); toast.success('Plano clonado!') },
  })

  const filtered = plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <Topbar
        title="Nutrição"
        subtitle={`${plans.length} plano${plans.length !== 1 ? 's' : ''} · Crie planos nutricionais e envie para seus alunos`}
        action={
          <Link href="/prescricoes/nova">
            <Button style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              <Plus size={16} className="mr-2" /> Nova
            </Button>
          </Link>
        }
      />

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555555' }} />
        <Input placeholder="Buscar plano..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 border" style={{ background: '#262626', color: '#FFFFFF', borderRadius: '12px', borderColor: '#3D3D3D' }} />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" style={{ background: '#2F2F2F' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3" style={{ color: '#555555' }}>
            <FileText size={36} className="opacity-30" />
            <p className="text-sm">Nenhum plano encontrado.</p>
            <Link href="/prescricoes/nova">
              <Button size="sm" style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif' }}>
                <Plus size={14} className="mr-1.5" /> Criar primeiro plano
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                {['Alimento', 'Tipo', 'KCal', 'Prot.', 'Carb.', 'Gord.', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#555555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(plan => (
                <tr key={plan.id} className="transition-all" style={{ borderBottom: '1px solid #2A2A2A' }}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{plan.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#555555' }}>
                      Última atualização em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{typeLabel(plan.type)}</td>
                  <td className="px-5 py-4 text-sm font-semibold" style={{ color: '#C8FF00' }}>{plan.total_calories}</td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{plan.total_protein}g</td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{plan.total_carbs}g</td>
                  <td className="px-5 py-4 text-sm" style={{ color: '#888888' }}>{plan.total_fat}g</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/prescricoes/${plan.id}`}>
                        <button className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Editar">
                          <Pencil size={14} style={{ color: '#888888' }} />
                        </button>
                      </Link>
                      <button className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Enviar ao aluno"
                        onClick={() => toast.info('Ative este plano em Alunos → ··· → Nutrição')}>
                        <Send size={14} style={{ color: '#888888' }} />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all text-xs"
                            style={{ color: '#888888' }}>
                            Opções <ChevronDown size={11} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end"
                          style={{ background: '#262626', border: '1px solid #2A2A2A', borderRadius: '14px', minWidth: '160px', padding: '8px' }}>
                          <DropdownMenuItem onClick={() => toast.info('PDF em breve!')}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer" style={{ color: '#FFFFFF' }}>
                            <FileText size={14} style={{ color: '#888888' }} /> Gerar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => clonePlan.mutate(plan)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer" style={{ color: '#FFFFFF' }}>
                            <Copy size={14} style={{ color: '#888888' }} /> Clonar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { if (confirm(`Excluir "${plan.name}"?`)) deletePlan.mutate(plan.id) }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer" style={{ color: '#EF4444' }}>
                            <Trash2 size={14} /> Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
