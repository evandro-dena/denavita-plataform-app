// Porte (Deno) de lib/ai/generate-and-persist.ts — gera a dieta por IA e
// PERSISTE em diet_plans + meals (texto livre), source='ia', pendente de revisão.
// Formato único com a dieta manual: alimentos no free_text, macros só nos totais.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { buildPrompt } from './prompt.ts'
import { generatePlanFromPrompt } from './gemini.ts'
import type { Student, Anamnesis, Assessment } from './types.ts'

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
 * Gera a dieta por IA para um aluno e PERSISTE em diet_plans + meals (texto livre).
 * - source = 'ia' (literal); type = 'textos_livres'; created_by = nutritionist_id
 * - guard gera-uma-vez via pending_review_plans; NÃO ativa (active_plans).
 * Retorna o planId e se reaproveitou um plano pendente (skipped).
 */
export async function generateDietForStudent(
  { studentId, nutritionistId }: { studentId: string; nutritionistId: string },
  supabase: SupabaseClient,
): Promise<{ planId: string; skipped: boolean }> {
  // 0. Guard gera-uma-vez: se já há plano pendente p/ esse aluno, não regenera.
  const { data: pendente } = await supabase
    .from('pending_review_plans')
    .select('plan_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (pendente?.plan_id) return { planId: pendente.plan_id as string, skipped: true }

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

  // 3. Persiste o plano (source='ia', type='textos_livres' — formato único c/ a manual)
  // Nome do plano = nome do aluno em Title Case (nome + sobrenome), sem data.
  // Ex.: "joão SILVA" -> "João Silva". Fallback p/ 'Dieta IA' se sem nome.
  const planName =
    (student.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || 'Dieta IA'
  const { data: dp, error: dpErr } = await supabase
    .from('diet_plans')
    .insert({
      user_id: studentId,
      created_by: nutritionistId,
      source: 'ia',
      type: 'textos_livres',
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

  // 4. meals — formato TEXTO LIVRE. Compõe o free_text com os alimentos da IA
  //    (um por linha: "<quantidade> <nome>", sem macro por item). NÃO grava
  //    meal_items: os macros ficam só nos totais do plano (acima).
  const meals = Array.isArray(plan.meals) ? plan.meals : []
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i]
    const items = Array.isArray(meal.items) ? meal.items : []
    const composed = items
      .map((it) => [it.quantity, it.name].map((s) => (s ?? '').toString().trim()).filter(Boolean).join(' '))
      .filter(Boolean)
      .join('\n')
    const freeText = (meal.free_text ?? '').trim() || composed

    await supabase.from('meals').insert({
      plan_id: planId,
      name: meal.name,
      name_en: meal.name_en,
      name_es: meal.name_es,
      time: meal.time,
      emoji: meal.emoji,
      substitution: meal.substitution,
      free_text: freeText,
      sort_order: i,
    })
  }

  // 5. Marca como PENDENTE de revisão (PK = student_id → upsert dedupa).
  await supabase.from('pending_review_plans').upsert({ student_id: studentId, plan_id: planId })

  return { planId, skipped: false }
}
