import { Recipe } from '@/types'
import { MOCK_RECIPES } from './mock-data'

export const recipeService = {
  async list(): Promise<Recipe[]> {
    // TODO: conectar Supabase
    await new Promise(r => setTimeout(r, 300))
    return MOCK_RECIPES
  },

  async create(data: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
    // TODO: conectar Supabase
    await new Promise(r => setTimeout(r, 400))
    return { ...data, id: String(Date.now()), created_at: new Date().toISOString() }
  },

  async update(id: string, data: Partial<Recipe>): Promise<void> {
    // TODO: conectar Supabase
    void id
    void data
    await new Promise(r => setTimeout(r, 300))
  },

  async delete(id: string): Promise<void> {
    // TODO: conectar Supabase
    void id
    await new Promise(r => setTimeout(r, 200))
  },
}
