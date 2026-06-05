'use client'
import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlanService } from '@/lib/api/diet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Trash2, Copy, Save, AlignJustify, MessageSquare, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DietPlan, Meal, MealItem } from '@/types'
import { aiService } from '@/lib/api/ai'

const iCls = 'bg-transparent border-0 outline-none text-sm w-full'

// ─── Textos Livres Editor ─────────────────────────────────────────
function TextosLivresEditor({ plan, onSave }: { plan: DietPlan; onSave: (p: Partial<DietPlan>) => void }) {
  const [name, setName] = useState(plan.name)
  const [meals, setMeals] = useState<Meal[]>(plan.meals)
  const [nutrients, setNutrients] = useState({
    kcal: String(plan.total_calories),
    protein: String(plan.total_protein),
    fat: String(plan.total_fat),
    carbs: String(plan.total_carbs),
  })
  const [supplements, setSupplements] = useState(plan.supplements ?? '')
  const [manipulated, setManipulated] = useState(plan.manipulated ?? '')
  const [shoppingList, setShoppingList] = useState(plan.shopping_list ?? '')
  const [activeType, setActiveType] = useState<'alimentos' | 'textos_livres'>('textos_livres')

  const addMeal = () => {
    setMeals(prev => [...prev, {
      id: String(Date.now()), name: 'Nova refeição', name_en: '', name_es: '',
      time: '12:00', emoji: '🍽️', free_text: '', items: [],
    }])
  }

  const updateMeal = (id: string, field: keyof Meal, val: string) =>
    setMeals(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))

  const removeMeal = (id: string) => setMeals(prev => prev.filter(m => m.id !== id))

  const cloneMeal = (meal: Meal) =>
    setMeals(prev => [...prev, { ...meal, id: String(Date.now()), name: `${meal.name} (cópia)` }])

  const inputSt = { color: '#FFFFFF', background: 'transparent', fontSize: '13px' }

  return (
    <div className="flex flex-col gap-6">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent border-b pb-1 text-sm outline-none focus:border-[#C8FF00] transition-colors"
          style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }}
          placeholder="Nome da prescrição"
        />
        <div className="flex gap-2">
          <Button onClick={() => toast.info('PDF em breve!')} variant="outline" size="sm"
            style={{ borderColor: '#2A2A2A', color: '#888888', borderRadius: '10px' }}>
            Gerar PDF
          </Button>
          <Button size="sm" onClick={() => onSave({
            name, meals, type: activeType,
            total_calories: Number(nutrients.kcal), total_protein: Number(nutrients.protein),
            total_carbs: Number(nutrients.carbs), total_fat: Number(nutrients.fat),
            supplements, manipulated, shopping_list: shoppingList,
          })}
            style={{ background: '#C8FF00', color: '#111111', borderRadius: '10px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
            <Save size={13} className="mr-1.5" /> Atualizar Prescrição
          </Button>
        </div>
      </div>

      {/* Format selector */}
      <div className="flex gap-0 rounded-xl overflow-hidden border" style={{ borderColor: '#2A2A2A' }}>
        {(['alimentos', 'textos_livres'] as const).map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={activeType === t
              ? { background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' }
              : { background: '#1A1A1A', color: '#888888' }}>
            {t === 'alimentos' ? 'Por Alimentos' : 'Por Textos Livres'}
          </button>
        ))}
      </div>
      {activeType === 'textos_livres' && (
        <p className="text-xs -mt-3" style={{ color: '#555555' }}>
          A prescrição é feita por texto livre, sem considerar cálculos automáticos. É possível inserir os valores manualmente abaixo.
        </p>
      )}

      {/* Dieta section */}
      <div className="rounded-2xl border p-5" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">✂️</span>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Dieta</h3>
            <p className="text-xs" style={{ color: '#555555' }}>
              {activeType === 'textos_livres' ? 'Prescreva as refeições com textos livres. Edite o que desejar.' : 'Montagem detalhada com alimentos e macros.'}
            </p>
          </div>
        </div>

        <Button onClick={addMeal} size="sm" style={{ background: '#C8FF00', color: '#111111', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, marginBottom: '16px' }}>
          <Plus size={13} className="mr-1.5" /> Nova Refeição
        </Button>

        <div className="flex flex-col gap-3">
          {meals.map((meal, idx) => (
            <div key={meal.id} className="rounded-xl border overflow-hidden" style={{ borderColor: '#2A2A2A' }}>
              {/* Meal header bar */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#222222' }}>
                <AlignJustify size={14} style={{ color: '#555555' }} className="cursor-grab flex-shrink-0" />
                <div className="w-16 flex-shrink-0">
                  <input type="time" value={meal.time}
                    onChange={e => updateMeal(meal.id, 'time', e.target.value)}
                    className={iCls} style={{ ...inputSt, color: '#C8FF00', fontWeight: 600, width: '68px' }} />
                </div>
                <span className="text-sm" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                  {meal.name}
                </span>
                <div className="ml-auto flex items-center gap-1">
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

              {/* Meal edit fields */}
              <div className="px-4 py-3 flex flex-col gap-2" style={{ background: '#1A1A1A' }}>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: '#555555' }}>Nome (Português)</label>
                    <input value={meal.name} onChange={e => updateMeal(meal.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-b pb-1 text-xs outline-none"
                      style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: '#555555' }}>Nome (Inglês)</label>
                    <input value={meal.name_en ?? ''} onChange={e => updateMeal(meal.id, 'name_en', e.target.value)}
                      className="w-full bg-transparent border-b pb-1 text-xs outline-none"
                      style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: '#555555' }}>Nome (Espanhol)</label>
                    <input value={meal.name_es ?? ''} onChange={e => updateMeal(meal.id, 'name_es', e.target.value)}
                      className="w-full bg-transparent border-b pb-1 text-xs outline-none"
                      style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }} />
                  </div>
                </div>

                {activeType === 'textos_livres' && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlignJustify size={13} style={{ color: '#555555' }} />
                      <textarea
                        value={meal.free_text ?? ''}
                        onChange={e => updateMeal(meal.id, 'free_text', e.target.value)}
                        rows={3}
                        placeholder={`[Texto livre até 10.000 caracteres]`}
                        className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm outline-none leading-relaxed"
                        style={{ background: '#222222', color: '#FFFFFF', borderColor: '#2A2A2A' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrients */}
      <div className="rounded-2xl border p-5" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'KCal', key: 'kcal' as const, color: '#C8FF00' },
            { label: 'Proteínas', key: 'protein' as const, color: '#FFFFFF' },
            { label: 'Gd. Total', key: 'fat' as const, color: '#FFFFFF' },
            { label: 'Carboidratos', key: 'carbs' as const, color: '#FFFFFF' },
          ].map(n => (
            <div key={n.key}>
              <label className="text-xs block mb-1" style={{ color: '#555555' }}>{n.label}</label>
              <div className="flex items-center gap-1">
                <input type="number" value={nutrients[n.key]}
                  onChange={e => setNutrients(p => ({ ...p, [n.key]: e.target.value }))}
                  className="w-20 bg-transparent border-b pb-1 text-base font-bold outline-none"
                  style={{ color: n.color, borderColor: '#2A2A2A' }} />
                {n.key !== 'kcal' && <span className="text-xs" style={{ color: '#555555' }}>g</span>}
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={() => toast.success('Nutrientes atualizados!')}
          style={{ background: '#C8FF00', color: '#111111', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
          Atualizar Nutrientes
        </Button>
      </div>

      {/* Suplementos / Manipulados / Lista de compras */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '🧴 Suplementos', value: supplements, onChange: setSupplements },
          { label: '💊 Manipulados', value: manipulated, onChange: setManipulated },
          { label: '🛒 Lista de compras', value: shoppingList, onChange: setShoppingList },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border p-4" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
            <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>{s.label}</p>
            <textarea value={s.value} onChange={e => s.onChange(e.target.value)} rows={5}
              className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{ color: '#888888' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Por Alimentos Editor ─────────────────────────────────────────
function AlimentosEditor({ plan, onSave, planId }: { plan: DietPlan; onSave: (p: Partial<DietPlan>) => void; planId: string }) {
  const [name, setName] = useState(plan.name)
  const [meals, setMeals] = useState<Meal[]>(plan.meals)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [activeType, setActiveType] = useState<'alimentos' | 'textos_livres'>('alimentos')

  void planId

  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => { acc.calories += item.calories; acc.protein += item.protein; acc.carbs += item.carbs; acc.fat += item.fat })
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const addMeal = () => setMeals(prev => [...prev, { id: String(Date.now()), name: 'Nova refeição', name_en: '', name_es: '', time: '12:00', emoji: '🍽️', substitution: '', items: [] }])
  const addItem = (mid: string) => setMeals(prev => prev.map(m => m.id === mid ? { ...m, items: [...m.items, { id: String(Date.now()), name: '', quantity: '', calories: 0, protein: 0, carbs: 0, fat: 0 }] } : m))
  const updateMeal = (mid: string, f: keyof Meal, v: string) => setMeals(prev => prev.map(m => m.id === mid ? { ...m, [f]: v } : m))
  const updateItem = (mid: string, iid: string, f: keyof MealItem, v: string | number) => setMeals(prev => prev.map(m => m.id === mid ? { ...m, items: m.items.map(i => i.id === iid ? { ...i, [f]: v } : i) } : m))
  const removeItem = (mid: string, iid: string) => setMeals(prev => prev.map(m => m.id === mid ? { ...m, items: m.items.filter(i => i.id !== iid) } : m))
  const removeMeal = (mid: string) => setMeals(prev => prev.filter(m => m.id !== mid))

  const generateAI = async () => {
    setGeneratingAI(true)
    try {
      const result = await aiService.generateDietPlan({ student: null as never, anamnesis: null, lastAssessment: null })
      setMeals(result.meals ?? [])
      toast.success('Plano gerado pela IA! Revise antes de salvar.')
    } catch { toast.error('Erro ao gerar com IA') } finally { setGeneratingAI(false) }
  }

  const iSt = { background: '#111111', color: '#FFFFFF', borderRadius: '8px', borderColor: '#2A2A2A', fontSize: '12px' }

  return (
    <div className="flex flex-col gap-5">
      {/* Top */}
      <div className="flex items-center justify-between gap-4">
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent border-b pb-1 text-sm outline-none focus:border-[#C8FF00] transition-colors"
          style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }} placeholder="Nome da prescrição" />
        <div className="flex gap-2">
          <Button onClick={() => toast.info('PDF em breve!')} variant="outline" size="sm" style={{ borderColor: '#2A2A2A', color: '#888888', borderRadius: '10px' }}>Gerar PDF</Button>
          <Button size="sm" onClick={() => onSave({ name, meals, type: activeType, total_calories: totals.calories, total_protein: totals.protein, total_carbs: totals.carbs, total_fat: totals.fat })}
            style={{ background: '#C8FF00', color: '#111111', borderRadius: '10px', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
            <Save size={13} className="mr-1.5" /> Atualizar Prescrição
          </Button>
        </div>
      </div>

      {/* Format selector */}
      <div className="flex gap-0 rounded-xl overflow-hidden border" style={{ borderColor: '#2A2A2A' }}>
        {(['alimentos', 'textos_livres'] as const).map(t => (
          <button key={t} onClick={() => setActiveType(t)} className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={activeType === t ? { background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' } : { background: '#1A1A1A', color: '#888888' }}>
            {t === 'alimentos' ? 'Por Alimentos' : 'Por Textos Livres'}
          </button>
        ))}
      </div>

      {/* Totals + AI */}
      <div className="rounded-2xl p-5 border" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: '#C8FF00' }}>{totals.calories}</span>
            <span className="text-sm ml-1" style={{ color: '#888888' }}>kcal totais</span>
          </div>
          <Button size="sm" onClick={generateAI} disabled={generatingAI}
            style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)', borderRadius: '10px' }}>
            <Sparkles size={13} className="mr-1.5" />{generatingAI ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[['Proteína', totals.protein, '#C8FF00'], ['Carboidrato', totals.carbs, '#F59E0B'], ['Gordura', totals.fat, '#888888']].map(([l, v, c]) => (
            <div key={String(l)}>
              <div className="flex justify-between mb-1"><span style={{ color: '#888888' }}>{l}</span><span style={{ color: '#FFFFFF' }}>{v}g</span></div>
              <div className="h-1.5 rounded-full" style={{ background: '#2A2A2A' }}>
                <div className="h-full rounded-full" style={{ width: `${totals.protein + totals.carbs + totals.fat > 0 ? Math.min(100, Math.round((Number(v) / (totals.protein + totals.carbs + totals.fat)) * 100)) : 0}%`, background: String(c) }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {meals.map(meal => {
        const mTotals = meal.items.reduce((a, i) => ({ calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
        return (
          <div key={meal.id} className="rounded-2xl border" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
            <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: '#2A2A2A' }}>
              <input value={meal.emoji} onChange={e => updateMeal(meal.id, 'emoji', e.target.value)} className="w-8 text-center text-lg bg-transparent border-0 outline-none" />
              <input value={meal.name} onChange={e => updateMeal(meal.id, 'name', e.target.value)} className="flex-1 text-sm font-semibold bg-transparent border-0 outline-none" style={{ color: '#FFFFFF' }} />
              <input value={meal.time} onChange={e => updateMeal(meal.id, 'time', e.target.value)} type="time" className="text-xs bg-transparent border rounded-lg px-2 py-1" style={{ color: '#888888', borderColor: '#2A2A2A' }} />
              <span className="text-xs" style={{ color: '#C8FF00' }}>{mTotals.calories} kcal</span>
              <button onClick={() => removeMeal(meal.id)} className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10" style={{ color: '#EF4444' }}>✕</button>
            </div>
            <div className="p-4">
              {meal.items.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead><tr style={{ color: '#555555' }}>{['Alimento', 'Qtd', 'Kcal', 'Prot', 'Carb', 'Gord', ''].map(h => <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {meal.items.map(item => (
                        <tr key={item.id}>
                          {(['name', 'quantity'] as const).map(f => (
                            <td key={f} className="pr-2 pb-2">
                              <input value={item[f] as string} onChange={e => updateItem(meal.id, item.id, f, e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border bg-transparent text-xs" style={iSt} placeholder={f === 'name' ? 'Alimento' : 'Quantidade'} />
                            </td>
                          ))}
                          {(['calories', 'protein', 'carbs', 'fat'] as const).map(f => (
                            <td key={f} className="pr-2 pb-2">
                              <input type="number" value={item[f]} onChange={e => updateItem(meal.id, item.id, f, Number(e.target.value))}
                                className="w-14 px-2 py-1.5 rounded-lg border bg-transparent text-xs" style={iSt} />
                            </td>
                          ))}
                          <td className="pb-2"><button onClick={() => removeItem(meal.id, item.id)} className="px-2 py-1 rounded hover:bg-red-500/10" style={{ color: '#EF4444' }}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={() => addItem(meal.id)} className="text-xs px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-all" style={{ color: '#C8FF00', borderColor: 'rgba(200,255,0,0.3)' }}>
                + Adicionar alimento
              </button>
            </div>
          </div>
        )
      })}
      <Button onClick={addMeal} variant="outline" className="border-dashed" style={{ borderColor: 'rgba(200,255,0,0.3)', color: '#C8FF00', borderRadius: '16px', background: 'rgba(200,255,0,0.04)' }}>
        + Nova refeição
      </Button>
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
      const all = await mealPlanService.listAll('nutri-1')
      return all.find(p => p.id === id) ?? null
    },
  })

  const save = useMutation({
    mutationFn: (data: Partial<DietPlan>) => mealPlanService.upsertMealPlan({ ...plan, ...data, id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet-plans-all'] }); qc.invalidateQueries({ queryKey: ['diet-plan', id] }); toast.success('Plano salvo!') },
  })

  if (isLoading) return <div className="p-8"><Skeleton className="h-10 w-64" style={{ background: '#1A1A1A' }} /></div>
  if (!plan) return <div className="p-8" style={{ color: '#888888' }}>Plano não encontrado.</div>

  return (
    <div>
      <Link href="/prescricoes" className="flex items-center gap-2 mb-6 text-sm transition-all hover:opacity-70" style={{ color: '#888888' }}>
        <ArrowLeft size={15} /> Voltar à tela anterior
      </Link>

      {plan.type === 'textos_livres'
        ? <TextosLivresEditor plan={plan} onSave={d => save.mutate(d)} />
        : <AlimentosEditor plan={plan} onSave={d => save.mutate(d)} planId={id} />
      }
    </div>
  )
}
