'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlanService } from '@/lib/api/diet'
import { useNutriId } from '@/lib/hooks/useNutriId'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const DEFAULT_MEALS = () => {
  const t = Date.now()
  return [
    { id: String(t + 1), name: 'Café da Manhã',  name_en: 'Breakfast',       name_es: 'Desayuno',       time: '06:00', emoji: '☕', free_text: '', items: [] },
    { id: String(t + 2), name: 'Lanche da manhã', name_en: 'Morning snack',   name_es: 'Merienda',       time: '09:00', emoji: '🍎', free_text: '', items: [] },
    { id: String(t + 3), name: 'Almoço',          name_en: 'Lunch',           name_es: 'Almuerzo',       time: '12:00', emoji: '🍽️', free_text: '', items: [] },
    { id: String(t + 4), name: 'Lanche da tarde', name_en: 'Afternoon snack', name_es: 'Merienda tarde', time: '16:00', emoji: '🥪', free_text: '', items: [] },
    { id: String(t + 5), name: 'Jantar',          name_en: 'Dinner',          name_es: 'Cena',           time: '19:00', emoji: '🌙', free_text: '', items: [] },
    { id: String(t + 6), name: 'Ceia',            name_en: 'Supper',          name_es: 'Cena tardía',    time: '22:00', emoji: '🥛', free_text: '', items: [] },
  ]
}

export default function NovaPrescricaoPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const nutriId = useNutriId()

  const create = useMutation({
    mutationFn: () =>
      mealPlanService.upsertMealPlan({
        name,
        type: 'textos_livres',
        user_id: nutriId ?? undefined,
        nutritionist_id: nutriId ?? '',
        total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
        meals: DEFAULT_MEALS(),
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ['diet-plans-all'] })
      toast.success('Plano criado!')
      router.push(`/prescricoes/${plan.id}`)
    },
  })

  return (
    <div className="max-w-xl mx-auto pt-10 px-4">
      <Link href="/prescricoes" className="flex items-center gap-2 mb-10 text-sm transition-all hover:opacity-70" style={{ color: '#888888' }}>
        <ArrowLeft size={15} /> Voltar à tela anterior
      </Link>

      <div className="mb-8">
        <label className="block text-sm mb-3" style={{ color: '#888888' }}>
          Dê um nome para essa prescrição <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) create.mutate() }}
          placeholder="ex: Low Carb 1600kcal"
          autoFocus
          className="w-full bg-transparent border-b pb-2 text-base outline-none focus:border-[#C8FF00] transition-colors"
          style={{ color: '#FFFFFF', borderColor: '#3D3D3D' }}
        />
      </div>

      <Button
        onClick={() => { if (name.trim()) create.mutate() }}
        disabled={!name.trim() || create.isPending}
        style={{
          background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px',
          fontFamily: 'Poppins, sans-serif', fontWeight: 700,
          paddingLeft: '28px', paddingRight: '28px',
        }}
      >
        {create.isPending ? 'Criando...' : 'Continuar'}
        {!create.isPending && <ArrowRight size={15} className="ml-2" />}
      </Button>
    </div>
  )
}
