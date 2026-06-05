import { DietPlan } from '@/types'
import { MOCK_DIET_PLAN, MOCK_DIET_PLANS, MOCK_ACTIVE_PLAN } from './mock-data'

export const mealPlanService = {
  async getMealPlan(userId: string): Promise<DietPlan | null> {
    await new Promise(r => setTimeout(r, 300))
    const activeId = MOCK_ACTIVE_PLAN[userId]
    if (!activeId) return null
    return MOCK_DIET_PLANS.find(p => p.id === activeId) ?? null
  },

  async listAll(nutritionistId: string): Promise<DietPlan[]> {
    // TODO: conectar Supabase — select * from diet_plans where nutritionist_id = ?
    void nutritionistId
    await new Promise(r => setTimeout(r, 300))
    return MOCK_DIET_PLANS
  },

  async getActivePlanId(studentId: string): Promise<string | null> {
    await new Promise(r => setTimeout(r, 100))
    return MOCK_ACTIVE_PLAN[studentId] ?? null
  },

  async activateForStudent(planId: string | null, studentId: string): Promise<void> {
    // TODO: conectar Supabase — upsert student_diet_plan(student_id, plan_id)
    await new Promise(r => setTimeout(r, 200))
    if (planId) {
      MOCK_ACTIVE_PLAN[studentId] = planId
    } else {
      delete MOCK_ACTIVE_PLAN[studentId]
    }
  },

  async deletePlan(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 200))
    const idx = MOCK_DIET_PLANS.findIndex(p => p.id === id)
    if (idx >= 0) MOCK_DIET_PLANS.splice(idx, 1)
  },

  async upsertMealPlan(plan: Partial<DietPlan>): Promise<DietPlan> {
    await new Promise(r => setTimeout(r, 500))
    const base = { ...MOCK_DIET_PLAN, ...plan, id: plan.id ?? String(Date.now()), updated_at: new Date().toISOString() }
    const idx = MOCK_DIET_PLANS.findIndex(p => p.id === base.id)
    if (idx >= 0) MOCK_DIET_PLANS[idx] = base
    else MOCK_DIET_PLANS.push(base)
    return base
  },
}
