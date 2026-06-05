'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/api/dashboard'
import { studentService, dietReviewService } from '@/lib/api/students'
import Topbar from '@/components/layout/Topbar'
import { Users, Clock, ClipboardCheck, ChevronRight, MessageCircle, Bell, Send, ExternalLink, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { toast } from 'sonner'
import { Student } from '@/types'

const NUTRI_ID = 'nutri-1'

// ─── Contact Sheet ────────────────────────────────────────────────

interface ContactSheetProps {
  student: Student | null
  context: 'vencimento' | 'dieta' | null
  onClose: () => void
}

function ContactSheet({ student, context, onClose }: ContactSheetProps) {
  const expiresDate = student?.subscription?.expires_at
    ? new Date(student.subscription.expires_at).toLocaleDateString('pt-BR')
    : ''

  const templates = student ? [
    {
      id: 'vencimento',
      label: 'Plano vencendo',
      icon: '⏰',
      message: `Olá ${student.name}! 👋\n\nPassando para avisar que o seu plano DenaVita ${student.subscription?.status === 'vencido' ? 'venceu' : `vence em ${expiresDate}`}.\n\nRenove agora para continuar com seu plano alimentar personalizado e suporte contínuo. 💪\n\nQualquer dúvida, estou aqui!`,
      pushTitle: 'Seu plano está vencendo ⏰',
      pushBody: 'Renove agora para continuar com seu plano alimentar personalizado.',
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
  ] : []

  const initialTemplate = context === 'dieta' ? 'plano' : 'vencimento'
  const initial = templates.find(t => t.id === initialTemplate) ?? templates[0]

  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate)
  const [msg, setMsg] = useState(initial?.message ?? '')
  const [pushTitle, setPushTitle] = useState(initial?.pushTitle ?? '')
  const [pushBody, setPushBody] = useState(initial?.pushBody ?? '')

  const selectTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id)
    if (!tpl) return
    setSelectedTemplate(id)
    setMsg(tpl.message)
    setPushTitle(tpl.pushTitle)
    setPushBody(tpl.pushBody)
  }

  const sendWhatsapp = () => {
    const phone = student?.phone?.replace(/\D/g, '') ?? ''
    if (!phone) { toast.error('Telefone não cadastrado'); return }
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    toast.success('WhatsApp aberto!')
    onClose()
  }

  const sendNotification = () => {
    toast.success('Notificação enviada ao app! (mock)')
    onClose()
  }

  if (!student) return null

  const isVencido = student.subscription?.status === 'vencido'

  return (
    <Sheet open={!!student} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l p-0 overflow-y-auto"
        style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2A2A2A' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
              style={{ background: '#C8FF00', color: '#111111', fontFamily: 'Poppins, sans-serif' }}>
              {student.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
                {student.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{student.goal_label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all">
            <X size={18} style={{ color: '#555555' }} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">

          {/* Template selector */}
          <div>
            <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#555555' }}>Tipo de aviso</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => selectTemplate(tpl.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                  style={{
                    background: selectedTemplate === tpl.id ? 'rgba(200,255,0,0.08)' : '#222222',
                    borderColor: selectedTemplate === tpl.id ? '#C8FF00' : '#2A2A2A',
                    color: selectedTemplate === tpl.id ? '#C8FF00' : '#888888',
                    fontSize: '12px',
                    fontWeight: selectedTemplate === tpl.id ? 600 : 400,
                  }}
                >
                  <span>{tpl.icon}</span>
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status info */}
          {context === 'vencimento' && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#222222' }}>
              <Clock size={14} style={{ color: isVencido ? '#EF4444' : '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#888888' }}>
                Plano{' '}
                <strong style={{ color: isVencido ? '#EF4444' : '#F59E0B' }}>
                  {isVencido ? 'vencido' : `vence em ${expiresDate}`}
                </strong>
                {student.subscription?.plan && <span> · {student.subscription.plan}</span>}
              </span>
            </div>
          )}

          {context === 'dieta' && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#222222' }}>
              <ClipboardCheck size={14} style={{ color: '#F59E0B' }} />
              <span className="text-sm" style={{ color: '#888888' }}>
                Anamnese preenchida — <strong style={{ color: '#F59E0B' }}>dieta aguardando revisão</strong>
              </span>
            </div>
          )}

          {/* WhatsApp */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={15} style={{ color: '#25D366' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Mensagem WhatsApp</span>
              {student.phone && (
                <span className="text-xs ml-auto" style={{ color: '#555555' }}>{student.phone}</span>
              )}
            </div>
            <Textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={6}
              className="resize-none border text-sm leading-relaxed"
              style={{ background: '#111111', color: '#FFFFFF', borderColor: '#2A2A2A', borderRadius: '12px' }}
            />
            {!student.phone && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                Telefone não cadastrado. Adicione na ficha do aluno.
              </p>
            )}
            <Button
              onClick={sendWhatsapp}
              className="w-full mt-3 font-semibold"
              style={{ background: '#25D366', color: '#FFFFFF', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}
            >
              <Send size={14} className="mr-2" />
              Enviar WhatsApp
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#2A2A2A' }} />
            <span className="text-xs" style={{ color: '#555555' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: '#2A2A2A' }} />
          </div>

          {/* App notification */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} style={{ color: '#C8FF00' }} />
              <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>Notificação no app</span>
            </div>

            <div className="mb-3">
              <label className="text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#555555' }}>Título</label>
              <input
                value={pushTitle}
                onChange={e => setPushTitle(e.target.value)}
                placeholder="Ex: Nova aula disponível! 🎥"
                className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none focus:ring-1 focus:ring-[#C8FF00]"
                style={{ background: '#111111', color: '#FFFFFF', borderColor: '#2A2A2A', fontFamily: 'Poppins, sans-serif' }}
              />
            </div>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#555555' }}>Descrição</label>
              <textarea
                value={pushBody}
                onChange={e => setPushBody(e.target.value)}
                placeholder="Ex: Acesse o app e confira o conteúdo novo do seu plano."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none focus:ring-1 focus:ring-[#C8FF00] leading-relaxed"
                style={{ background: '#111111', color: '#FFFFFF', borderColor: '#2A2A2A' }}
              />
            </div>

            {(pushTitle || pushBody) && (
              <div className="mb-4 p-3 rounded-xl border" style={{ background: '#111111', borderColor: '#2A2A2A' }}>
                <p className="text-xs mb-2" style={{ color: '#555555' }}>Prévia no celular</p>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#C8FF00' }}>
                    <Bell size={14} style={{ color: '#111111' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-tight" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                      {pushTitle || 'Título da notificação'}
                    </p>
                    {pushBody && (
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: '#888888' }}>{pushBody}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={sendNotification}
              variant="outline"
              className="w-full font-semibold"
              disabled={!pushTitle.trim()}
              style={{
                borderColor: 'rgba(200,255,0,0.3)',
                color: '#C8FF00',
                background: 'rgba(200,255,0,0.05)',
                borderRadius: '12px',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <Bell size={14} className="mr-2" />
              Enviar notificação no app
            </Button>
            {!pushTitle.trim() && (
              <p className="text-xs mt-1.5 text-center" style={{ color: '#555555' }}>Preencha o título para enviar</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: '#2A2A2A' }}>
            {context === 'dieta' && (
              <Link href={`/alunos/${student.id}?tab=prescricao`} onClick={onClose}>
                <Button className="w-full font-semibold"
                  style={{ background: '#C8FF00', color: '#111111', borderRadius: '12px', fontFamily: 'Poppins, sans-serif' }}>
                  <ClipboardCheck size={14} className="mr-2" />
                  Ir para prescrição
                </Button>
              </Link>
            )}
            <Link href={`/alunos/${student.id}`} onClick={onClose}>
              <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
                style={{ color: '#888888' }}>
                <ExternalLink size={14} />
                Ver ficha completa
              </button>
            </Link>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent = false, warning = false }: {
  label: string; value: number; icon: React.ElementType; accent?: boolean; warning?: boolean
}) {
  return (
    <div className="rounded-2xl p-6 border flex items-center gap-4" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? 'rgba(200,255,0,0.12)' : warning ? 'rgba(245,158,11,0.12)' : '#222222' }}>
        <Icon size={22} style={{ color: accent ? '#C8FF00' : warning ? '#F59E0B' : '#888888' }} />
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: accent ? '#C8FF00' : '#FFFFFF' }}>{value}</p>
        <p className="text-sm mt-0.5" style={{ color: '#888888' }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [selected, setSelected] = useState<{ student: Student; context: 'vencimento' | 'dieta' } | null>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', NUTRI_ID],
    queryFn: () => dashboardService.getStats(NUTRI_ID),
  })

  const { data: students } = useQuery({
    queryKey: ['students', NUTRI_ID],
    queryFn: () => studentService.list(NUTRI_ID),
  })

  const { data: needsDietReview = [] } = useQuery({
    queryKey: ['needs-diet-review', NUTRI_ID],
    queryFn: () => dietReviewService.getNeedingReview(NUTRI_ID),
  })

  const expiring = students?.filter(
    s => s.subscription?.status === 'vencendo' || s.subscription?.status === 'vencido'
  ) ?? []

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral dos seus alunos" />

      {/* Contact Sheet */}
      <ContactSheet
        student={selected?.student ?? null}
        context={selected?.context ?? null}
        onClose={() => setSelected(null)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" style={{ background: '#1A1A1A' }} />
          ))
        ) : (
          <>
            <StatCard label="Alunos ativos" value={stats?.active_students ?? 0} icon={Users} accent />
            <StatCard label="Vencendo em 7d" value={stats?.expiring_7d ?? 0} icon={Clock} warning />
            <StatCard label="Vencendo em 15d" value={stats?.expiring_15d ?? 0} icon={Clock} />
            <StatCard label="Verificar dieta" value={needsDietReview.length} icon={ClipboardCheck} warning={needsDietReview.length > 0} />
          </>
        )}
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Planos vencendo */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <h2 className="font-semibold text-base mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
            Planos vencendo
          </h2>
          {expiring.length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Nenhum plano vencendo em breve.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expiring.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected({ student: s, context: 'vencimento' })}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all w-full text-left"
                  style={{ background: '#222222' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: '#C8FF00', color: '#111111' }}>
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                        Expira em: {s.subscription?.expires_at
                          ? new Date(s.subscription.expires_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge style={{
                      background: s.subscription?.status === 'vencido' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: s.subscription?.status === 'vencido' ? '#EF4444' : '#F59E0B',
                      border: 'none', borderRadius: '9999px', fontSize: '11px'
                    }}>
                      {s.subscription?.status === 'vencido' ? 'Vencido' : 'Vencendo'}
                    </Badge>
                    <MessageCircle size={14} style={{ color: '#25D366' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alunos que faltam analisar a dieta */}
        <div className="rounded-2xl border p-6" style={{ background: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
              Alunos que faltam analisar a dieta
            </h2>
            {needsDietReview.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                {needsDietReview.length} pendente{needsDietReview.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs mb-4" style={{ color: '#555555' }}>
            Preencheram a anamnese no app e aguardam revisão da dieta gerada pela IA.
          </p>
          {needsDietReview.length === 0 ? (
            <p className="text-sm" style={{ color: '#555555' }}>Tudo em dia! Nenhuma dieta pendente.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {needsDietReview.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected({ student: s, context: 'dieta' })}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all w-full text-left"
                  style={{ background: '#222222' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{s.goal_label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#F59E0B' }}>Verificar</span>
                    <ChevronRight size={14} style={{ color: '#555555' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
