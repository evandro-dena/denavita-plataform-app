'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignService } from '@/lib/api/communications'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Plus, Send, Pencil, Trash2, X, Save, MessageCircle, Bell,
  Users, Trophy, Clock, Calendar, RefreshCw, Megaphone, Gift,
  Lightbulb, Video, Weight, ChevronRight, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Campaign, CampaignType, CampaignChannel, CampaignAudience } from '@/types'

// ─── Config maps ─────────────────────────────────────────────────

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: React.ElementType; emoji: string; color: string }> = {
  peso_feedback:  { label: 'Registro de peso',     icon: Weight,    emoji: '⚖️', color: '#C8FF00' },
  vencimento:     { label: 'Plano vencendo',        icon: Clock,     emoji: '⏰', color: '#F59E0B' },
  promocao:       { label: 'Promoção de plano',     icon: Megaphone, emoji: '🎉', color: '#A78BFA' },
  cupom:          { label: 'Cupom exclusivo',       icon: Gift,      emoji: '🏷️', color: '#F472B6' },
  dica:           { label: 'Dica de nutrição',      icon: Lightbulb, emoji: '💡', color: '#34D399' },
  video_aula:     { label: 'Video aula',            icon: Video,     emoji: '🎥', color: '#60A5FA' },
  personalizada:  { label: 'Personalizada',         icon: Pencil,    emoji: '✉️', color: '#888888' },
}

const AUDIENCE_CONFIG: Record<CampaignAudience, { label: string; description: string; icon: React.ElementType }> = {
  todos:              { label: 'Todos os alunos',      description: 'Envia para todos os alunos ativos',            icon: Users },
  melhores_resultados:{ label: 'Melhores resultados',  description: 'Alunos com maior evolução no peso',            icon: Trophy },
  mais_tempo:         { label: 'Mais tempo',           description: 'Alunos há mais de 3 meses na plataforma',      icon: Clock },
  vencendo_7d:        { label: 'Vencendo em 7 dias',   description: 'Assinaturas que vencem nos próximos 7 dias',   icon: Calendar },
  vencendo_15d:       { label: 'Vencendo em 15 dias',  description: 'Assinaturas que vencem nos próximos 15 dias',  icon: Calendar },
  vencendo_30d:       { label: 'Vencendo em 30 dias',  description: 'Assinaturas que vencem nos próximos 30 dias',  icon: Calendar },
  personalizado:      { label: 'Personalizado',        description: 'Escolha manualmente os destinatários',         icon: Users },
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ─── Helpers ─────────────────────────────────────────────────────

function statusBadge(status: Campaign['status']) {
  if (status === 'enviado')  return { bg: 'rgba(200,255,0,0.12)',  color: '#C8FF00',  label: 'Enviado' }
  if (status === 'agendado') return { bg: 'rgba(96,165,250,0.15)', color: '#60A5FA',  label: 'Agendado' }
  return                            { bg: 'rgba(136,136,136,0.12)', color: '#888888', label: 'Rascunho' }
}

function scheduleLabel(c: Campaign) {
  if (c.schedule_type === 'imediato') return 'Envio imediato'
  if (c.schedule_type === 'agendado' && c.scheduled_at)
    return `Agendado: ${new Date(c.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  if (c.schedule_type === 'recorrente')
    return `Recorrente · ${c.recurrence === 'semanal' ? `toda ${WEEKDAYS[c.recurrence_weekday ?? 0]}` : c.recurrence} · ${c.recurrence_time}`
  return '—'
}

// ─── Template messages ────────────────────────────────────────────

function getTemplateMessages(type: CampaignType): { whatsapp: string; pushTitle: string; pushBody: string } {
  const t = {
    peso_feedback:  { whatsapp: 'Bom dia! 👋\n\nHora do check-in semanal! ⚖️\n\nEnvie seu peso em jejum e um breve feedback:\n- Como foi a semana?\n- Seguiu o plano alimentar?\n- Alguma dificuldade?\n\nSeu progresso é nossa prioridade! 💪', pushTitle: 'Check-in semanal ⚖️', pushBody: 'Registre seu peso e compartilhe seu feedback da semana!' },
    vencimento:     { whatsapp: 'Olá! 👋\n\nSeu plano DenaVita está próximo do vencimento.\n\nRenove agora e continue com seu plano personalizado sem interrupção! 💚\n\nAcesse o app para renovar.', pushTitle: 'Seu plano está vencendo ⏰', pushBody: 'Renove agora e mantenha seu progresso sem interrupção.' },
    promocao:       { whatsapp: '🎉 Promoção especial!\n\nAtualize seu plano agora e aproveite condições exclusivas.\n\nPromoção por tempo limitado!', pushTitle: 'Promoção especial! 🎉', pushBody: 'Aproveite condições exclusivas por tempo limitado.' },
    cupom:          { whatsapp: '🏷️ Cupom exclusivo para você!\n\nCódigo: [CÓDIGO]\n\nVálido na loja DenaVita Suplementos.', pushTitle: 'Cupom exclusivo 🎁', pushBody: 'Seu cupom exclusivo na loja DenaVita Suplementos chegou!' },
    dica:           { whatsapp: '💡 Dica da semana!\n\n[Escreva sua dica aqui]\n\nAcesse o app para mais conteúdo!', pushTitle: 'Dica da semana 💡', pushBody: 'Nova dica disponível no app. Confira!' },
    video_aula:     { whatsapp: '🎥 Nova aula disponível!\n\n[Descreva a aula aqui]\n\nAssista agora no app DenaVita!', pushTitle: 'Nova video aula! 🎥', pushBody: 'Conteúdo novo esperando por você no app.' },
    personalizada:  { whatsapp: '', pushTitle: '', pushBody: '' },
  }
  return { whatsapp: t[type].whatsapp, pushTitle: t[type].pushTitle, pushBody: t[type].pushBody }
}

// ─── Campaign Editor ─────────────────────────────────────────────

function CampaignEditor({ campaign, onClose, onSaved }: {
  campaign: Campaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const isNew = !campaign?.id || campaign.id === '__new__'

  const [form, setForm] = useState<Partial<Campaign>>(campaign ?? {
    name: '',
    type: 'personalizada',
    channels: ['whatsapp', 'app'],
    audience: 'todos',
    audience_count: 3,
    status: 'rascunho',
    schedule_type: 'imediato',
    recurrence: 'semanal',
    recurrence_weekday: 5,
    recurrence_time: '08:00',
    whatsapp_message: '',
    push_title: '',
    push_body: '',
  })

  const save = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (isNew) await campaignService.create(form)
      else await campaignService.update(campaign!.id, form)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success(isNew ? 'Campanha criada!' : 'Campanha salva!'); onSaved() },
  })

  const sendNow = useMutation<void, Error, void>({
    mutationFn: async () => {
      let id: string
      if (isNew) {
        const saved = await campaignService.create(form)
        id = saved.id
      } else {
        await campaignService.update(campaign!.id, form)
        id = campaign!.id
      }
      await campaignService.send(id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha enviada!'); onSaved() },
  })

  const set = (k: keyof Campaign) => (v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const selectType = (type: CampaignType) => {
    const tpl = getTemplateMessages(type)
    setForm(p => ({ ...p, type, whatsapp_message: tpl.whatsapp, push_title: tpl.pushTitle, push_body: tpl.pushBody }))
  }

  const toggleChannel = (ch: CampaignChannel) =>
    setForm(p => {
      const chs = (p.channels ?? []) as CampaignChannel[]
      return { ...p, channels: chs.includes(ch) ? chs.filter(c => c !== ch) : [...chs, ch] }
    })

  const iStyle = { background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }
  const iCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-[#C8FF00] transition-all'

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#262626' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#3D3D3D' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'Poppins, sans-serif', color: '#FFFFFF' }}>
            {isNew ? 'Nova campanha' : 'Editar campanha'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#888888' }}>Preencha e envie ou agende</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}
            style={{ borderColor: '#3D3D3D', color: '#888888', borderRadius: '10px' }}>
            <Save size={13} className="mr-1.5" /> Salvar rascunho
          </Button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
            <X size={16} style={{ color: '#555555' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

        {/* Nome */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-1.5 block" style={{ color: '#555555' }}>Nome da campanha</label>
          <input value={form.name ?? ''} onChange={e => set('name')(e.target.value)}
            placeholder="ex: Registro de Peso — Toda Sexta" className={iCls} style={iStyle} />
        </div>

        {/* Tipo */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: '#555555' }}>Tipo de campanha</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TYPE_CONFIG) as [CampaignType, typeof TYPE_CONFIG[CampaignType]][]).map(([key, cfg]) => {
              const active = form.type === key
              return (
                <button key={key} onClick={() => selectType(key)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all"
                  style={{ background: active ? `rgba(${hexToRgb(cfg.color)},0.08)` : '#1C1C1C', borderColor: active ? cfg.color : '#3D3D3D' }}>
                  <span className="text-lg">{cfg.emoji}</span>
                  <span className="text-xs font-medium" style={{ color: active ? cfg.color : '#888888' }}>{cfg.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: '#555555' }}>Público-alvo</label>
          <div className="flex flex-col gap-1.5">
            {(Object.entries(AUDIENCE_CONFIG) as [CampaignAudience, typeof AUDIENCE_CONFIG[CampaignAudience]][]).map(([key, cfg]) => {
              const active = form.audience === key
              const Icon = cfg.icon
              return (
                <button key={key} onClick={() => set('audience')(key)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                  style={{ background: active ? 'rgba(200,255,0,0.06)' : '#1C1C1C', borderColor: active ? '#C8FF00' : '#3D3D3D' }}>
                  <Icon size={14} style={{ color: active ? '#C8FF00' : '#555555' }} />
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: active ? '#C8FF00' : '#FFFFFF' }}>{cfg.label}</p>
                    <p className="text-xs" style={{ color: '#555555' }}>{cfg.description}</p>
                  </div>
                  {active && <CheckCircle size={13} style={{ color: '#C8FF00' }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: '#555555' }}>Canais de envio</label>
          <div className="flex gap-3">
            {([
              { key: 'whatsapp' as CampaignChannel, label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
              { key: 'app'      as CampaignChannel, label: 'App (Push)',icon: Bell,          color: '#C8FF00' },
            ]).map(ch => {
              const active = (form.channels ?? []).includes(ch.key)
              return (
                <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                  className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all"
                  style={{ background: active ? `${ch.color}15` : '#1C1C1C', borderColor: active ? ch.color : '#3D3D3D' }}>
                  <ch.icon size={16} style={{ color: active ? ch.color : '#555555' }} />
                  <span className="text-sm font-medium" style={{ color: active ? ch.color : '#888888' }}>{ch.label}</span>
                  {active && <CheckCircle size={12} className="ml-auto" style={{ color: ch.color }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: '#555555' }}>Agendamento</label>
          <div className="flex gap-2 mb-3">
            {([
              { key: 'imediato',   label: 'Enviar agora', icon: Send },
              { key: 'agendado',   label: 'Agendar',      icon: Calendar },
              { key: 'recorrente', label: 'Recorrente',   icon: RefreshCw },
            ] as { key: Campaign['schedule_type']; label: string; icon: React.ElementType }[]).map(s => {
              const active = form.schedule_type === s.key
              return (
                <button key={s.key} onClick={() => set('schedule_type')(s.key)}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all"
                  style={{ background: active ? 'rgba(200,255,0,0.06)' : '#1C1C1C', borderColor: active ? '#C8FF00' : '#3D3D3D', color: active ? '#C8FF00' : '#888888' }}>
                  <s.icon size={14} />
                  {s.label}
                </button>
              )
            })}
          </div>

          {form.schedule_type === 'agendado' && (
            <input type="datetime-local" value={form.scheduled_at?.slice(0, 16) ?? ''}
              onChange={e => set('scheduled_at')(e.target.value + ':00Z')}
              className={iCls} style={{ ...iStyle, colorScheme: 'dark' }} />
          )}

          {form.schedule_type === 'recorrente' && (
            <div className="flex flex-col gap-2">
              <select value={form.recurrence ?? 'semanal'} onChange={e => set('recurrence')(e.target.value)}
                className={iCls} style={iStyle}>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
              {form.recurrence === 'semanal' && (
                <div className="flex gap-1">
                  {WEEKDAYS.map((day, i) => (
                    <button key={i} onClick={() => set('recurrence_weekday')(i)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: form.recurrence_weekday === i ? '#C8FF00' : '#1C1C1C', color: form.recurrence_weekday === i ? '#1C1C1C' : '#888888' }}>
                      {day}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: '#555555' }}>Hora:</label>
                <input type="text" value={form.recurrence_time ?? '08:00'}
                  onChange={e => set('recurrence_time')(e.target.value)}
                  placeholder="08:00" className="px-3 py-2 rounded-xl border text-sm outline-none w-24"
                  style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }} />
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp message */}
        {(form.channels ?? []).includes('whatsapp') && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={14} style={{ color: '#25D366' }} />
              <label className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>Mensagem WhatsApp</label>
            </div>
            <textarea value={form.whatsapp_message ?? ''} onChange={e => set('whatsapp_message')(e.target.value)}
              rows={5} placeholder="Escreva sua mensagem..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none focus:ring-1 focus:ring-[#25D366] leading-relaxed"
              style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }} />
          </div>
        )}

        {/* Push notification */}
        {(form.channels ?? []).includes('app') && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={14} style={{ color: '#C8FF00' }} />
              <label className="text-xs uppercase tracking-wide" style={{ color: '#555555' }}>Notificação no app</label>
            </div>
            <div className="flex flex-col gap-2">
              <input value={form.push_title ?? ''} onChange={e => set('push_title')(e.target.value)}
                placeholder="Título (sempre em destaque)" className={iCls}
                style={{ ...iStyle, fontWeight: 700, fontFamily: 'Poppins, sans-serif' }} />
              <textarea value={form.push_body ?? ''} onChange={e => set('push_body')(e.target.value)}
                rows={2} placeholder="Descrição da notificação..."
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none outline-none focus:ring-1 focus:ring-[#C8FF00]"
                style={{ background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }} />
              {/* Preview */}
              {(form.push_title || form.push_body) && (
                <div className="p-3 rounded-xl border" style={{ background: '#1C1C1C', borderColor: '#3D3D3D' }}>
                  <p className="text-xs mb-1.5" style={{ color: '#555555' }}>Prévia</p>
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#C8FF00' }}>
                      <Bell size={12} style={{ color: '#1C1C1C' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{form.push_title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{form.push_body}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t flex gap-3 flex-shrink-0" style={{ borderColor: '#3D3D3D' }}>
        <Button className="flex-1 font-semibold" onClick={() => sendNow.mutate()} disabled={sendNow.isPending || !form.name?.trim()}
          style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
          <Send size={14} className="mr-2" />
          {sendNow.isPending ? 'Enviando...' : form.schedule_type === 'imediato' ? 'Enviar agora' : 'Confirmar agendamento'}
        </Button>
      </div>
    </div>
  )
}

// ─── hex helper ──────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ─── Campaign Card ────────────────────────────────────────────────

function CampaignCard({ campaign, onEdit, onDelete, onSend }: {
  campaign: Campaign
  onEdit: () => void
  onDelete: () => void
  onSend: () => void
}) {
  const sb = statusBadge(campaign.status)
  const typeCfg = TYPE_CONFIG[campaign.type]

  return (
    <div className="rounded-2xl border p-5 transition-all hover:border-[#3D3D3D]" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#2F2F2F' }}>
            {typeCfg.emoji}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{campaign.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{typeCfg.label}</p>
          </div>
        </div>
        <Badge style={{ background: sb.bg, color: sb.color, border: 'none', borderRadius: '9999px', fontSize: '11px', flexShrink: 0 }}>
          {campaign.status === 'enviado' && <CheckCircle size={10} className="inline mr-1" />}
          {sb.label}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: '#555555' }}>
        <span className="flex items-center gap-1">
          <Users size={11} /> {campaign.audience_count} {campaign.audience_count === 1 ? 'aluno' : 'alunos'}
        </span>
        <span className="flex items-center gap-1">
          {campaign.channels.includes('whatsapp') && <MessageCircle size={11} style={{ color: '#25D366' }} />}
          {campaign.channels.includes('app') && <Bell size={11} style={{ color: '#C8FF00' }} />}
          {campaign.channels.map(c => c === 'whatsapp' ? 'WhatsApp' : 'App').join(' + ')}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} /> {scheduleLabel(campaign)}
        </span>
      </div>

      {/* Stats for sent */}
      {campaign.status === 'enviado' && campaign.sent_count && (
        <div className="flex items-center gap-4 mb-4 p-3 rounded-xl" style={{ background: '#2F2F2F' }}>
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>{campaign.sent_count}</p>
            <p className="text-xs" style={{ color: '#555555' }}>Enviados</p>
          </div>
          {campaign.open_rate && (
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: '#60A5FA', fontFamily: 'Poppins, sans-serif' }}>{campaign.open_rate}%</p>
              <p className="text-xs" style={{ color: '#555555' }}>Abertos</p>
            </div>
          )}
          {campaign.sent_at && (
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: '#888888', fontFamily: 'Poppins, sans-serif' }}>
                {new Date(campaign.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-xs" style={{ color: '#555555' }}>Enviado em</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {campaign.status !== 'enviado' && (
          <Button size="sm" onClick={onSend}
            style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '12px' }}>
            <Send size={12} className="mr-1.5" />
            {campaign.schedule_type === 'imediato' ? 'Enviar' : 'Confirmar'}
          </Button>
        )}
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all hover:bg-white/10"
          style={{ borderColor: '#3D3D3D', color: '#888888' }}>
          <Pencil size={11} /> Editar
        </button>
        <button onClick={onDelete} className="ml-auto p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
          <Trash2 size={13} style={{ color: '#EF4444' }} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ComunicacaoPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'todos' | Campaign['status']>('todos')
  const [editing, setEditing] = useState<Campaign | null | '__new__'>('__new__' as never)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
  })

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha excluída.') },
  })

  const sendCampaign = useMutation({
    mutationFn: (id: string) => campaignService.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha enviada!') },
  })

  const filtered = campaigns.filter(c => filter === 'todos' || c.status === filter)

  const panelOpen = editing !== null

  const stats = {
    total: campaigns.length,
    agendado: campaigns.filter(c => c.status === 'agendado').length,
    enviado: campaigns.filter(c => c.status === 'enviado').length,
    rascunho: campaigns.filter(c => c.status === 'rascunho').length,
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Comunicação"
        subtitle="Gerencie campanhas e mensagens para seus alunos"
        action={
          <Button onClick={() => setEditing({ id: '__new__' } as Campaign)}
            style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
            <Plus size={16} className="mr-2" /> Nova campanha
          </Button>
        }
      />

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── List ── */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${panelOpen ? 'flex-1 min-w-0' : 'w-full'}`}>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.total, color: '#888888' },
              { label: 'Agendadas', value: stats.agendado, color: '#60A5FA' },
              { label: 'Enviadas', value: stats.enviado, color: '#C8FF00' },
              { label: 'Rascunhos', value: stats.rascunho, color: '#555555' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border p-4" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Poppins, sans-serif', color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {([
              { key: 'todos',    label: 'Todos' },
              { key: 'agendado', label: 'Agendados' },
              { key: 'enviado',  label: 'Enviados' },
              { key: 'rascunho', label: 'Rascunhos' },
            ] as { key: typeof filter; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={filter === t.key
                  ? { background: '#C8FF00', color: '#1C1C1C', fontFamily: 'Poppins, sans-serif' }
                  : { background: '#262626', color: '#888888' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Campaign grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" style={{ background: '#262626' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16" style={{ color: '#555555' }}>
              <Megaphone size={40} className="mb-3 opacity-20" />
              <p className="text-sm">Nenhuma campanha encontrada.</p>
              <button onClick={() => setEditing({ id: '__new__' } as Campaign)}
                className="mt-3 text-xs px-4 py-2 rounded-xl transition-all hover:bg-white/10" style={{ color: '#C8FF00' }}>
                + Criar primeira campanha
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 ${panelOpen ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {filtered.map(c => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onEdit={() => setEditing(c)}
                  onDelete={() => { if (confirm(`Excluir "${c.name}"?`)) deleteCampaign.mutate(c.id) }}
                  onSend={() => sendCampaign.mutate(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Editor Panel ── */}
        {panelOpen && (
          <div className="w-[420px] flex-shrink-0 sticky top-0 rounded-2xl border overflow-hidden" style={{ height: 'calc(100vh - 120px)', borderColor: '#3D3D3D' }}>
            <CampaignEditor
              campaign={editing && (editing as Campaign).id !== '__new__' ? editing as Campaign : null}
              onClose={() => setEditing(null as never)}
              onSaved={() => setEditing(null as never)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
