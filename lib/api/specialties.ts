import { supabase } from '@/lib/supabase/client'
import { Specialty } from '@/types'

const COVERS_BUCKET = 'specialty-covers'

export type SpecialtyInput = {
  name: string
  icon?: string | null
  color?: string | null
  image_url?: string | null
}

// Extrai o caminho do objeto dentro do bucket a partir da URL pública.
export function coverPathFromUrl(url: string): string | null {
  const marker = `/${COVERS_BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length))
}

export const specialtyService = {
  async list(): Promise<Specialty[]> {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as Specialty[]
  },

  // created_by = id do nutri da sessão (RLS exige created_by = auth.uid()).
  async create(input: SpecialtyInput, nutriId: string, sortOrder: number): Promise<Specialty> {
    const { data, error } = await supabase
      .from('specialties')
      .insert({
        name: input.name,
        icon: input.icon || null,
        color: input.color || null,
        image_url: input.image_url || null,
        sort_order: sortOrder,
        created_by: nutriId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Erro ao criar especialidade')
    return data as Specialty
  },

  // Upload da capa → retorna a URL pública. Nome único p/ não sobrescrever.
  async uploadCover(file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from(COVERS_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) throw new Error(error.message)
    return supabase.storage.from(COVERS_BUCKET).getPublicUrl(path).data.publicUrl
  },

  // Apaga o arquivo da capa no bucket (best-effort). Recebe a URL pública.
  async removeCover(url: string): Promise<void> {
    const path = coverPathFromUrl(url)
    if (!path) return
    await supabase.storage.from(COVERS_BUCKET).remove([path])
  },

  async update(
    id: string,
    patch: Partial<SpecialtyInput> & { is_published?: boolean; sort_order?: number },
  ): Promise<void> {
    const { error } = await supabase
      .from('specialties')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('specialties').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async setPublished(id: string, is_published: boolean): Promise<void> {
    const { error } = await supabase
      .from('specialties')
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async swapOrder(
    a: { id: string; sort_order: number },
    b: { id: string; sort_order: number },
  ): Promise<void> {
    const now = new Date().toISOString()
    const r1 = await supabase.from('specialties').update({ sort_order: b.sort_order, updated_at: now }).eq('id', a.id)
    if (r1.error) throw new Error(r1.error.message)
    const r2 = await supabase.from('specialties').update({ sort_order: a.sort_order, updated_at: now }).eq('id', b.id)
    if (r2.error) throw new Error(r2.error.message)
  },
}
