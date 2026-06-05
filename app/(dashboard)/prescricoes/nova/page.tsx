'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlanService } from '@/lib/api/diet'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, UtensilsCrossed, AlignLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Step = 'nome' | 'formato'

export default function NovaPrescricaoPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('nome')
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: (type: 'alimentos' | 'textos_livres') =>
      mealPlanService.upsertMealPlan({
        name,
        type,
        user_id: '',
        nutritionist_id: 'nutri-1',
        total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0,
        meals: type === 'textos_livres'
          ? [
              { id: String(Date.now() + 1), name: 'Café da Manhã', name_en: 'Breakfast', name_es: 'Desayuno', time: '06:00', emoji: '☕', free_text: '', items: [] },
              { id: String(Date.now() + 2), name: 'Lanche da manhã', name_en: 'Morning snack', name_es: 'Merienda', time: '09:00', emoji: '🍎', free_text: '', items: [] },
              { id: String(Date.now() + 3), name: 'Almoço', name_en: 'Lunch', name_es: 'Almuerzo', time: '12:00', emoji: '🍽️', free_text: '', items: [] },
              { id: String(Date.now() + 4), name: 'Lanche da tarde', name_en: 'Afternoon snack', name_es: 'Merienda tarde', time: '16:00', emoji: '🥪', free_text: '', items: [] },
              { id: String(Date.now() + 5), name: 'Jantar', name_en: 'Dinner', name_es: 'Cena', time: '19:00', emoji: '🌙', free_text: '', items: [] },
              { id: String(Date.now() + 6), name: 'Ceia', name_en: 'Supper', name_es: 'Cena tardía', time: '22:00', emoji: '🥛', free_text: '', items: [] },
            ]
          : [],
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
    <div className="max-w-2xl mx-auto pt-8 px-4">
      {/* Back */}
      <Link href="/prescricoes" className="flex items-center gap-2 mb-8 text-sm transition-all hover:opacity-70" style={{ color: '#888888' }}>
        <ArrowLeft size={16} /> Voltar à tela anterior
      </Link>

      {/* Name input */}
      <div className="mb-8">
        <label className="block text-sm mb-2" style={{ color: '#888888' }}>
          Dê um nome para essa prescrição (obrigatório)
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep('formato') }}
          placeholder="ex: Low Carb 1600kcal"
          className="w-full bg-transparent border-b pb-2 text-base outline-none focus:border-[#C8FF00] transition-colors"
          style={{ color: '#FFFFFF', borderColor: '#2A2A2A' }}
          autoFocus
        />
      </div>

      {/* Step 1: Continue button */}
      {step === 'nome' && (
        <Button
          onClick={() => { if (name.trim()) setStep('formato') }}
          disabled={!name.trim()}
          style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, paddingLeft: '28px', paddingRight: '28px' }}
        >
          Continuar <ArrowRight size={15} className="ml-2" />
        </Button>
      )}

      {/* Step 2: Format choice */}
      {step === 'formato' && (
        <div>
          <p className="text-sm mb-4" style={{ color: '#FFFFFF' }}>Como deseja prescrever?</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Por Alimentos */}
            <button
              onClick={() => create.mutate('alimentos')}
              disabled={create.isPending}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all hover:border-[#C8FF00] hover:bg-[rgba(200,255,0,0.04)] group"
              style={{ borderColor: '#2A2A2A', background: '#1A1A1A' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:bg-[rgba(200,255,0,0.15)]"
                style={{ background: '#222222' }}>
                <UtensilsCrossed size={22} style={{ color: '#888888' }} className="group-hover:text-[#C8FF00]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Por Alimentos</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Montagem detalhada com macros por item</p>
              </div>
            </button>

            {/* Por Textos Livres */}
            <button
              onClick={() => create.mutate('textos_livres')}
              disabled={create.isPending}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all hover:border-[#C8FF00] hover:bg-[rgba(200,255,0,0.04)] group"
              style={{ borderColor: '#2A2A2A', background: '#1A1A1A' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:bg-[rgba(200,255,0,0.15)]"
                style={{ background: '#222222' }}>
                <AlignLeft size={22} style={{ color: '#888888' }} className="group-hover:text-[#C8FF00]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Por Textos Livres</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Texto livre por refeição sem cálculo automático</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
