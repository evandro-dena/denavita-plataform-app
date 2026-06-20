import { createServiceClient } from '@/lib/supabase/server'
import { buildPrompt } from '@/lib/api/ai'
import { generatePlanFromPrompt } from '@/lib/ai/gemini'
import type { Student, Anamnesis, Assessment } from '@/types'

type ServiceClient = ReturnType<typeof createServiceClient>

// Shape (parcial) do JSON que a IA retorna.
interface AIPlan {
  total_calories?: number
  total_protein?: number
  total_carbs?: number
  total_fat?: number
  meals?: Array<{
    name?: string
    name_en?: string
    name_es?: string
    time?: string
    emoji?: string
    substitution?: string
    free_text?: string
    items?: Array<{
      name?: string
      quantity?: string
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
    }>
  }>
}

/**
 * Gera a dieta por IA para um aluno e PERSISTE em diet_plans + meals + meal_items.
 * - source = 'ia' (literal, não passa pelo mapeamento que viraria 'nutricionista')
 * - type   = 'alimentos' (único valor válido junto de 'textos_livres' no CHECK)
 * - created_by = nutritionist_id (aparece no listAll do nutricionista)
 *
 * NÃO marca pendente (pending_review_plans) nem ativa (active_plans) — isso é
 * das fases C e D. Aqui só gera e grava o plano.
 */
export async function generateDietForStudent(
  { studentId, nutritionistId }: { studentId: string; nutritionistId: string },
  supabase: ServiceClient,
): Promise<{ planId: string }> {
  // 1. Contexto do banco (service role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, goal_label, current_weight')
    .eq('id', studentId)
    .single()
  if (!profile) throw new Error('Aluno não encontrado')

  const { data: anamnesisRow } = await supabase
    .from('anamnesis')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: assessRow } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', studentId)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const student = profile as unknown as Student
  const anamnesis = (anamnesisRow as unknown as Anamnesis) ?? null
  const lastAssessment = assessRow
    ? ({
        body_fat_percentage: assessRow.body_fat_pct,
        muscle_mass: assessRow.muscle_mass_kg,
        bmi: assessRow.bmi,
      } as unknown as Assessment)
    : null

  // 2. Gera o plano via Gemini (refs do nutricionista)
  const prompt = buildPrompt({ student, anamnesis, lastAssessment, nutriId: nutritionistId })
  const plan = (await generatePlanFromPrompt(prompt, nutritionistId, supabase)) as AIPlan

  // 3. Persiste o plano (source='ia', type='alimentos')
  const planName = `Dieta IA — ${new Date().toLocaleDateString('pt-BR')}`
  const { data: dp, error: dpErr } = await supabase
    .from('diet_plans')
    .insert({
      user_id: studentId,
      created_by: nutritionistId,
      source: 'ia',
      type: 'alimentos',
      name: planName,
      total_calories: Number(plan.total_calories) || 0,
      total_protein: Number(plan.total_protein) || 0,
      total_carbs: Number(plan.total_carbs) || 0,
      total_fat: Number(plan.total_fat) || 0,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (dpErr || !dp) throw new Error(dpErr?.message ?? 'Erro ao gravar diet_plans')
  const planId = dp.id as string

  // 4. meals + meal_items
  const meals = Array.isArray(plan.meals) ? plan.meals : []
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
      .select('id')
      .single()

    const items = Array.isArray(meal.items) ? meal.items : []
    if (savedMeal && items.length) {
      await supabase.from('meal_items').insert(
        items.map((item, j) => ({
          meal_id: savedMeal.id,
          name: item.name,
          quantity: item.quantity,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          sort_order: j,
        })),
      )
    }
  }

  return { planId }
}
