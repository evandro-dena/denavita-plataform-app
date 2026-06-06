import { DietPlan, Meal, MealItem } from '@/types'
import { supabase } from '@/lib/supabase/client'

// ─── Mappers ──────────────────────────────────────────────────────

function mapMealItem(r: Record<string, unknown>): MealItem {
  return {
    id: r.id as string,
    name: r.name as string,
    quantity: (r.quantity as string) ?? '',
    calories: (r.calories as number) ?? 0,
    protein: (r.protein as number) ?? 0,
    carbs: (r.carbs as number) ?? 0,
    fat: (r.fat as number) ?? 0,
  }
}

function mapMeal(r: Record<string, unknown>): Meal {
  return {
    id: r.id as string,
    name: r.name as string,
    name_en: r.name_en as string | undefined,
    name_es: r.name_es as string | undefined,
    time: (r.time as string) ?? '12:00',
    emoji: (r.emoji as string) ?? '🍽️',
    substitution: r.substitution as string | undefined,
    free_text: r.free_text as string | undefined,
    items: Array.isArray(r.meal_items)
      ? (r.meal_items as Record<string, unknown>[]).map(mapMealItem)
      : [],
  }
}

function mapPlan(r: Record<string, unknown>): DietPlan {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    nutritionist_id: (r.created_by as string) ?? '',
    name: r.name as string,
    type: ((r.type as string) ?? 'alimentos') as 'alimentos' | 'textos_livres',
    total_calories: (r.total_calories as number) ?? 0,
    total_protein: (r.total_protein as number) ?? 0,
    total_carbs: (r.total_carbs as number) ?? 0,
    total_fat: (r.total_fat as number) ?? 0,
    meals: Array.isArray(r.meals)
      ? (r.meals as Record<string, unknown>[])
          .sort((a, b) => ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0))
          .map(mapMeal)
      : [],
    source: (r.source as 'manual' | 'ia' | 'misto') ?? 'manual',
    supplements: r.supplements as string | undefined,
    manipulated: r.manipulated as string | undefined,
    shopping_list: r.shopping_list as string | undefined,
    notes: r.notes as string | undefined,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

// ─── Service ──────────────────────────────────────────────────────

export const mealPlanService = {
  async getMealPlan(userId: string): Promise<DietPlan | null> {
    const { data: active } = await supabase
      .from('active_plans')
      .select('plan_id')
      .eq('student_id', userId)
      .single()

    if (!active?.plan_id) return null

    const { data, error } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('id', active.plan_id)
      .single()

    if (error || !data) return null
    return mapPlan(data as Record<string, unknown>)
  },

  async listAll(nutritionistId: string): Promise<DietPlan[]> {
    const { data, error } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('created_by', nutritionistId)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return (data as Record<string, unknown>[]).map(mapPlan)
  },

  async getActivePlanId(studentId: string): Promise<string | null> {
    const { data } = await supabase
      .from('active_plans')
      .select('plan_id')
      .eq('student_id', studentId)
      .single()

    return data?.plan_id ?? null
  },

  async activateForStudent(planId: string | null, studentId: string): Promise<void> {
    if (planId) {
      await supabase.from('active_plans').upsert({ student_id: studentId, plan_id: planId })
    } else {
      await supabase.from('active_plans').delete().eq('student_id', studentId)
    }
  },

  async deletePlan(id: string): Promise<void> {
    await supabase.from('diet_plans').delete().eq('id', id)
  },

  async upsertMealPlan(plan: Partial<DietPlan>): Promise<DietPlan> {
    const { meals, ...planData } = plan

    // Upsert plan
    const { data: saved, error } = await supabase
      .from('diet_plans')
      .upsert({
        ...(planData.id ? { id: planData.id } : {}),
        user_id: planData.user_id ?? '',
        created_by: planData.nutritionist_id,
        name: planData.name ?? 'Novo plano',
        type: planData.type ?? 'alimentos',
        source: planData.source ?? 'manual',
        total_calories: planData.total_calories ?? 0,
        total_protein: planData.total_protein ?? 0,
        total_carbs: planData.total_carbs ?? 0,
        total_fat: planData.total_fat ?? 0,
        supplements: planData.supplements,
        manipulated: planData.manipulated,
        shopping_list: planData.shopping_list,
        notes: planData.notes,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !saved) throw new Error(error?.message ?? 'Erro ao salvar plano')

    const savedRow = saved as Record<string, unknown>
    const planId = savedRow.id as string

    // Upsert meals + items
    if (meals?.length) {
      // Deleta refeições antigas e recria
      await supabase.from('meals').delete().eq('plan_id', planId)

      for (let i = 0; i < meals.length; i++) {
        const meal = meals[i]
        const { data: savedMeal } = await supabase
          .from('meals')
          .insert({
            plan_id: planId,
            name: meal.name,
            name_en: meal.name_en,
            name_es: meal.name_es,
            time: meal.time,
            emoji: meal.emoji,
            substitution: meal.substitution,
            free_text: meal.free_text,
            sort_order: i,
          })
          .select()
          .single()

        if (savedMeal && meal.items?.length) {
          await supabase.from('meal_items').insert(
            meal.items.map((item, j) => ({
              meal_id: (savedMeal as Record<string, unknown>).id,
              name: item.name,
              quantity: item.quantity,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              sort_order: j,
            }))
          )
        }
      }
    }

    // Re-fetch completo para retornar com refeições
    const { data: full } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('id', planId)
      .single()

    return mapPlan((full ?? savedRow) as Record<string, unknown>)
  },
}
