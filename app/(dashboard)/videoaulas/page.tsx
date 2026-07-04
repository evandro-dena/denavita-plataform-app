'use client'
import { useNutriId } from '@/lib/hooks/useNutriId'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoLessonService } from '@/lib/api/videoLessons'
import { getYoutubeId, isValidYoutubeUrl, youtubeThumb } from '@/lib/youtube'
import Topbar from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Video, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { VideoLesson } from '@/types'

// ─── Estilos compartilhados (padrão do resto da plataforma) ──────────
const iCls = 'w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-[#C8FF00] transition-all'
const iStyle = { background: '#1C1C1C', color: '#FFFFFF', borderColor: '#3D3D3D' }
const lblCls = 'text-xs uppercase tracking-wide mb-1 block'

export default function VideoaulasPage() {
  const NUTRI_ID = useNutriId()
  const qc = useQueryClient()

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['video-lessons'],
    queryFn: () => videoLessonService.list(),
  })

  // ─── Modal (novo / editar) ─────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // null = nova aula
  const [form, setForm] = useState({ title: '', description: '', youtube_url: '' })

  const openNew = () => {
    setEditingId(null)
    setForm({ title: '', description: '', youtube_url: '' })
    setModalOpen(true)
  }
  const openEdit = (v: VideoLesson) => {
    setEditingId(v.id)
    setForm({ title: v.title, description: v.description ?? '', youtube_url: v.youtube_url ?? '' })
    setModalOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      const title = form.title.trim()
      const youtube_url = form.youtube_url.trim()
      const description = form.description.trim()
      if (!title) throw new Error('Informe o título da aula')
      if (!isValidYoutubeUrl(youtube_url)) throw new Error('Link do YouTube inválido')

      if (editingId) {
        await videoLessonService.update(editingId, { title, description, youtube_url })
      } else {
        if (!NUTRI_ID) throw new Error('Sessão ainda carregando, tente de novo')
        const nextOrder = lessons.reduce((m, l) => Math.max(m, l.sort_order), -1) + 1
        await videoLessonService.create({ title, description, youtube_url }, NUTRI_ID, nextOrder)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-lessons'] })
      toast.success(editingId ? 'Aula atualizada!' : 'Aula adicionada!')
      setModalOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => videoLessonService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['video-lessons'] }); toast.success('Aula removida.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => videoLessonService.setPublished(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['video-lessons'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const move = useMutation({
    mutationFn: ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const a = lessons[index]
      const b = lessons[index + dir]
      if (!a || !b) return Promise.resolve()
      return videoLessonService.swapOrder(
        { id: a.id, sort_order: a.sort_order },
        { id: b.id, sort_order: b.sort_order },
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['video-lessons'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const previewId = getYoutubeId(form.youtube_url)

  return (
    <div>
      <Topbar
        title="Videoaulas"
        subtitle={`${lessons.length} aula${lessons.length !== 1 ? 's' : ''} · Biblioteca única para todos os alunos`}
        action={
          <Button onClick={openNew}
            style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
            <Plus size={16} className="mr-2" /> Nova aula
          </Button>
        }
      />

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: '#262626' }} />)
        ) : lessons.length === 0 ? (
          <div className="rounded-2xl border p-16 text-center flex flex-col items-center gap-3"
            style={{ background: '#262626', borderColor: '#3D3D3D', color: '#555555' }}>
            <Video size={36} className="opacity-30" />
            <p className="text-sm">Nenhuma videoaula ainda.</p>
            <Button size="sm" onClick={openNew}
              style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '10px', fontFamily: 'Poppins, sans-serif' }}>
              <Plus size={14} className="mr-1.5" /> Adicionar primeira aula
            </Button>
          </div>
        ) : (
          lessons.map((v, i) => {
            const vid = getYoutubeId(v.youtube_url)
            return (
              <div key={v.id} className="rounded-2xl border p-4 flex items-center gap-4"
                style={{ background: '#262626', borderColor: '#3D3D3D', opacity: v.is_published ? 1 : 0.6 }}>

                {/* Reordenar */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button disabled={i === 0 || move.isPending} onClick={() => move.mutate({ index: i, dir: -1 })}
                    className="p-1 rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Subir">
                    <ChevronUp size={16} style={{ color: '#888888' }} />
                  </button>
                  <button disabled={i === lessons.length - 1 || move.isPending} onClick={() => move.mutate({ index: i, dir: 1 })}
                    className="p-1 rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title="Descer">
                    <ChevronDown size={16} style={{ color: '#888888' }} />
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="w-28 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: '#1C1C1C' }}>
                  {vid ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={youtubeThumb(vid)} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video size={22} style={{ color: '#555555' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>{v.title}</p>
                    {!v.is_published && (
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(136,136,136,0.15)', color: '#888888' }}>Rascunho</span>
                    )}
                  </div>
                  {v.description && <p className="text-xs mt-0.5 truncate" style={{ color: '#888888' }}>{v.description}</p>}
                  {v.youtube_url && (
                    <a href={v.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: '#C8FF00' }}>
                      Abrir no YouTube <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: v.is_published ? '#C8FF00' : '#555555' }}>
                      {v.is_published ? 'Publicada' : 'Oculta'}
                    </span>
                    <Switch checked={v.is_published} disabled={togglePublish.isPending}
                      onCheckedChange={val => togglePublish.mutate({ id: v.id, val })} />
                  </div>
                  <button onClick={() => openEdit(v)} className="p-2 rounded-lg transition-all hover:bg-white/10" title="Editar">
                    <Pencil size={14} style={{ color: '#888888' }} />
                  </button>
                  <button onClick={() => { if (confirm(`Remover "${v.title}"?`)) remove.mutate(v.id) }}
                    className="p-2 rounded-lg transition-all hover:bg-white/10" title="Remover">
                    <Trash2 size={14} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal novo / editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border p-5 flex flex-col gap-4"
            style={{ background: '#262626', borderColor: '#3D3D3D' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: '#FFFFFF', fontFamily: 'Poppins, sans-serif' }}>
                {editingId ? 'Editar aula' : 'Nova aula'}
              </p>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <X size={16} style={{ color: '#555555' }} />
              </button>
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className={iCls} style={iStyle} placeholder="ex: Como montar seu prato" />
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Descrição</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} className={iCls + ' resize-none'} style={iStyle} placeholder="opcional" />
            </div>

            <div>
              <label className={lblCls} style={{ color: '#555555' }}>Link do YouTube *</label>
              <input value={form.youtube_url} onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))}
                className={iCls} style={iStyle} placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..." />
              {form.youtube_url.trim() && !previewId && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Link inválido — cole um endereço do YouTube.</p>
              )}
              {previewId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={youtubeThumb(previewId)} alt="prévia" className="mt-2 w-full h-40 object-cover rounded-xl" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm transition-all hover:bg-white/10" style={{ color: '#888888', border: '1px solid #2A2A2A' }}>
                Cancelar
              </button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}
                style={{ background: '#C8FF00', color: '#1C1C1C', borderRadius: '12px', fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                {save.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
