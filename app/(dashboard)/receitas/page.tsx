'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recipeService } from '@/lib/api/recipes'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Clock, Flame } from 'lucide-react'
import { toast } from 'sonner'

export default function ReceitasPage() {
  const qc = useQueryClient()
  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipes'], queryFn: recipeService.list })

  const deleteRecipe = useMutation({
    mutationFn: recipeService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receita removida') }
  })

  return (
    <div>
      <Topbar
        title="Receitas"
        subtitle="Biblioteca de receitas do app"
        action={
          <Button style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
            <Plus size={16} className="mr-2" /> Nova receita
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" style={{ background: '#262626' }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(r => (
            <div key={r.id} className="rounded-2xl border p-5" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge style={{ background: '#2F2F2F', color: '#888888', border: 'none', borderRadius: '9999px', fontSize: '11px' }}>{r.category}</Badge>
                  <h3 className="font-semibold text-sm mt-2" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>{r.name}</h3>
                </div>
                <button onClick={() => deleteRecipe.mutate(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                  <Trash2 size={14} style={{ color: '#EF4444' }} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  <Clock size={13} style={{ color: '#555555' }} />
                  <span className="text-xs" style={{ color: '#888888' }}>{r.prep_time} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame size={13} style={{ color: '#C8FF00' }} />
                  <span className="text-xs" style={{ color: '#C8FF00' }}>{r.calories} kcal</span>
                </div>
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                {[['P', r.protein], ['C', r.carbs], ['G', r.fat]].map(([label, val]) => (
                  <div key={label} className="flex flex-col items-center">
                    <span style={{ color: '#555555' }}>{label}</span>
                    <span style={{ color: '#FFFFFF' }}>{val}g</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
