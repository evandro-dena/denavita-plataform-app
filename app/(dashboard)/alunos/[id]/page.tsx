'use client'
import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentService, anamnesisService, assessmentService, examService, weightService } from '@/lib/api/students'
import { mealPlanService } from '@/lib/api/diet'
import { calcularIdade, formatarData, traduzirCampo, traduzirBooleano, traduzirCondicional } from '@/constants/anamnesisLabels'
import Topbar from '@/components/layout/Topbar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Download, CheckCircle, Clock, Sparkles, Bell, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DietPlan, Meal, MealItem } from '@/types'
import { aiService } from '@/lib/api/ai'
import { GenerateDietButton } from '@/components/diet/GenerateDietButton'

// ─── Sub-components ───────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b last:border-0" style={{ borderColor: '#3D3D3D' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>{label}</span>
      <span className="text-sm" style={{ color: value ? '#FFFFFF' : '#555555' }}>{value ?? '—'}</span>
    </div>
  )
}

function MacroBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#888888' }}>{label}</span>
        <span style={{ color: '#FFFFFF' }}>{value}g</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#3D3D3D' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Diet Editor ──────────────────────────────────────────────────

function DietEditor({ plan, onSave, studentId }: {
  plan: DietPlan | null | undefined
  onSave: (p: Partial<DietPlan>) => void
  studentId: string
}) {
  const [meals, setMeals] = useState<Meal[]>(plan?.meals ?? [])
  const [generatingAI, setGeneratingAI] = useState(false)

  const { data: student } = useQuery({ queryKey: ['student', studentId], queryFn: () => studentService.getById(studentId) })
  const { data: anamnesis } = useQuery({ queryKey: ['anamnesis', studentId], queryFn: () => anamnesisService.getByUser(studentId) })
  const { data: assessments } = useQuery({ queryKey: ['assessments', studentId], queryFn: () => assessmentService.list(studentId) })

  const totals = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.calories += item.calories; acc.protein += item.protein
      acc.carbs += item.carbs; acc.fat += item.fat
    })
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const addMeal = () => {
    setMeals(prev => [...prev, {
      id: String(Date.now()), name: 'Nova refeição', name_en: '', name_es: '',
      time: '12:00', emoji: '🍽️', substitution: '', items: []
    }])
  }

  const addItem = (mealId: string) => {
    setMeals(prev => prev.map(m => m.id === mealId
      ? { ...m, items: [...m.items, { id: String(Date.now()), name: '', quantity: '', calories: 0, protein: 0, carbs: 0, fat: 0 }] }
      : m
    ))
  }

  const updateMeal = (mealId: string, field: keyof Meal, value: string) => {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, [field]: value } : m))
  }

  const updateItem = (mealId: string, itemId: string, field: keyof MealItem, value: string | number) => {
    setMeals(prev => prev.map(m => m.id === mealId
      ? { ...m, items: m.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
      : m
    ))
  }

  const removeItem = (mealId: string, itemId: string) => {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m))
  }

  const removeMeal = (mealId: string) => setMeals(prev => prev.filter(m => m.id !== mealId))

  const generateWithAI = async () => {
    if (!student) return
    setGeneratingAI(true)
    try {
      const result = await aiService.generateDietPlan({
        student, anamnesis: anamnesis ?? null, lastAssessment: assessments?.[0] ?? null
      })
      setMeals(result.meals ?? [])
      toast.success('Plano gerado pela IA! Revise antes de salvar.')
    } catch {
      toast.error('Erro ao gerar plano com IA')
    } finally {
      setGeneratingAI(false)
    }
  }

  const inputStyle = { background: '#1C1C1C', color: '#FFFFFF', borderRadius: '8px', borderColor: '#3D3D3D', fontSize: '13px' }

  return (
    <div className="flex flex-col gap-6">
      {/* Totals bar */}
      <div className="rounded-2xl p-5 border" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: '#C8FF00' }}>{totals.calories}</span>
            <span className="text-sm ml-1" style={{ color: '#888888' }}>kcal totais</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={generateWithAI} disabled={generatingAI}
              style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)', borderRadius: '10px' }}>
              <Sparkles size={14} className="mr-1.5" />
              {generatingAI ? 'Gerando...' : 'Gerar com IA'}
            </Button>
            <Button size="sm" onClick={() => onSave({ meals, total_calories: totals.calories, total_protein: totals.protein, total_carbs: totals.carbs, total_fat: totals.fat })}
              style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontWeight: 600 }}>
              Salvar plano
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MacroBar label="Proteína" value={totals.protein} total={totals.protein + totals.carbs + totals.fat} color="#C8FF00" />
          <MacroBar label="Carboidrato" value={totals.carbs} total={totals.protein + totals.carbs + totals.fat} color="#F59E0B" />
          <MacroBar label="Gordura" value={totals.fat} total={totals.protein + totals.carbs + totals.fat} color="#888888" />
        </div>
      </div>

      {/* Meals */}
      {meals.map(meal => {
        const mealTotals = meal.items.reduce((a, i) => ({ calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
        return (
          <div key={meal.id} className="rounded-2xl border" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
            {/* Meal header */}
            <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: '#3D3D3D' }}>
              <input value={meal.emoji} onChange={e => updateMeal(meal.id, 'emoji', e.target.value)}
                className="w-10 text-center text-xl bg-transparent border-0 outline-none" />
              <input value={meal.name} onChange={e => updateMeal(meal.id, 'name', e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-0 outline-none"
                style={{ color: '#FFFFFF' }} placeholder="Nome da refeição" />
              <input value={meal.time} onChange={e => updateMeal(meal.id, 'time', e.target.value)}
                type="text" placeholder="00:00" className="text-xs bg-transparent border rounded-lg px-2 py-1 w-16"
                style={{ color: '#888888', borderColor: '#3D3D3D' }} />
              <span className="text-xs" style={{ color: '#C8FF00' }}>{mealTotals.calories} kcal</span>
              <button onClick={() => removeMeal(meal.id)} className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                style={{ color: '#EF4444' }}>✕</button>
            </div>

            {/* Items table */}
            <div className="p-5">
              {meal.items.length > 0 && (
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-xs">
                    <thead><tr style={{ color: '#555555' }}>
                      {['Alimento', 'Qtd', 'Kcal', 'Prot', 'Carb', 'Gord', ''].map(h => (
                        <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {meal.items.map(item => (
                        <tr key={item.id}>
                          {(['name', 'quantity'] as const).map(f => (
                            <td key={f} className="pr-2 pb-2">
                              <input value={item[f] as string} onChange={e => updateItem(meal.id, item.id, f, e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border bg-transparent text-xs"
                                style={inputStyle} placeholder={f === 'name' ? 'Alimento' : 'Quantidade'} />
                            </td>
                          ))}
                          {(['calories', 'protein', 'carbs', 'fat'] as const).map(f => (
                            <td key={f} className="pr-2 pb-2">
                              <input type="number" value={item[f]} onChange={e => updateItem(meal.id, item.id, f, Number(e.target.value))}
                                className="w-16 px-2 py-1.5 rounded-lg border bg-transparent text-xs"
                                style={inputStyle} />
                            </td>
                          ))}
                          <td className="pb-2">
                            <button onClick={() => removeItem(meal.id, item.id)} className="px-2 py-1 rounded hover:bg-red-500/10"
                              style={{ color: '#EF4444' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => addItem(meal.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-all"
                  style={{ color: '#C8FF00', borderColor: 'rgba(200,255,0,0.3)' }}>
                  + Adicionar alimento
                </button>
              </div>
              <div className="mt-3">
                <input value={meal.substitution ?? ''} onChange={e => updateMeal(meal.id, 'substitution', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs"
                  style={{ ...inputStyle, color: '#888888' }} placeholder="Substituição (opcional)" />
              </div>
            </div>
          </div>
        )
      })}

      <Button onClick={addMeal} variant="outline" className="border-dashed"
        style={{ borderColor: 'rgba(200,255,0,0.3)', color: '#C8FF00', borderRadius: '16px', background: 'rgba(200,255,0,0.04)' }}>
        + Nova refeição
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()

  const { data: student, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => studentService.getById(id) })
  const { data: anamnesis } = useQuery({ queryKey: ['anamnesis', id], queryFn: () => anamnesisService.getByUser(id) })
  const { data: assessments = [] } = useQuery({ queryKey: ['assessments', id], queryFn: () => assessmentService.list(id) })
  const { data: exams = [] } = useQuery({ queryKey: ['exams', id], queryFn: () => examService.list(id) })
  const { data: weightHistory = [] } = useQuery({ queryKey: ['weight', id], queryFn: () => weightService.getHistory(id) })
  const { data: dietPlan } = useQuery({ queryKey: ['diet', id], queryFn: () => mealPlanService.getMealPlan(id) })

  // suppress unused variable warnings for anamnesis (used in DietEditor via query)
  void anamnesis

  const updateExam = useMutation({
    mutationFn: ({ examId, status, notes }: { examId: string; status: 'analisado' | 'pendente'; notes?: string }) =>
      examService.updateStatus(examId, status, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', id] }); toast.success('Exame atualizado') }
  })

  const saveDiet = useMutation({
    mutationFn: (plan: Partial<DietPlan>) => mealPlanService.upsertMealPlan({ ...plan, user_id: id, nutritionist_id: 'nutri-1' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet', id] }); toast.success('Plano salvo!') }
  })

  const [notifyOpen, setNotifyOpen] = useState(false)
  const [whatsappMsg, setWhatsappMsg] = useState('')
  const [notifyTemplate, setNotifyTemplate] = useState<string>('vencimento')
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')

  if (isLoading) return <div className="p-8"><Skeleton className="h-12 w-64 mb-4" style={{ background: '#262626' }} /></div>
  if (!student) return <div className="p-8" style={{ color: '#888888' }}>Aluno não encontrado.</div>

  const chartData = weightHistory.map(w => ({
    date: new Date(w.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: w.weight
  }))

  const anamnesisData = anamnesis
  // Idade derivada de data_nascimento (coluna gravada pelo app); idade legada não é mais usada
  const idadeAnamnese = calcularIdade(anamnesisData?.data_nascimento)

  const expiresDate = student.subscription?.expires_at
    ? new Date(student.subscription.expires_at).toLocaleDateString('pt-BR')
    : ''

  const notifyTemplates = [
    {
      id: 'vencimento',
      label: 'Plano vencendo',
      icon: '⏰',
      message: `Olá ${student.name}! 👋\n\nPassando para avisar que o seu plano DenaVita ${student.subscription?.status === 'vencido' ? 'venceu' : `vence em ${expiresDate}`}.\n\nRenove agora para continuar tendo acesso ao seu plano alimentar personalizado e suporte contínuo. 💪\n\nQualquer dúvida, estou à disposição!`,
      pushTitle: 'Seu plano está vencendo ⏰',
      pushBody: `Renove agora para continuar com seu plano alimentar personalizado.`,
    },
    {
      id: 'aula',
      label: 'Aula nova no app',
      icon: '🎥',
      message: `Olá ${student.name}! 🎥\n\nTem conteúdo novo esperando por você no app DenaVita!\n\nUma nova aula foi adicionada ao seu plano — acesse agora e confira. 💪`,
      pushTitle: 'Nova aula disponível! 🎥',
      pushBody: 'Acesse o app DenaVita e confira o novo conteúdo do seu plano.',
    },
    {
      id: 'plano',
      label: 'Novo plano disponível',
      icon: '🥗',
      message: `Olá ${student.name}! 🥗\n\nSeu novo plano alimentar personalizado está disponível no app DenaVita!\n\nAcesse agora para ver suas refeições e começar com tudo. 💪`,
      pushTitle: 'Novo plano alimentar 🥗',
      pushBody: 'Seu plano personalizado foi atualizado. Acesse para conferir suas refeições.',
    },
    {
      id: 'peso',
      label: 'Registrar peso',
      icon: '⚖️',
      message: `Olá ${student.name}! ⚖️\n\nLembre-se de registrar seu peso hoje no app DenaVita.\n\nAcompanhar sua evolução é fundamental para o sucesso! 💪`,
      pushTitle: 'Hora de registrar seu peso ⚖️',
      pushBody: 'Acompanhar sua evolução é fundamental para atingir sua meta!',
    },
    {
      id: 'custom',
      label: 'Personalizada',
      icon: '✏️',
      message: '',
      pushTitle: '',
      pushBody: '',
    },
  ]

  const openNotify = (templateId = 'vencimento') => {
    const tpl = notifyTemplates.find(t => t.id === templateId)
    setNotifyTemplate(templateId)
    setWhatsappMsg(tpl?.message ?? '')
    setPushTitle(tpl?.pushTitle ?? '')
    setPushBody(tpl?.pushBody ?? '')
    setNotifyOpen(true)
  }

  const sendWhatsapp = () => {
    // TODO: conectar API WhatsApp (Twilio, Z-API, Evolution API, etc.)
    const phone = student.phone?.replace(/\D/g, '') ?? ''
    const encoded = encodeURIComponent(whatsappMsg)
    if (phone) {
      window.open(`https://wa.me/55${phone}?text=${encoded}`, '_blank')
    } else {
      toast.error('Telefone do aluno não cadastrado')
    }
    toast.success('WhatsApp aberto!')
    setNotifyOpen(false)
  }

  const sendAppNotification = () => {
    // TODO: conectar API de push notifications do app (Expo Push / FCM)
    toast.success('Notificação enviada ao app! (mock)')
    setNotifyOpen(false)
  }

  return (
    <div>

      {/* Sheet — Avisar vencimento */}
      <Sheet open={notifyOpen} onOpenChange={setNotifyOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-md border-l"
          style={{ background: '#262626', borderColor: '#3D3D3D' }}
        >
          <SheetHeader className="mb-6">
            <SheetTitle style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF', fontSize: '18px' }}>
              Notificar aluno
            </SheetTitle>
            <p className="text-sm" style={{ color: '#888888' }}>
              Escolha o tipo de aviso para <strong style={{ color: '#FFFFFF' }}>{student.name}</strong>.
            </p>
          </SheetHeader>

          {/* Template selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {notifyTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => {
                  setNotifyTemplate(tpl.id)
                  setWhatsappMsg(tpl.message)
                  setPushTitle(tpl.pushTitle)
                  setPushBody(tpl.pushBody)
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                style={{
                  background: notifyTemplate === tpl.id ? 'rgba(200,255,0,0.08)' : '#2F2F2F',
                  borderColor: notifyTemplate === tpl.id ? '#C8FF00' : '#3D3D3D',
                  color: notifyTemplate === tpl.id ? '#C8FF00' : '#888888',
                  fontSize: '12px',
                  fontWeight: notifyTemplate === tpl.id ? 600 : 400,
                }}
              >
                <span>{tpl.icon}</span>
                <span>{tpl.label}</span>
              </button>
            ))}
          </div>

          {/* WhatsApp section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={15} style={{ color: '#25D366' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Mensagem WhatsApp</span>
            </div>
            <Textarea
              value={whatsappMsg}
              onChange={e => setWhatsappMsg(e.target.value)}
              rows={8}
              className="resize-none border text-sm leading-relaxed"
              style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D', borderRadius: '12px' }}
            />
            <p className="text-xs mt-1.5" style={{ color: '#555555' }}>
              {student.phone
                ? `Será aberto o WhatsApp Web para: ${student.phone}`
                : 'Telefone não cadastrado — adicione em Cadastro'}
            </p>
            <Button
              onClick={sendWhatsapp}
              className="w-full mt-3 font-semibold"
              style={{ background: '#25D366', color: '#FFFFFF', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}
            >
              <Send size={15} className="mr-2" />
              Enviar WhatsApp
            </Button>
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: '#3D3D3D' }} />
            <span className="text-xs" style={{ color: '#555555' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: '#3D3D3D' }} />
          </div>

          {/* App notification section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} style={{ color: '#C8FF00' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Notificação no app</span>
            </div>

            {/* Título */}
            <div className="mb-3">
              <label className="text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#555555' }}>Título</label>
              <input
                value={pushTitle}
                onChange={e => setPushTitle(e.target.value)}
                placeholder="Ex: Nova aula disponível! 🎥"
                className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-1 focus:ring-[#C8FF00]"
                style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            {/* Descrição */}
            <div className="mb-4">
              <label className="text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#555555' }}>Descrição</label>
              <textarea
                value={pushBody}
                onChange={e => setPushBody(e.target.value)}
                placeholder="Ex: Acesse o app e confira o conteúdo novo do seu plano."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none focus:ring-1 focus:ring-[#C8FF00] leading-relaxed"
                style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }}
              />
            </div>

            {/* Preview */}
            {(pushTitle || pushBody) && (
              <div className="mb-4 p-3 rounded-xl border" style={{ background: '#1C1C1C', borderColor: '#3D3D3D' }}>
                <p className="text-xs mb-2" style={{ color: '#555555' }}>Prévia no celular</p>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#C8FF00' }}>
                    <Bell size={14} style={{ color: '#1C1C1C' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-tight" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                      {pushTitle || 'Título da notificação'}
                    </p>
                    {pushBody && (
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: '#888888' }}>
                        {pushBody}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={sendAppNotification}
              variant="outline"
              className="w-full font-semibold"
              disabled={!pushTitle.trim()}
              style={{ borderColor: '#C8FF00', color: '#C8FF00', background: 'rgba(200,255,0,0.05)', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}
            >
              <Bell size={15} className="mr-2" />
              Enviar notificação no app
            </Button>
            {!pushTitle.trim() && (
              <p className="text-xs mt-1.5 text-center" style={{ color: '#555555' }}>Preencha o título para enviar</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3 mb-6">
        <Link href="/alunos">
          <button className="p-2 rounded-xl hover:bg-white/10 transition-all">
            <ArrowLeft size={20} style={{ color: '#888888' }} />
          </button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: '#C8FF00', color: '#1C1C1C', fontFamily: 'Poppins, sans-serif' }}>
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>{student.name}</h1>
            <p className="text-sm" style={{ color: '#888888' }}>{student.email} · {student.goal_label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <GenerateDietButton studentId={student.id} />
          <Button
            onClick={() => openNotify('vencimento')}
            size="sm"
            style={{
              background: 'rgba(200,255,0,0.08)',
              color: '#C8FF00',
              border: '1px solid rgba(200,255,0,0.3)',
              borderRadius: '10px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            <Bell size={14} className="mr-1.5" />
            Notificar aluno
          </Button>
          <Badge style={{
            background: student.status === 'ativo' ? 'rgba(200,255,0,0.12)' : 'rgba(136,136,136,0.12)',
            color: student.status === 'ativo' ? '#C8FF00' : '#888888',
            border: 'none', borderRadius: '9999px'
          }}>
            {student.status === 'ativo' ? 'Ativo' : student.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="mb-6 p-1 rounded-2xl" style={{ background: '#262626', border: '1px solid #2A2A2A' }}>
          {[
            { value: 'cadastro', label: 'Cadastro' },
            { value: 'anamnese', label: 'Anamnese' },
            { value: 'avaliacao', label: 'Avaliação' },
            { value: 'exames', label: 'Exames' },
            { value: 'prescricao', label: 'Prescrição' },
            { value: 'evolucao', label: 'Evolução' },
            { value: 'assinatura', label: 'Assinatura' },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="rounded-xl text-sm transition-all
                data-[state=active]:bg-[#C8FF00]
                data-[state=active]:text-black
                data-[state=active]:font-bold
                data-[state=active]:shadow-none"
              style={{ color: '#888888' }}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* CADASTRO */}
        <TabsContent value="cadastro">
          <div className="rounded-2xl border p-6 max-w-lg" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
            <InfoRow label="Nome" value={student.name} />
            <InfoRow label="E-mail" value={student.email} />
            <InfoRow label="Telefone" value={student.phone} />
            <InfoRow label="Data de nascimento" value={student.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR') : null} />
            <InfoRow label="Objetivo" value={student.goal_label} />
            <InfoRow label="Peso atual" value={student.current_weight ? `${student.current_weight} kg` : null} />
            <InfoRow label="Peso meta" value={student.goal_weight ? `${student.goal_weight} kg` : null} />
            <InfoRow label="Cadastrado em" value={new Date(student.created_at).toLocaleDateString('pt-BR')} />
          </div>
        </TabsContent>

        {/* ANAMNESE */}
        <TabsContent value="anamnese">
          {!anamnesisData ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
              Anamnese não preenchida pelo aluno ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Sexo', traduzirCampo('sexo', anamnesisData.sexo)],
                ['Data de nascimento', formatarData(anamnesisData.data_nascimento)],
                ['Idade', idadeAnamnese != null ? `${idadeAnamnese} anos` : '—'],
                ['Peso', `${anamnesisData.peso} kg`],
                ['Altura', `${anamnesisData.altura} cm`],
                ['Objetivo', traduzirCampo('objetivo', anamnesisData.objetivo)],
                ['Tempo de treino', traduzirCampo('tempo_treino', anamnesisData.tempo_treino)],
                ['Frequência', traduzirCampo('frequencia_treino', anamnesisData.frequencia_treino)],
                ['Come no trabalho', traduzirBooleano(anamnesisData.come_no_trabalho)],
                ['Suplementação', traduzirCampo('condicao_suplemento', anamnesisData.condicao_suplemento)],
                ['Suplementos', traduzirCampo('suplementos_atuais', anamnesisData.suplementos_atuais)],
                ['Alergias', traduzirCampo('alergias', anamnesisData.alergias)],
                ['Doença crônica', traduzirCondicional(anamnesisData.doenca_cronica)],
                ['Medicamento', traduzirCondicional(anamnesisData.medicamento)],
                ['Histórico de lesão', traduzirCondicional(anamnesisData.historico_lesao)],
                ['Período de fome', traduzirCampo('periodo_fome', anamnesisData.periodo_fome)],
                ['Preferência alimentar', traduzirCampo('preferencia_alimentar', anamnesisData.preferencia_alimentar)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border p-4" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                  <InfoRow label={label as string} value={value as string} />
                </div>
              ))}
              <div className="col-span-2 rounded-2xl border p-4" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                <InfoRow label="Alimentação atual" value={anamnesisData.alimentacao_atual} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* AVALIAÇÃO */}
        <TabsContent value="avaliacao">
          {assessments.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
              Nenhuma avaliação registrada.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {assessments.map(a => (
                <div key={a.id} className="rounded-2xl border p-6" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
                      {new Date(a.date).toLocaleDateString('pt-BR')} — {a.type === 'bioimpedance' ? 'Bioimpedância' : 'Dobras Pollock'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Peso', `${a.weight} kg`], ['IMC', a.bmi.toFixed(1)],
                      ['% Gordura', a.body_fat_percentage ? `${a.body_fat_percentage}%` : '-'],
                      ['Massa muscular', a.muscle_mass ? `${a.muscle_mass} kg` : '-'],
                      ['Gordura visceral', a.visceral_fat ? `${a.visceral_fat}` : '-'],
                      ['Massa óssea', a.bone_mass ? `${a.bone_mass} kg` : '-'],
                    ].map(([label, val]) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: '#2F2F2F' }}>
                        <p className="text-xs" style={{ color: '#555555' }}>{label}</p>
                        <p className="text-lg font-bold mt-1" style={{ fontFamily: 'Poppins, sans-serif', color: '#C8FF00' }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EXAMES */}
        <TabsContent value="exames">
          {exams.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
              Nenhum exame enviado.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {exams.map(exam => (
                <div key={exam.id} className="rounded-2xl border p-5" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#2F2F2F' }}>
                        {exam.file_type === 'pdf'
                          ? <span className="text-lg">📄</span>
                          : <span className="text-lg">🖼️</span>}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{exam.file_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                          Enviado em {new Date(exam.uploaded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge style={{
                        background: exam.status === 'analisado' ? 'rgba(200,255,0,0.12)' : 'rgba(245,158,11,0.12)',
                        color: exam.status === 'analisado' ? '#C8FF00' : '#F59E0B',
                        border: 'none', borderRadius: '9999px'
                      }}>
                        {exam.status === 'analisado'
                          ? <span className="flex items-center gap-1"><CheckCircle size={12} />Analisado</span>
                          : <span className="flex items-center gap-1"><Clock size={12} />Pendente</span>}
                      </Badge>
                      <a href={exam.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" style={{ borderRadius: '10px', borderColor: '#3D3D3D', color: '#888888' }}>
                          <Download size={14} className="mr-1" /> Baixar
                        </Button>
                      </a>
                      {exam.status === 'pendente' && (
                        <Button size="sm"
                          onClick={() => updateExam.mutate({ examId: exam.id, status: 'analisado', notes: 'Analisado pelo nutricionista.' })}
                          style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontWeight: 600 }}>
                          Marcar analisado
                        </Button>
                      )}
                    </div>
                  </div>
                  {exam.notes && (
                    <div className="mt-3 p-3 rounded-xl" style={{ background: '#2F2F2F' }}>
                      <p className="text-xs" style={{ color: '#888888' }}>{exam.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PRESCRIÇÃO */}
        <TabsContent value="prescricao">
          <DietEditor
            plan={dietPlan}
            onSave={plan => saveDiet.mutate(plan)}
            studentId={id}
          />
        </TabsContent>

        {/* EVOLUÇÃO */}
        <TabsContent value="evolucao">
          <div className="rounded-2xl border p-6" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
            <h3 className="font-semibold mb-6" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>Evolução do peso</h3>
            {chartData.length === 0 ? (
              <p className="text-sm" style={{ color: '#555555' }}>Nenhum registro de peso.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3D3D3D" />
                  <XAxis dataKey="date" tick={{ fill: '#555555', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#555555', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#262626', border: '1px solid #2A2A2A', borderRadius: '12px', color: '#FFFFFF' }}
                    labelStyle={{ color: '#888888' }}
                  />
                  <Line type="monotone" dataKey="peso" stroke="#C8FF00" strokeWidth={2.5} dot={{ fill: '#C8FF00', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        {/* ASSINATURA */}
        <TabsContent value="assinatura">
          {!student.subscription ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
              Nenhuma assinatura ativa.
            </div>
          ) : (
            <div className="rounded-2xl border p-6 max-w-sm" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
              <InfoRow label="Plano" value={student.subscription.plan} />
              <InfoRow label="Status" value={student.subscription.status} />
              <InfoRow label="Início" value={new Date(student.subscription.started_at).toLocaleDateString('pt-BR')} />
              <InfoRow label="Expira em" value={new Date(student.subscription.expires_at).toLocaleDateString('pt-BR')} />
              <InfoRow label="Valor" value={`R$ ${student.subscription.price.toFixed(2)}`} />
              <Button className="mt-5 w-full"
                style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Renovar assinatura
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Needed to satisfy TypeScript for the Topbar import (not used directly on this page)
const _Topbar = Topbar
void _Topbar
