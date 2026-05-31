import { DietPlan } from '@/types'
import { MOCK_DIET_PLAN } from './mock-data'

export const mealPlanService = {
  async getMealPlan(userId: string): Promise<DietPlan | null> {
    // TODO: conectar Supabase
    // const { data } = await supabase.from('diet_plans').select('*, meals(*, meal_items(*))').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()
    await new Promise(r => setTimeout(r, 400))
    if (userId === '1') return MOCK_DIET_PLAN
    return null
  },

  async upsertMealPlan(plan: Partial<DietPlan>): Promise<DietPlan> {
    // TODO: conectar Supabase
    // const { data } = await supabase.from('diet_plans').upsert(mapDietPlanToDB(plan)).select().single()
    await new Promise(r => setTimeout(r, 500))
    return { ...MOCK_DIET_PLAN, ...plan, id: plan.id ?? String(Date.now()), updated_at: new Date().toISOString() }
  },
}
