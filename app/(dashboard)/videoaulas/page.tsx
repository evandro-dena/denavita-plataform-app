'use client'
import { useNutriId } from '@/lib/hooks/useNutriId'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoLessonService } from '@/lib/api/videoLessons'
import { specialtyService } from '@/lib/api/specialties'
import { getYoutubeId, isValidYoutubeUrl, youtubeThumb } from '@/lib/youtube'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Video, X, ExternalLink,
  Layers, Settings2, UtensilsCrossed, Brain, Dumbbell, Heart, BookOpen, Activity, Salad, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { VideoLesson, Specialty } from '@/types'

// ─── Estilos compartilhados (padrão da plataforma) ───────────────────
const iCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-[#C8FF00] transition-all'
const iStyle = { background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }
const lblCls = 'text-xs uppercase tracking-wide mb-1 block'

// Ícones selecionáveis p/ as especialidades (chave = valor gravado em specialties.icon).
const ICON_OPTIONS: { key: string; Icon: React.ElementType }[] = [
  { key: 'nutricao', Icon: UtensilsCrossed },
  { key: 'psicologia', Icon: Brain },
  { key: 'treino', Icon: Dumbbell },
  { key: 'saude', Icon: Heart },
  { key: 'educacao', Icon: BookOpen },
  { key: 'atividade', Icon: Activity },
  { key: 'alimentacao', Icon: Salad },
  { key: 'geral', Icon: Sparkles },
]
const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(ICON_OPTIONS.map(o => [o.key, o.Icon]))

const COLOR_OPTIONS = ['#C8FF00', '#F59E0B', '#3B82F6', '#EC4899', '#10B981', '#A78BFA', '#EF4444']
const DEFAULT_COLOR = '#C8FF00'

function SpecialtyIcon({ name, size = 16, color }: { name?: string | null; size?: number; color?: string }) {
  const Ic = (name && ICON_MAP[name]) || Layers
  return <Ic size={size} style={{ color }} />
}

export default function VideoaulasPage() {
  const NUTRI_ID = useNutriId()
  const qc = useQueryClient()

  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ['video-lessons'],
    queryFn: () => videoLessonService.list(),
  })
  const { data: specialties = [], isLoading: loadingSpecs } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => specialtyService.list(),
  })
  const isLoading = loadingLessons || loadingSpecs

  // ═══ Modal de VÍDEO (novo / editar) ═══════════════════════════════
  const [lessonModal, setLessonModal] = useState(false)
  const [lessonEditId, setLessonEditId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', youtube_url: '', specialty_id: '' })

  const openNewLesson = (specialtyId = '') => {
    setLessonEditId(null)
    setLessonForm({ title: '', description: '', youtube_url: '', specialty_id: specialtyId })
    setLessonModal(true)
  }
  const openEditLesson = (v: VideoLesson) => {
    setLessonEditId(v.id)
    setLessonForm({ title: v.title, description: v.description ?? '', youtube_url: v.youtube_url ?? '', specialty_id: v.specialty_id ?? '' })
    setLessonModal(true)
  }

  const saveLesson = useMutation({
    mutationFn: async () => {
      const title = lessonForm.title.trim()
      const youtube_url = lessonForm.youtube_url.trim()
      const description = lessonForm.description.trim()
      const specialty_id = lessonForm.specialty_id || null
      if (!title) throw new Error('Informe o título da aula')
      if (!isValidYoutubeUrl(youtube_url)) throw new Error('Link do YouTube inválido')

      if (lessonEditId) {
        await videoLessonService.update(lessonEditId, { title, description, youtube_url, specialty_id })
      } else {
        if (!NUTRI_ID) throw new Error('Sessão ainda carregando, tente de novo')
        const nextOrder = lessons.reduce((m, l) => Math.max(m, l.sort_order), -1) + 1
        await videoLessonService.create({ title, description, youtube_url, specialty_id }, NUTRI_ID, nextOrder)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-lessons'] })
      toast.success(lessonEditId ? 'Aula atualizada!' : 'Aula adicionada!')
      setLessonModal(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeLesson = useMutation({
    mutationFn: (id: string) => videoLessonService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['video-lessons'] }); toast.success('Aula removida.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const togglePublishLesson = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => videoLessonService.setPublished(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['video-lessons'] }),
    onError: (e: Error) => toast.error(e.message),
  })
  const moveLesson = useMutation({
    mutationFn: ({ list, index, dir }: { list: VideoLesson[]; index: number; dir: -1 | 1 }) => {
      const a = list[index]
      const b = list[index + dir]
      if (!a || !b) return Promise.resolve()
      return videoLessonService.swapOrder({ id: a.id, sort_order: a.sort_order }, { id: b.id, sort_order: b.sort_order })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['video-lessons'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  // ═══ Modal de ESPECIALIDADES (gestão) ═════════════════════════════
  const [specModal, setSpecModal] = useState(false)
  const [specEditId, setSpecEditId] = useState<string | null>(null)
  const [specForm, setSpecForm] = useState<{ name: string; icon: string; color: string }>({ name: '', icon: '', color: '' })

  const resetSpecForm = () => { setSpecEditId(null); setSpecForm({ name: '', icon: '', color: '' }) }
  const editSpec = (s: Specialty) => { setSpecEditId(s.id); setSpecForm({ name: s.name, icon: s.icon ?? '', color: s.color ?? '' }) }

  const saveSpec = useMutation({
    mutationFn: async () => {
      const name = specForm.name.trim()
      if (!name) throw new Error('Informe o nome da especialidade')
      const patch = { name, icon: specForm.icon || null, color: specForm.color || null }
      if (specEditId) {
        await specialtyService.update(specEditId, patch)
      } else {
        if (!NUTRI_ID) throw new Error('Sessão ainda carregando, tente de novo')
        const nextOrder = specialties.reduce((m, s) => Math.max(m, s.sort_order), -1) + 1
        await specialtyService.create(patch, NUTRI_ID, nextOrder)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specialties'] })
      toast.success(specEditId ? 'Especialidade atualizada!' : 'Especialidade criada!')
      resetSpecForm()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeSpec = useMutation({
    mutationFn: (id: string) => specialtyService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['specialties'] })
      qc.invalidateQueries({ queryKey: ['video-lessons'] }) // vídeos ficam sem categoria (FK ON DELETE SET NULL)
      toast.success('Especialidade removida.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const togglePublishSpec = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => specialtyService.setPublished(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties'] }),
    onError: (e: Error) => toast.error(e.message),
  })
  const moveSpec = useMutation({
    mutationFn: ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const a = specialties[index]
      const b = specialties[index + dir]
      if (!a || !b) return Promise.resolve()
      return specialtyService.swapOrder({ id: a.id, sort_order: a.sort_order }, { id: b.id, sort_order: b.sort_order })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  // ─── Agrupamento por especialidade ──────────────────────────────────
  const known = new Set(specialties.map(s => s.id))
  const groups = specialties.map(s => ({ specialty: s, videos: lessons.filter(l => l.specialty_id === s.id) }))
  const uncategorized = lessons.filter(l => !l.specialty_id || !known.has(l.specialty_id))

  const previewId = getYoutubeId(lessonForm.youtube_url)

  // Render de um vídeo (reutilizado em cada grupo). `list` = vídeos do grupo (p/ reordenar).
  const renderVideo = (v: VideoLesson, i: number, list: VideoLesson[]) => {
    const vid = getYoutubeId(v.youtube_url)
    return (
      <div key={v.id} className="rounded-xl border p-3 flex items-center gap-3"
        style={{ background: '#1F1F1F', borderColor: '#2A2A2A', opacity: v.is_published ? 1 : 0.6 }}>
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button disabled={i === 0 || moveLesson.isPending} onClick={() => moveLesson.mutate({ list, index: i, dir: -1 })}
            className="p-0.5 rounded transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Subir">
            <ChevronUp size={14} style={{ color: '#888888' }} />
          </button>
          <button disabled={i === list.length - 1 || moveLesson.isPending} onClick={() => moveLesson.mutate({ list, index: i, dir: 1 })}
            className="p-0.5 rounded transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Descer">
            <ChevronDown size={14} style={{ color: '#888888' }} />
          </button>
        </div>
        <div className="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#1C1C1C' }}>
          {vid ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={youtubeThumb(vid)} alt={v.title} className="w-full h-full object-cover" />
          ) : <Video size={20} style={{ color: '#555555' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{v.title}</p>
            {!v.is_published && <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(136,136,136,0.15)', color: '#888888' }}>Rascunho</span>}
          </div>
          {v.description && <p className="text-xs mt-0.5 truncate" style={{ color: '#888888' }}>{v.description}</p>}
          {v.youtube_url && (
            <a href={v.youtube_url} target="_blank" rel="noopener noreferrer"
              className="text-xs mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: '#C8FF00' }}>
              Abrir no YouTube <ExternalLink size={10} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch checked={v.is_published} disabled={togglePublishLesson.isPending}
            onCheckedChange={val => togglePublishLesson.mutate({ id: v.id, val })} />
          <button onClick={() => openEditLesson(v)} className="p-2 rounded-lg transition-all hover:bg-white/10" title="Editar">
            <Pencil size={14} style={{ color: '#888888' }} />
          </button>
          <button onClick={() => { if (confirm(`Remover "${v.title}"?`)) removeLesson.mutate(v.id) }}
            className="p-2 rounded-lg transition-all hover:bg-white/10" title="Remover">
            <Trash2 size={14} style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar
        title="Videoaulas"
        subtitle={`${specialties.length} especialidade${specialties.length !== 1 ? 's' : ''} · ${lessons.length} aula${lessons.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { resetSpecForm(); setSpecModal(true) }}
              style={{ borderColor: '#3D3D3D', color: '#FFFFFF', background: '#262626', borderRadius: '12px', fontWeight: 600 }}>
              <Settings2 size={16} className="mr-2" /> Especialidades
            </Button>
            <Button onClick={() => openNewLesson()}
              style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              <Plus size={16} className="mr-2" /> Nova aula
            </Button>
          </div>
        }
      />

      {/* Listagem agrupada */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" style={{ background: '#262626' }} />)
        ) : specialties.length === 0 && lessons.length === 0 ? (
          <div className="rounded-2xl border p-16 text-center flex flex-col items-center gap-3"
            style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
            <Layers size={36} className="opacity-30" />
            <p className="text-sm">Nenhuma especialidade ou aula ainda.</p>
            <Button size="sm" onClick={() => { resetSpecForm(); setSpecModal(true) }}
              style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif' }}>
              <Plus size={14} className="mr-1.5" /> Criar primeira especialidade
            </Button>
          </div>
        ) : (
          <>
            {groups.map(({ specialty, videos }) => {
              const color = specialty.color || DEFAULT_COLOR
              return (
                <div key={specialty.id} className="rounded-2xl border overflow-hidden"
                  style={{ background: '#262626', borderColor: '#3D3D3D', opacity: specialty.is_published ? 1 : 0.6 }}>
                  {/* Header do card */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#3D3D3D', borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1f` }}>
                        <SpecialtyIcon name={specialty.icon} size={18} color={color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{specialty.name}</p>
                          {!specialty.is_published && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(136,136,136,0.15)', color: '#888888' }}>Oculta</span>}
                        </div>
                        <p className="text-xs" style={{ color: '#888888' }}>{videos.length} aula{videos.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => openNewLesson(specialty.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/10"
                      style={{ color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)' }}>
                      <Plus size={12} /> Vídeo
                    </button>
                  </div>
                  {/* Vídeos */}
                  <div className="p-3 flex flex-col gap-2">
                    {videos.length === 0
                      ? <p className="text-xs text-center py-4" style={{ color: '#555555' }}>Nenhum vídeo nesta especialidade ainda.</p>
                      : videos.map((v, i) => renderVideo(v, i, videos))}
                  </div>
                </div>
              )
            })}

            {/* Sem categoria */}
            {uncategorized.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: '#262626', borderColor: '#3D3D3D' }}>
                <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#3D3D3D', borderLeft: '3px solid #555555' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(136,136,136,0.15)' }}>
                    <Layers size={18} style={{ color: '#888888' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Sem categoria</p>
                    <p className="text-xs" style={{ color: '#888888' }}>{uncategorized.length} aula{uncategorized.length !== 1 ? 's' : ''} sem especialidade</p>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {uncategorized.map((v, i) => renderVideo(v, i, uncategorized))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Modal VÍDEO ═══ */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setLessonModal(false)}>
          <div className="w-full max-w-md rounded-2xl border p-5 flex flex-col gap-4" style={{ background: '#262626', borderColor: '#3D3D3D' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{lessonEditId ? 'Editar aula' : 'Nova aula'}</p>
              <button onClick={() => setLessonModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all"><X size={16} style={{ color: '#555555' }} /></button>
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Título *</label>
              <input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} className={iCls} style={iStyle} placeholder="ex: Como montar seu prato" />
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Especialidade</label>
              <select value={lessonForm.specialty_id} onChange={e => setLessonForm(p => ({ ...p, specialty_id: e.target.value }))} className={iCls} style={iStyle}>
                <option value="">— Sem categoria —</option>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Descrição</label>
              <textarea value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} rows={2} className={iCls + ' resize-none'} style={iStyle} placeholder="opcional" />
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Link do YouTube *</label>
              <input value={lessonForm.youtube_url} onChange={e => setLessonForm(p => ({ ...p, youtube_url: e.target.value }))} className={iCls} style={iStyle} placeholder="https://youtu.be/..." />
              {lessonForm.youtube_url.trim() && !previewId && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Link inválido — cole um endereço do YouTube.</p>}
              {previewId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={youtubeThumb(previewId)} alt="prévia" className="mt-2 w-full h-40 object-cover rounded-xl" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setLessonModal(false)} className="px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/10" style={{ color: '#888888', border: '1px solid #2A2A2A' }}>Cancelar</button>
              <Button onClick={() => saveLesson.mutate()} disabled={saveLesson.isPending} style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                {saveLesson.isPending ? 'Salvando...' : lessonEditId ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal ESPECIALIDADES ═══ */}
      {specModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setSpecModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border p-5 flex flex-col gap-4 max-h-[85vh]" style={{ background: '#262626', borderColor: '#3D3D3D' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>Especialidades</p>
              <button onClick={() => setSpecModal(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all"><X size={16} style={{ color: '#555555' }} /></button>
            </div>

            {/* Form add/editar */}
            <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: '#1F1F1F', borderColor: '#2A2A2A' }}>
              <p className="text-xs font-semibold" style={{ color: '#C8FF00', fontFamily: 'Poppins, sans-serif' }}>{specEditId ? 'Editar especialidade' : 'Nova especialidade'}</p>
              <div>
                <label className={lblCls} style={{ color: '#555555' }}>Nome *</label>
                <input value={specForm.name} onChange={e => setSpecForm(p => ({ ...p, name: e.target.value }))} className={iCls} style={iStyle} placeholder="ex: Nutrição" />
              </div>
              <div>
                <label className={lblCls} style={{ color: '#555555' }}>Ícone (opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(({ key, Icon }) => {
                    const active = specForm.icon === key
                    return (
                      <button key={key} onClick={() => setSpecForm(p => ({ ...p, icon: active ? '' : key }))}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: active ? 'rgba(200,255,0,0.15)' : '#1C1C1C', border: `1px solid ${active ? '#C8FF00' : '#3D3D3D'}` }}>
                        <Icon size={16} style={{ color: active ? '#C8FF00' : '#888888' }} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className={lblCls} style={{ color: '#555555' }}>Cor (opcional)</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_OPTIONS.map(c => {
                    const active = specForm.color === c
                    return (
                      <button key={c} onClick={() => setSpecForm(p => ({ ...p, color: active ? '' : c }))}
                        className="w-7 h-7 rounded-full transition-all" title={c}
                        style={{ background: c, border: active ? '2px solid #FFFFFF' : '2px solid transparent', boxShadow: active ? `0 0 0 2px ${c}` : 'none' }} />
                    )
                  })}
                  {specForm.color && <button onClick={() => setSpecForm(p => ({ ...p, color: '' }))} className="text-xs ml-1" style={{ color: '#888888' }}>limpar</button>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                {specEditId && <button onClick={resetSpecForm} className="px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/10" style={{ color: '#888888', border: '1px solid #2A2A2A' }}>Cancelar edição</button>}
                <Button size="sm" onClick={() => saveSpec.mutate()} disabled={saveSpec.isPending}
                  style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                  {saveSpec.isPending ? 'Salvando...' : specEditId ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </div>

            {/* Lista */}
            <div className="flex flex-col gap-2 overflow-y-auto">
              {specialties.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#555555' }}>Nenhuma especialidade criada.</p>
              ) : specialties.map((s, i) => {
                const color = s.color || DEFAULT_COLOR
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ background: '#1F1F1F', borderColor: '#2A2A2A' }}>
                    <div className="flex flex-col gap-0.5">
                      <button disabled={i === 0 || moveSpec.isPending} onClick={() => moveSpec.mutate({ index: i, dir: -1 })} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronUp size={13} style={{ color: '#888888' }} /></button>
                      <button disabled={i === specialties.length - 1 || moveSpec.isPending} onClick={() => moveSpec.mutate({ index: i, dir: 1 })} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronDown size={13} style={{ color: '#888888' }} /></button>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1f` }}>
                      <SpecialtyIcon name={s.icon} size={15} color={color} />
                    </div>
                    <p className="flex-1 text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>{s.name}</p>
                    <Switch checked={s.is_published} disabled={togglePublishSpec.isPending} onCheckedChange={val => togglePublishSpec.mutate({ id: s.id, val })} />
                    <button onClick={() => editSpec(s)} className="p-1.5 rounded-lg hover:bg-white/10" title="Editar"><Pencil size={13} style={{ color: '#888888' }} /></button>
                    <button onClick={() => { if (confirm(`Remover "${s.name}"? Os vídeos ficam sem categoria.`)) removeSpec.mutate(s.id) }} className="p-1.5 rounded-lg hover:bg-white/10" title="Remover"><Trash2 size={13} style={{ color: '#EF4444' }} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
