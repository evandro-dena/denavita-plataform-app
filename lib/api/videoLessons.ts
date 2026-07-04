import { supabase } from '@/lib/supabase/client'
import { VideoLesson } from '@/types'

export type VideoLessonInput = {
  title: string
  description?: string
  youtube_url: string
}

export const videoLessonService = {
  // Lista todas as aulas do nutricionista (RLS já restringe), ordenadas.
  async list(): Promise<VideoLesson[]> {
    const { data, error } = await supabase
      .from('video_lessons')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as VideoLesson[]
  },

  // created_by = id do nutri da sessão (a RLS exige created_by = auth.uid()).
  async create(input: VideoLessonInput, nutriId: string, sortOrder: number): Promise<VideoLesson> {
    const { data, error } = await supabase
      .from('video_lessons')
      .insert({
        title: input.title,
        description: input.description || null,
        youtube_url: input.youtube_url,
        video_source: 'youtube',
        sort_order: sortOrder,
        created_by: nutriId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Erro ao criar aula')
    return data as VideoLesson
  },

  async update(
    id: string,
    patch: Partial<VideoLessonInput> & { is_published?: boolean; sort_order?: number },
  ): Promise<void> {
    const { error } = await supabase
      .from('video_lessons')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('video_lessons').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async setPublished(id: string, is_published: boolean): Promise<void> {
    const { error } = await supabase
      .from('video_lessons')
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Troca o sort_order entre duas aulas (usado nos botões ↑ / ↓).
  async swapOrder(
    a: { id: string; sort_order: number },
    b: { id: string; sort_order: number },
  ): Promise<void> {
    const now = new Date().toISOString()
    const r1 = await supabase.from('video_lessons').update({ sort_order: b.sort_order, updated_at: now }).eq('id', a.id)
    if (r1.error) throw new Error(r1.error.message)
    const r2 = await supabase.from('video_lessons').update({ sort_order: a.sort_order, updated_at: now }).eq('id', b.id)
    if (r2.error) throw new Error(r2.error.message)
  },
}
