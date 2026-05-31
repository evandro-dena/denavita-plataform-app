import { DietPlan, Meal, MealItem } from '@/types'

// snake_case (DB) → camelCase (app/frontend)
export function mapDietPlanFromDB(raw: Record<string, unknown>): DietPlan {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    nutritionist_id: raw.nutritionist_id as string,
    total_calories: raw.total_calories as number,
    total_protein: raw.total_protein as number,
    total_carbs: raw.total_carbs as number,
    total_fat: raw.total_fat as number,
    meals: (raw.meals as Record<string, unknown>[])?.map(mapMealFromDB) ?? [],
    source: raw.source as DietPlan['source'],
    notes: raw.notes as string | undefined,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  }
}

export function mapMealFromDB(raw: Record<string, unknown>): Meal {
  return {
    id: raw.id as string,
    name: raw.name as string,
    name_en: raw.name_en as string | undefined,
    name_es: raw.name_es as string | undefined,
    time: raw.time as string,
    emoji: raw.emoji as string,
    substitution: raw.substitution as string | undefined,
    items: (raw.items as Record<string, unknown>[])?.map(mapMealItemFromDB) ?? [],
  }
}

export function mapMealItemFromDB(raw: Record<string, unknown>): MealItem {
  return {
    id: raw.id as string,
    name: raw.name as string,
    quantity: raw.quantity as string,
    calories: raw.calories as number,
    protein: raw.protein as number,
    carbs: raw.carbs as number,
    fat: raw.fat as number,
  }
}

// camelCase/frontend → snake_case for DB writes
export function mapDietPlanToDB(plan: Partial<DietPlan>): Record<string, unknown> {
  return {
    user_id: plan.user_id,
    nutritionist_id: plan.nutritionist_id,
    total_calories: plan.total_calories,
    total_protein: plan.total_protein,
    total_carbs: plan.total_carbs,
    total_fat: plan.total_fat,
    meals: plan.meals,
    source: plan.source ?? 'manual',
    notes: plan.notes,
  }
}
