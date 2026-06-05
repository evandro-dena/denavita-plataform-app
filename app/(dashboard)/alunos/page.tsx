'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentService, anamnesisService, assessmentService, examService, weightService } from '@/lib/api/students'
import { mealPlanService } from '@/lib/api/diet'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Search, Plus, MoreHorizontal, User, ClipboardList,
  UtensilsCrossed, Activity, FileText, TrendingUp, CreditCard,
  Trash2, X, CheckCircle, Clock, Sparkles, Download, ChevronRight,
  Pencil, Save, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Student } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const NUTRI_ID = 'nutri-1'

type PanelSection =
  | 'cadastro' | 'anamnese' | 'nutricao' | 'avaliacao'
  | 'exames' | 'evolucao' | 'assinatura'

const MENU_ITEMS: { key: PanelSection; label: string; icon: React.ElementType }[] = [
  { key: 'cadastro',   label: 'Cadastro',   icon: User },
  { key: 'anamnese',   label: 'Anamnese',   icon: ClipboardList },
  { key: 'nutricao',   label: 'Nutrição',   icon: UtensilsCrossed },
  { key: 'avaliacao',  label: 'Avaliação',  icon: Activity },
  { key: 'exames',     label: 'Exames',     icon: FileText },
  { key: 'evolucao',   label: 'Evolução',   icon: TrendingUp },
  { key: 'assinatura', label: 'Assinatura', icon: CreditCard },
]

const TABS = [
  { key: 'ativo',    label: 'Aceitos' },
  { key: 'espera',   label: 'Lista de espera' },
  { key: 'excluido', label: 'Excluídos' },
]

function statusColor(status: Student['status']) {
  if (status === 'ativo')    return { bg: 'rgba(200,255,0,0.12)',   color: '#C8FF00' }
  if (status === 'inativo')  return { bg: 'rgba(136,136,136,0.12)', color: '#888888' }
  if (status === 'espera')   return { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' }
  return                            { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444' }
}

// ─── Shared styles ───────────────────────────────────────────────
const iCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-[#C8FF00] transition-all'
const iStyle = { background: '#111111', color: '#FFFFFF', borderColor: '#2A2A2A' }
const lblCls = 'text-xs uppercase tracking-wide mb-1 block'

// ─── Info Row ────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b last:border-0" style={{ borderColor: '#2A2A2A' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>{label}</span>
      <span className="text-sm" style={{ color: value ? '#FFFFFF' : '#555555' }}>{value ?? '—'}</span>
    </div>
  )
}

// ─── Edit Action Bar ─────────────────────────────────────────────
function EditBar({ isEditing, onEdit, onSave, onCancel, saving }: {
  isEditing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; saving?: boolean
}) {
  if (!isEditing) return (
    <button onClick={onEdit}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/10"
      style={{ color: '#888888', border: '1px solid #2A2A2A' }}>
      <Pencil size={12} /> Editar
    </button>
  )
  return (
    <div className="flex items-center gap-2">
      <button onClick={onCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all hover:bg-white/10"
        style={{ color: '#888888', border: '1px solid #2A2A2A' }}>
        <XCircle size={12} /> Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={{ background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' }}>
        <Save size={12} /> {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}

// ─── Panel Header ────────────────────────────────────────────────
function PanelHeader({ student, section, onClose }: {
  student: Student; section: PanelSection; onClose: () => void
}) {
  const item = MENU_ITEMS.find(m => m.key === section)
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#2A2A2A' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' }}>
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{student.name}</p>
          <p className="text-xs" style={{ color: '#888888' }}>{item?.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/alunos/${student.id}`}>
          <button className="text-xs px-2.5 py-1 rounded-lg transition-all hover:bg-white/10" style={{ color: '#888888' }}>
            Ver ficha completa <ChevronRight size={11} className="inline" />
          </button>
        </Link>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
          <X size={16} style={{ color: '#555555' }} />
        </button>
      </div>
    </div>
  )
}

// ─── Cadastro Panel ───────────────────────────────────────────────
function CadastroPanel({ student }: { student: Student }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: student.name ?? '',
    email: student.email ?? '',
    phone: student.phone ?? '',
    birth_date: student.birth_date ?? '',
    goal_label: student.goal_label ?? '',
    current_weight: String(student.current_weight ?? ''),
    goal_weight: String(student.goal_weight ?? ''),
  })

  const save = useMutation({
    mutationFn: () => studentService.update(student.id, {
      ...form,
      current_weight: form.current_weight ? Number(form.current_weight) : undefined,
      goal_weight: form.goal_weight ? Number(form.goal_weight) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Cadastro atualizado!')
      setEditing(false)
    },
  })

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
      <div className="flex justify-end">
        <EditBar isEditing={editing} onEdit={() => setEditing(true)}
          onSave={() => save.mutate()} onCancel={() => setEditing(false)} saving={save.isPending} />
      </div>

      {!editing ? (
        <div>
          <InfoRow label="Nome" value={student.name} />
          <InfoRow label="E-mail" value={student.email} />
          <InfoRow label="Telefone" value={student.phone} />
          <InfoRow label="Data de nascimento" value={student.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR') : null} />
          <InfoRow label="Objetivo" value={student.goal_label} />
          <InfoRow label="Peso atual" value={student.current_weight ? `${student.current_weight} kg` : null} />
          <InfoRow label="Peso meta" value={student.goal_weight ? `${student.goal_weight} kg` : null} />
          <InfoRow label="Cadastrado em" value={new Date(student.created_at).toLocaleDateString('pt-BR')} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {([
            ['name', 'Nome', 'text'],
            ['email', 'E-mail', 'email'],
            ['phone', 'Telefone', 'tel'],
            ['birth_date', 'Data de nascimento', 'date'],
            ['goal_label', 'Objetivo', 'text'],
            ['current_weight', 'Peso atual (kg)', 'number'],
            ['goal_weight', 'Peso meta (kg)', 'number'],
          ] as [keyof typeof form, string, string][]).map(([field, label, type]) => (
            <div key={field}>
              <label className={lblCls} style={{ color: '#555555' }}>{label}</label>
              <input type={type} value={form[field]} onChange={f(field)} className={iCls} style={iStyle} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Anamnese Panel ───────────────────────────────────────────────
function AnamnesePanel({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['anamnesis', studentId],
    queryFn: () => anamnesisService.getByUser(studentId),
  })

  if (isLoading) return <div className="p-5"><Skeleton className="h-8 w-full mb-2" style={{ background: '#2A2A2A' }} /></div>
  if (!data) return (
    <div className="p-5 text-center flex flex-col items-center gap-3" style={{ color: '#555555' }}>
      <ClipboardList size={32} className="opacity-30" />
      <p className="text-sm">Anamnese ainda não preenchida pelo aluno.</p>
      <Link href={`/alunos/${studentId}?tab=anamnese`}>
        <Button size="sm" style={{ background: '#C8FF00', color: '#111111', borderRadius: '10px', fontFamily: 'Poppins, sans-serif' }}>
          <Pencil size={13} className="mr-1.5" /> Preencher agora
        </Button>
      </Link>
    </div>
  )

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
      <div className="flex justify-end">
        <Link href={`/alunos/${studentId}?tab=anamnese`}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/10"
            style={{ color: '#888888', border: '1px solid #2A2A2A' }}>
            <Pencil size={12} /> Editar completo
          </button>
        </Link>
      </div>
      <InfoRow label="Sexo" value={data.sexo} />
      <InfoRow label="Idade" value={`${data.idade} anos`} />
      <InfoRow label="Peso / Altura" value={`${data.peso} kg · ${data.altura} cm`} />
      <InfoRow label="Objetivo" value={data.objetivo} />
      <InfoRow label="Frequência de treino" value={data.frequencia_treino} />
      <InfoRow label="Tempo de treino" value={data.tempo_treino} />
      <InfoRow label="Alergias" value={data.alergias?.join(', ') || 'Nenhuma'} />
      <InfoRow label="Suplementos" value={data.suplementos_atuais?.join(', ') || 'Nenhum'} />
      <InfoRow label="Doença crônica" value={data.doenca_cronica?.tem ? data.doenca_cronica.qual : 'Não'} />
      <InfoRow label="Medicamento" value={data.medicamento?.usa ? data.medicamento.qual : 'Não'} />
      <InfoRow label="Preferência alimentar" value={data.preferencia_alimentar} />
      <InfoRow label="Alimentação atual" value={data.alimentacao_atual} />
    </div>
  )
}

// ─── Nutrição Panel ───────────────────────────────────────────────
function NutricaoPanel({ student }: { student: Student }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: allPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['diet-plans-all'],
    queryFn: () => mealPlanService.listAll(NUTRI_ID),
  })

  const { data: activePlanId, isLoading: loadingActive } = useQuery({
    queryKey: ['diet-active', student.id],
    queryFn: () => mealPlanService.getActivePlanId(student.id),
  })

  const activate = useMutation({
    mutationFn: (planId: string | null) => mealPlanService.activateForStudent(planId, student.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet-active', student.id] })
      qc.invalidateQueries({ queryKey: ['diet', student.id] })
    },
  })

  const handleToggle = (planId: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      activate.mutate(null)
      toast.success('Plano desativado.')
    } else {
      activate.mutate(planId)
      toast.success('Plano selecionado para o aluno!')
    }
  }

  const filtered = allPlans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const isLoading = loadingPlans || loadingActive

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#555555' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar plano..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: '#111111', color: '#FFFFFF', borderColor: '#2A2A2A' }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: '#555555' }}>
          {allPlans.length} plano{allPlans.length !== 1 ? 's' : ''} disponíveis
        </p>
      </div>

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" style={{ background: '#222222' }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#555555' }}>
            <UtensilsCrossed size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum plano encontrado.</p>
          </div>
        ) : (
          filtered.map(plan => {
            const isActive = activePlanId === plan.id
            return (
              <div
                key={plan.id}
                className="rounded-2xl border p-4 transition-all"
                style={{
                  background: isActive ? 'rgba(200,255,0,0.06)' : '#222222',
                  borderColor: isActive ? 'rgba(200,255,0,0.4)' : '#2A2A2A',
                }}
              >
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-semibold leading-tight" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                    {plan.name}
                  </p>
                  <Badge style={{
                    background: plan.source === 'ia' ? 'rgba(200,255,0,0.12)' : 'rgba(136,136,136,0.1)',
                    color: plan.source === 'ia' ? '#C8FF00' : '#888888',
                    border: 'none', borderRadius: '9999px', fontSize: '10px', flexShrink: 0,
                  }}>
                    {plan.source === 'ia' ? '✦ IA' : 'Manual'}
                  </Badge>
                </div>

                {/* Macros mini */}
                <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: '#888888' }}>
                  <span style={{ color: '#C8FF00', fontWeight: 600 }}>{plan.total_calories} kcal</span>
                  <span>P {plan.total_protein}g</span>
                  <span>C {plan.total_carbs}g</span>
                  <span>G {plan.total_fat}g</span>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isActive ? '#C8FF00' : '#555555' }}
                  >
                    {isActive ? 'Selecionado' : 'Oculto'}
                  </span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggle(plan.id, isActive)}
                    disabled={activate.isPending}
                  />
                </div>
              </div>
            )
          })
        )}

        {/* Link to full prescriptions */}
        <Link href={`/alunos/${student.id}?tab=prescricao`} className="mt-1">
          <button className="w-full py-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-white/5"
            style={{ borderColor: '#2A2A2A', color: '#888888' }}>
            + Criar novo plano para este aluno
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Avaliação Panel ──────────────────────────────────────────────
function AvaliacaoPanel({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', type: 'bioimpedance', weight: '', height: '', body_fat_percentage: '', muscle_mass: '' })

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessments', studentId],
    queryFn: () => assessmentService.list(studentId),
  })

  const save = useMutation({
    mutationFn: () => assessmentService.add(studentId, {
      type: form.type as 'bioimpedance' | 'pollock',
      date: form.date || new Date().toISOString().split('T')[0],
      weight: Number(form.weight), height: Number(form.height),
      body_fat_percentage: form.body_fat_percentage ? Number(form.body_fat_percentage) : undefined,
      muscle_mass: form.muscle_mass ? Number(form.muscle_mass) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assessments', studentId] }); toast.success('Avaliação registrada!'); setAdding(false) },
  })

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
      <div className="flex justify-end">
        <EditBar isEditing={adding} onEdit={() => setAdding(true)}
          onSave={() => save.mutate()} onCancel={() => setAdding(false)}
          saving={save.isPending} />
      </div>

      {adding && (
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ background: '#222222', borderColor: 'rgba(200,255,0,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>Nova avaliação</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lblCls} style={{ color: '#555555' }}>Data</label><input type="date" value={form.date} onChange={f('date')} className={iCls} style={iStyle} /></div>
            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Tipo</label>
              <select value={form.type} onChange={f('type')} className={iCls} style={iStyle}>
                <option value="bioimpedance">Bioimpedância</option>
                <option value="pollock">Dobras Pollock</option>
              </select>
            </div>
            <div><label className={lblCls} style={{ color: '#555555' }}>Peso (kg)</label><input type="number" value={form.weight} onChange={f('weight')} className={iCls} style={iStyle} /></div>
            <div><label className={lblCls} style={{ color: '#555555' }}>Altura (cm)</label><input type="number" value={form.height} onChange={f('height')} className={iCls} style={iStyle} /></div>
            <div><label className={lblCls} style={{ color: '#555555' }}>% Gordura</label><input type="number" value={form.body_fat_percentage} onChange={f('body_fat_percentage')} className={iCls} style={iStyle} /></div>
            <div><label className={lblCls} style={{ color: '#555555' }}>Massa muscular (kg)</label><input type="number" value={form.muscle_mass} onChange={f('muscle_mass')} className={iCls} style={iStyle} /></div>
          </div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-20 rounded-2xl" style={{ background: '#2A2A2A' }} />
        : !assessments.length ? (
          <div className="text-center py-4" style={{ color: '#555555' }}>
            <Activity size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma avaliação. Clique em Editar para adicionar.</p>
          </div>
        ) : assessments.map(a => (
          <div key={a.id} className="rounded-2xl border p-4" style={{ background: '#222222', borderColor: '#2A2A2A' }}>
            <p className="text-xs mb-3" style={{ color: '#555555' }}>
              {new Date(a.date).toLocaleDateString('pt-BR')} — {a.type === 'bioimpedance' ? 'Bioimpedância' : 'Dobras Pollock'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[['Peso', `${a.weight} kg`], ['IMC', a.bmi.toFixed(1)], ['% Gordura', a.body_fat_percentage ? `${a.body_fat_percentage}%` : '-'], ['Massa muscular', a.muscle_mass ? `${a.muscle_mass} kg` : '-']].map(([label, val]) => (
                <div key={label} className="rounded-xl p-3" style={{ background: '#1A1A1A' }}>
                  <p className="text-xs" style={{ color: '#555555' }}>{label}</p>
                  <p className="text-base font-bold mt-0.5" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

// ─── Exames Panel ─────────────────────────────────────────────────
function ExamesPanel({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ file_name: '', file_type: 'pdf', notes: '' })

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams', studentId],
    queryFn: () => examService.list(studentId),
  })

  const save = useMutation({
    mutationFn: () => examService.add(studentId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams', studentId] }); toast.success('Exame adicionado!'); setAdding(false); setForm({ file_name: '', file_type: 'pdf', notes: '' }) },
  })

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
      <div className="flex justify-end">
        <EditBar isEditing={adding} onEdit={() => setAdding(true)}
          onSave={() => save.mutate()} onCancel={() => setAdding(false)} saving={save.isPending} />
      </div>

      {adding && (
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ background: '#222222', borderColor: 'rgba(200,255,0,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>Adicionar exame</p>
          <div><label className={lblCls} style={{ color: '#555555' }}>Nome do arquivo</label><input value={form.file_name} onChange={f('file_name')} placeholder="ex: hemograma_jun2025.pdf" className={iCls} style={iStyle} /></div>
          <div>
            <label className={lblCls} style={{ color: '#555555' }}>Tipo</label>
            <select value={form.file_type} onChange={f('file_type')} className={iCls} style={iStyle}>
              <option value="pdf">PDF</option>
              <option value="image">Imagem</option>
            </select>
          </div>
          <div><label className={lblCls} style={{ color: '#555555' }}>Observações</label><textarea value={form.notes} onChange={f('notes')} rows={2} className={iCls + ' resize-none'} style={iStyle} /></div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-14 rounded-xl" style={{ background: '#2A2A2A' }} />
        : !exams.length ? (
          <div className="text-center py-4" style={{ color: '#555555' }}>
            <FileText size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum exame. Clique em Editar para adicionar.</p>
          </div>
        ) : exams.map(exam => (
          <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: '#222222', borderColor: '#2A2A2A' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{exam.file_type === 'pdf' ? '📄' : '🖼️'}</span>
              <div>
                <p className="text-xs font-medium" style={{ color: '#FFFFFF' }}>{exam.file_name}</p>
                <p className="text-xs" style={{ color: '#555555' }}>{new Date(exam.uploaded_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge style={{ background: exam.status === 'analisado' ? 'rgba(200,255,0,0.12)' : 'rgba(245,158,11,0.12)', color: exam.status === 'analisado' ? '#C8FF00' : '#F59E0B', border: 'none', borderRadius: '9999px', fontSize: '10px' }}>
                {exam.status === 'analisado' ? <span className="flex items-center gap-1"><CheckCircle size={10} />OK</span> : <span className="flex items-center gap-1"><Clock size={10} />Pendente</span>}
              </Badge>
              <a href={exam.file_url} target="_blank" rel="noopener noreferrer">
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-all"><Download size={13} style={{ color: '#888888' }} /></button>
              </a>
            </div>
          </div>
        ))}
    </div>
  )
}

// ─── Evolução Panel ───────────────────────────────────────────────
function EvolucaoPanel({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ weight: '', note: '' })

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['weight', studentId],
    queryFn: () => weightService.getHistory(studentId),
  })

  const save = useMutation({
    mutationFn: () => weightService.add(studentId, { weight: Number(form.weight), note: form.note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weight', studentId] }); toast.success('Peso registrado!'); setAdding(false); setForm({ weight: '', note: '' }) },
  })

  const chartData = history.map(w => ({
    date: new Date(w.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    peso: w.weight,
  }))

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
      <div className="flex justify-end">
        <EditBar isEditing={adding} onEdit={() => setAdding(true)}
          onSave={() => save.mutate()} onCancel={() => setAdding(false)} saving={save.isPending} />
      </div>

      {adding && (
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ background: '#222222', borderColor: 'rgba(200,255,0,0.3)' }}>
          <p className="text-xs font-semibold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>Registrar peso</p>
          <div><label className={lblCls} style={{ color: '#555555' }}>Peso (kg)</label><input type="number" step="0.1" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="ex: 72.5" className={iCls} style={iStyle} /></div>
          <div><label className={lblCls} style={{ color: '#555555' }}>Observação (opcional)</label><input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="ex: em jejum" className={iCls} style={iStyle} /></div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-32 rounded-xl" style={{ background: '#2A2A2A' }} /> : (
        <>
          <div className="rounded-2xl border p-4" style={{ background: '#222222', borderColor: '#2A2A2A' }}>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: '#555555' }}>Evolução do peso</p>
            {chartData.length === 0 ? <p className="text-sm text-center py-4" style={{ color: '#555555' }}>Nenhum registro.</p> : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" tick={{ fill: '#555555', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#555555', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '12px', color: '#FFFFFF' }} labelStyle={{ color: '#888888' }} />
                  <Line type="monotone" dataKey="peso" stroke="#C8FF00" strokeWidth={2} dot={{ fill: '#C8FF00', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {history.slice(0, 6).map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#222222' }}>
                <span className="text-xs" style={{ color: '#888888' }}>{new Date(w.recorded_at).toLocaleDateString('pt-BR')}</span>
                <span className="text-sm font-bold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Assinatura Panel ─────────────────────────────────────────────
function AssinaturaPanel({ student }: { student: Student }) {
  const qc = useQueryClient()
  const sub = student.subscription
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    plan: sub?.plan ?? 'mensal',
    status: sub?.status ?? 'ativo',
    expires_at: sub?.expires_at ? sub.expires_at.split('T')[0] : '',
    price: String(sub?.price ?? ''),
  })

  const save = useMutation({
    mutationFn: () => studentService.update(student.id, {
      subscription: sub ? { ...sub, plan: form.plan as 'mensal' | 'trimestral' | 'semestral' | 'anual', status: form.status as 'ativo' | 'vencendo' | 'vencido' | 'cancelado', expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : sub.expires_at, price: Number(form.price) } : undefined
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Assinatura atualizada!'); setEditing(false) },
  })

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const sColor = (s: string) => s === 'ativo' ? '#C8FF00' : s === 'vencendo' ? '#F59E0B' : s === 'vencido' ? '#EF4444' : '#888888'

  return (
    <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
      <div className="flex justify-end">
        <EditBar isEditing={editing} onEdit={() => setEditing(true)}
          onSave={() => save.mutate()} onCancel={() => setEditing(false)} saving={save.isPending} />
      </div>

      {!sub && !editing ? (
        <div className="text-center py-6" style={{ color: '#555555' }}>
          <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm mb-3">Nenhuma assinatura. Clique em Editar para adicionar.</p>
        </div>
      ) : !editing ? (
        <div className="rounded-2xl border p-4" style={{ background: '#222222', borderColor: '#2A2A2A' }}>
          <InfoRow label="Plano" value={sub!.plan} />
          <div className="flex flex-col gap-0.5 py-2.5 border-b" style={{ borderColor: '#2A2A2A' }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>Status</span>
            <span className="text-sm font-semibold" style={{ color: sColor(sub!.status) }}>{sub!.status}</span>
          </div>
          <InfoRow label="Início" value={new Date(sub!.started_at).toLocaleDateString('pt-BR')} />
          <InfoRow label="Expira em" value={new Date(sub!.expires_at).toLocaleDateString('pt-BR')} />
          <InfoRow label="Valor" value={`R$ ${sub!.price.toFixed(2)}`} />
        </div>
      ) : (
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ background: '#222222', borderColor: 'rgba(200,255,0,0.3)' }}>
          <div>
            <label className={lblCls} style={{ color: '#555555' }}>Plano</label>
            <select value={form.plan} onChange={f('plan')} className={iCls} style={iStyle}>
              {['mensal', 'trimestral', 'semestral', 'anual'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lblCls} style={{ color: '#555555' }}>Status</label>
            <select value={form.status} onChange={f('status')} className={iCls} style={iStyle}>
              {['ativo', 'vencendo', 'vencido', 'cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className={lblCls} style={{ color: '#555555' }}>Expira em</label><input type="date" value={form.expires_at} onChange={f('expires_at')} className={iCls} style={iStyle} /></div>
          <div><label className={lblCls} style={{ color: '#555555' }}>Valor (R$)</label><input type="number" value={form.price} onChange={f('price')} className={iCls} style={iStyle} /></div>
        </div>
      )}

      {!editing && (
        <Button onClick={() => { setForm({ plan: sub?.plan ?? 'mensal', status: sub?.status ?? 'ativo', expires_at: sub?.expires_at ? sub.expires_at.split('T')[0] : '', price: String(sub?.price ?? '') }); setEditing(true) }}
          className="w-full font-semibold"
          style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}>
          Renovar / Editar assinatura
        </Button>
      )}
    </div>
  )
}

// ─── Side Panel ───────────────────────────────────────────────────
function SidePanel({ student, section, onClose, onSectionChange }: {
  student: Student
  section: PanelSection
  onClose: () => void
  onSectionChange: (s: PanelSection) => void
}) {
  return (
    <div className="flex flex-col rounded-2xl border overflow-hidden h-full" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <PanelHeader student={student} section={section} onClose={onClose} />

      {/* Section nav */}
      <div className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: '#2A2A2A' }}>
        {MENU_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onSectionChange(item.key)}
            className="px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex-shrink-0"
            style={section === item.key
              ? { background: '#C8FF00', color: '#111111', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }
              : { color: '#888888', background: 'transparent' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {section === 'cadastro'   && <CadastroPanel student={student} />}
        {section === 'anamnese'   && <AnamnesePanel studentId={student.id} />}
        {section === 'nutricao'   && <NutricaoPanel student={student} />}
        {section === 'avaliacao'  && <AvaliacaoPanel studentId={student.id} />}
        {section === 'exames'     && <ExamesPanel studentId={student.id} />}
        {section === 'evolucao'   && <EvolucaoPanel studentId={student.id} />}
        {section === 'assinatura' && <AssinaturaPanel student={student} />}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function AlunosPage() {
  const [tab, setTab] = useState<'ativo' | 'espera' | 'excluido'>('ativo')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ student: Student; section: PanelSection } | null>(null)
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
    .filter(s =>
      tab === 'excluido' ? s.status === 'excluido'
      : tab === 'espera' ? s.status === 'espera'
      : (s.status === 'ativo' || s.status === 'inativo')
    )
    .filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )

  const openPanel = (student: Student, section: PanelSection) => {
    setSelected({ student, section })
  }

  const panelOpen = !!selected

  return (
    <div className="flex flex-col h-full">
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

      <div className={`flex gap-5 flex-1 min-h-0 transition-all duration-300`}>

        {/* ── Student List ── */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${panelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>

          {/* Search + Tabs */}
          <div className="flex flex-col gap-3">
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
                    {['Aluno', 'Objetivo', 'Expira em', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#555555' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const sc = statusColor(s.status)
                    const isSelected = selected?.student.id === s.id
                    return (
                      <tr
                        key={s.id}
                        className="transition-all cursor-pointer"
                        style={{
                          borderBottom: '1px solid #2A2A2A',
                          background: isSelected ? 'rgba(200,255,0,0.04)' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openPanel(s, 'cadastro')}
                            className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                              style={{ background: isSelected ? '#C8FF00' : '#333333', color: isSelected ? '#111111' : '#FFFFFF' }}>
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                              {!panelOpen && <p className="text-xs" style={{ color: '#888888' }}>{s.email}</p>}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>
                          {panelOpen ? null : (s.goal_label ?? '-')}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>
                          {s.subscription?.expires_at
                            ? new Date(s.subscription.expires_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={s.status === 'ativo'}
                              onCheckedChange={checked =>
                                toggleStatus.mutate({ id: s.id, status: checked ? 'ativo' : 'inativo' })
                              }
                            />
                            {!panelOpen && (
                              <Badge style={{ background: sc.bg, color: sc.color, border: 'none', borderRadius: '9999px', fontSize: '11px' }}>
                                {s.status === 'ativo' ? 'Ativo' : s.status === 'inativo' ? 'Inativo' : s.status === 'espera' ? 'Espera' : 'Excluído'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                                <MoreHorizontal size={16} style={{ color: '#888888' }} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '16px', minWidth: '180px', padding: '8px' }}
                            >
                              <p className="text-xs px-3 py-1.5 mb-1" style={{ color: '#555555' }}>Menu do aluno</p>
                              {MENU_ITEMS.map(item => (
                                <DropdownMenuItem
                                  key={item.key}
                                  onClick={() => openPanel(s, item.key)}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all"
                                  style={{ color: selected?.student.id === s.id && selected?.section === item.key ? '#C8FF00' : '#FFFFFF' }}
                                >
                                  <item.icon size={14} style={{ color: '#888888' }} />
                                  {item.label}
                                  <ChevronRight size={13} className="ml-auto" style={{ color: '#555555' }} />
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator style={{ background: '#2A2A2A', margin: '4px 0' }} />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Excluir ${s.name}?`))
                                    toggleStatus.mutate({ id: s.id, status: 'excluido' })
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
                                style={{ color: '#EF4444' }}
                              >
                                <Trash2 size={14} />
                                Excluir aluno
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Side Panel ── */}
        {selected && (
          <div className="w-[400px] flex-shrink-0 sticky top-0" style={{ height: 'calc(100vh - 120px)' }}>
            <SidePanel
              student={selected.student}
              section={selected.section}
              onClose={() => setSelected(null)}
              onSectionChange={section => setSelected(prev => prev ? { ...prev, section } : null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
