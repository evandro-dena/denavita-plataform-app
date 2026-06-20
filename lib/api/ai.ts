import { DietPlan, Student, Anamnesis, Assessment } from '@/types'
import { calcularIdade } from '@/constants/anamnesisLabels'

interface StudentContext {
  student: Student
  anamnesis: Anamnesis | null
  lastAssessment: Assessment | null
  nutriId?: string
}

export const aiService = {
  async generateDietPlan(context: StudentContext): Promise<Omit<DietPlan, 'id' | 'user_id' | 'nutritionist_id' | 'created_at' | 'updated_at'>> {
    const prompt = buildPrompt(context)

    const response = await fetch('/api/ai/generate-diet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, nutri_id: context.nutriId }),
    })

    if (!response.ok) throw new Error('Erro ao gerar plano com IA')
    const data = await response.json()
    return data.plan
  },
}

function buildPrompt({ student, anamnesis, lastAssessment }: StudentContext): string {
  const lines: string[] = [
    `Gere um plano alimentar personalizado para o seguinte aluno. Responda SOMENTE com JSON válido, sem texto adicional.`,
    ``,
    `DADOS DO ALUNO:`,
    `Nome: ${student.name}`,
    `Objetivo: ${anamnesis?.objetivo ?? student.goal_label}`,
    `Peso atual: ${anamnesis?.peso ?? student.current_weight}kg`,
    `Altura: ${anamnesis?.altura}cm`,
    `Idade: ${calcularIdade(anamnesis?.data_nascimento) ?? 'não informada'} anos`,
    `Sexo: ${anamnesis?.sexo}`,
    `Frequência de treino: ${anamnesis?.frequencia_treino} por semana`,
    `Refeições por dia: ${anamnesis?.refeicoes?.length ?? 'não informado'}`,
    `Alergias: ${anamnesis?.alergias?.join(', ') || 'nenhuma'}`,
    `Suplementos: ${anamnesis?.suplementos_atuais?.join(', ') || 'nenhum'}`,
    `Preferência alimentar: ${anamnesis?.preferencia_alimentar}`,
    `Descrição da alimentação atual: ${anamnesis?.alimentacao_atual}`,
  ]

  if (lastAssessment) {
    lines.push(`% gordura corporal: ${lastAssessment.body_fat_percentage}%`)
    lines.push(`Massa muscular: ${lastAssessment.muscle_mass}kg`)
    lines.push(`IMC: ${lastAssessment.bmi}`)
  }

  lines.push(``, `Retorne EXATAMENTE neste formato JSON:`)
  lines.push(`{ "total_calories": number, "total_protein": number, "total_carbs": number, "total_fat": number, "source": "ia", "meals": [{ "id": "string", "name": "string em PT", "name_en": "string", "name_es": "string", "time": "HH:MM", "emoji": "emoji", "substitution": "string", "items": [{ "id": "string", "name": "string", "quantity": "string", "calories": number, "protein": number, "carbs": number, "fat": number }] }] }`)

  return lines.join('\n')
}
