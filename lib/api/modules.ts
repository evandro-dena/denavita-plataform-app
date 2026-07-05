import { supabase } from '@/lib/supabase/client'
import { Module } from '@/types'

export type ModuleInput = {
  specialty_id: string
  name: string
  description?: string | null
}

export const moduleService = {
  // Todos os módulos do nutri (RLS restringe), ordenados.
  async list(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as Module[]
  },

  // created_by = id do nutri da sessão (RLS exige created_by = auth.uid()).
  async create(input: ModuleInput, nutriId: string, sortOrder: number): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .insert({
        specialty_id: input.specialty_id,
        name: input.name,
        description: input.description || null,
        sort_order: sortOrder,
        created_by: nutriId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Erro ao criar módulo')
    return data as Module
  },

  async update(
    id: string,
    patch: Partial<ModuleInput> & { is_published?: boolean; sort_order?: number },
  ): Promise<void> {
    const { error } = await supabase
      .from('modules')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('modules').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async setPublished(id: string, is_published: boolean): Promise<void> {
    const { error } = await supabase
      .from('modules')
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async swapOrder(
    a: { id: string; sort_order: number },
    b: { id: string; sort_order: number },
  ): Promise<void> {
    const now = new Date().toISOString()
    const r1 = await supabase.from('modules').update({ sort_order: b.sort_order, updated_at: now }).eq('id', a.id)
    if (r1.error) throw new Error(r1.error.message)
    const r2 = await supabase.from('modules').update({ sort_order: a.sort_order, updated_at: now }).eq('id', b.id)
    if (r2.error) throw new Error(r2.error.message)
  },
}
