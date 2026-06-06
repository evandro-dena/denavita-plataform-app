'use client'
import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlanService } from '@/lib/api/diet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Trash2, Copy, Save, AlignJustify, MessageSquare, ChevronDown, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DietPlan, Meal } from '@/types'

// ─── Editor ───────────────────────────────────────────────────────
function Editor({ plan, onSave }: { plan: DietPlan; onSave: (p: Partial<DietPlan>) => void }) {
  const [name, setName] = useState(plan.name)
  const [meals, setMeals] = useState<Meal[]>(plan.meals)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [nutrients, setNutrients] = useState({
    kcal: String(plan.total_calories),
    protein: String(plan.total_protein),
    fat: String(plan.total_fat),
    carbs: String(plan.total_carbs),
  })
  const [supplements, setSupplements] = useState(plan.supplements ?? '')
  const [manipulated, setManipulated] = useState(plan.manipulated ?? '')
  const [shoppingList, setShoppingList] = useState(plan.shopping_list ?? '')

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const addMeal = () => {
    const id = String(Date.now())
    setMeals(prev => [...prev, {
      id, name: 'Nova refeição', name_en: '', name_es: '',
      time: '12:00', emoji: '🍽️', free_text: '', items: [],
    }])
    setExpanded(prev => new Set([...prev, id]))
  }

  const updateMeal = (id: string, field: keyof Meal, val: string) =>
    setMeals(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))

  const removeMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id))
    setExpanded(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const cloneMeal = (meal: Meal) => {
    const id = String(Date.now())
    setMeals(prev => [...prev, { ...meal, id, name: `${meal.name} (cópia)` }])
    setExpanded(prev => new Set([...prev, id]))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent border-b pb-1 text-sm outline-none focus:border-[#C8FF00] transition-colors"
          style={{ color: '#FFFFFF', borderColor: '#3D3D3D' }}
          placeholder="Nome da prescrição"
        />
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={() => toast.info('PDF em breve!')} variant="outline" size="sm"
            style={{ borderColor: '#3D3D3D', color: '#888888', borderRadius: '10px' }}>
            Gerar PDF
          </Button>
          <Button size="sm" onClick={() => onSave({
            name, meals, type: 'textos_livres',
            total_calories: Number(nutrients.kcal), total_protein: Number(nutrients.protein),
            total_carbs: Number(nutrients.carbs), total_fat: Number(nutrients.fat),
            supplements, manipulated, shopping_list: shoppingList,
          })}
            style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
            <Save size={13} className="mr-1.5" /> Atualizar Prescrição
          </Button>
        </div>
      </div>

      {/* Dieta section */}
      <div className="rounded-2xl border p-5" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">✂️</span>
          <h3 className="font-semibold text-sm" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Dieta</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: '#555555' }}>
          Prescreva as refeições com textos livres. Edite o que desejar.
        </p>

        <Button onClick={addMeal} size="sm"
          style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '16px' }}>
          <Plus size={13} className="mr-1.5" /> Nova Refeição
        </Button>

        <div className="flex flex-col gap-2">
          {meals.map(meal => {
            const isOpen = expanded.has(meal.id)
            return (
              <div key={meal.id} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: isOpen ? 'rgba(200,255,0,0.25)' : '#3D3D3D' }}>

                {/* Header — always visible, click to expand */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                  style={{ background: '#2F2F2F' }}
                  onClick={() => toggleExpand(meal.id)}
                >
                  <AlignJustify size={14} style={{ color: '#555555' }} className="flex-shrink-0" onClick={e => e.stopPropagation()} />
                  <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={meal.time}
                      onChange={e => updateMeal(meal.id, 'time', e.target.value)}
                      placeholder="00:00"
                      className="bg-transparent border-0 outline-none text-sm font-bold"
                      style={{ color: '#C8FF00', width: '52px' }}
                    />
                  </div>
                  {isOpen ? (
                    <ChevronDown size={14} style={{ color: '#C8FF00' }} className="flex-shrink-0" />
                  ) : (
                    <ChevronRight size={14} style={{ color: '#555555' }} className="flex-shrink-0" />
                  )}
                  <span className="text-sm flex-1" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                    {meal.name}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => {}} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                      <MessageSquare size={13} style={{ color: '#555555' }} />
                    </button>
                    <button onClick={() => cloneMeal(meal)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                      <Copy size={13} style={{ color: '#555555' }} />
                    </button>
                    <button onClick={() => removeMeal(meal.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                      <Trash2 size={13} style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                </div>

                {/* Body — only when expanded */}
                {isOpen && (
                  <div className="px-4 py-4 flex flex-col gap-3" style={{ background: '#262626' }}>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Nome (Português)', field: 'name' as const, value: meal.name },
                        { label: 'Nome (Inglês)',    field: 'name_en' as const, value: meal.name_en ?? '' },
                        { label: 'Nome (Espanhol)', field: 'name_es' as const, value: meal.name_es ?? '' },
                      ].map(f => (
                        <div key={f.field}>
                          <label className="text-xs block mb-1" style={{ color: '#555555' }}>{f.label}</label>
                          <input
                            value={f.value}
                            onChange={e => updateMeal(meal.id, f.field, e.target.value)}
                            className="w-full bg-transparent border-b pb-1 text-xs outline-none focus:border-[#C8FF00] transition-colors"
                            style={{ color: '#FFFFFF', borderColor: '#3D3D3D' }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2">
                      <AlignJustify size={13} className="mt-2.5 flex-shrink-0" style={{ color: '#555555' }} />
                      <textarea
                        value={meal.free_text ?? ''}
                        onChange={e => updateMeal(meal.id, 'free_text', e.target.value)}
                        rows={4}
                        placeholder="[Texto livre até 10.000 caracteres]"
                        className="flex-1 resize-none border rounded-xl px-3 py-2.5 text-sm outline-none leading-relaxed focus:border-[#C8FF00] transition-colors"
                        style={{ background: '#2F2F2F', color: '#FFFFFF', borderColor: '#3D3D3D' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Nutrients */}
      <div className="rounded-2xl border p-5" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {([
            { label: 'KCal',        key: 'kcal'    as const, color: '#C8FF00' },
            { label: 'Proteínas',   key: 'protein' as const, color: '#FFFFFF' },
            { label: 'Gd. Total',   key: 'fat'     as const, color: '#FFFFFF' },
            { label: 'Carboidratos',key: 'carbs'   as const, color: '#FFFFFF' },
          ]).map(n => (
            <div key={n.key}>
              <label className="text-xs block mb-1" style={{ color: '#555555' }}>{n.label}</label>
              <div className="flex items-center gap-1">
                <input type="number" value={nutrients[n.key]}
                  onChange={e => setNutrients(p => ({ ...p, [n.key]: e.target.value }))}
                  className="w-20 bg-transparent border-b pb-1 text-base font-bold outline-none"
                  style={{ color: n.color, borderColor: '#3D3D3D' }} />
                {n.key !== 'kcal' && <span className="text-xs" style={{ color: '#555555' }}>g</span>}
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={() => toast.success('Nutrientes atualizados!')}
          style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
          Atualizar Nutrientes
        </Button>
      </div>

      {/* Suplementos / Manipulados / Lista de compras */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '🧴 Suplementos',     value: supplements,  onChange: setSupplements },
          { label: '💊 Manipulados',      value: manipulated,  onChange: setManipulated },
          { label: '🛒 Lista de compras', value: shoppingList, onChange: setShoppingList },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border p-4" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
            <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>{s.label}</p>
            <textarea value={s.value} onChange={e => s.onChange(e.target.value)} rows={5}
              className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{ color: '#888888' }} placeholder="..." />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function EditPrescricaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data: plan, isLoading } = useQuery({
    queryKey: ['diet-plan', id],
    queryFn: async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      const all = await mealPlanService.listAll(user?.id ?? '')
      return all.find(p => p.id === id) ?? null
    },
  })

  const save = useMutation({
    mutationFn: (data: Partial<DietPlan>) => mealPlanService.upsertMealPlan({ ...plan, ...data, id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet-plans-all'] })
      qc.invalidateQueries({ queryKey: ['diet-plan', id] })
      toast.success('Plano salvo!')
    },
  })

  if (isLoading) return <div className="p-8"><Skeleton className="h-10 w-64" style={{ background: '#262626' }} /></div>
  if (!plan) return <div className="p-8" style={{ color: '#888888' }}>Plano não encontrado.</div>

  return (
    <div>
      <Link href="/prescricoes" className="flex items-center gap-2 mb-6 text-sm transition-all hover:opacity-70" style={{ color: '#888888' }}>
        <ArrowLeft size={15} /> Voltar à tela anterior
      </Link>
      <Editor plan={plan} onSave={d => save.mutate(d)} />
    </div>
  )
}
