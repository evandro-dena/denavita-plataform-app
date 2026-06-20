import { DietPlan, Student, Anamnesis, Assessment } from '@/types'
import { calcularIdade, traduzirCampo } from '@/constants/anamnesisLabels'

export interface StudentContext {
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

export function buildPrompt({ student, anamnesis, lastAssessment }: StudentContext): string {
  // Idade real derivada de data_nascimento (coluna gravada pelo app)
  const idade = calcularIdade(anamnesis?.data_nascimento)

  // Objetivo: traduz o código; cai para o goal_label do perfil se a anamnese não tiver
  const objetivo = anamnesis?.objetivo
    ? traduzirCampo('objetivo', anamnesis.objetivo)
    : (student.goal_label ?? 'não informado')

  // Peso/altura com fallback para não imprimir "undefined kg/cm"
  const peso = anamnesis?.peso ?? student.current_weight
  const pesoStr = peso != null ? `${peso}kg` : 'não informado'
  const alturaStr = anamnesis?.altura != null ? `${anamnesis.altura}cm` : 'não informada'

  // Refeições: lista os nomes traduzidos em vez da contagem
  const refeicoes = anamnesis?.refeicoes?.length
    ? traduzirCampo('refeicoes', anamnesis.refeicoes)
    : 'não informado'

  // Alergias/suplementos: traduz os códigos do array e concatena o texto livre "Outro?"
  const alergiasBase = anamnesis?.alergias?.length ? traduzirCampo('alergias', anamnesis.alergias) : ''
  const alergias = [alergiasBase, anamnesis?.alergia_outra?.trim()].filter(Boolean).join(', ') || 'nenhuma'

  const supBase = anamnesis?.suplementos_atuais?.length ? traduzirCampo('suplementos_atuais', anamnesis.suplementos_atuais) : ''
  const suplementos = [supBase, anamnesis?.suplemento_outro?.trim()].filter(Boolean).join(', ') || 'nenhum'

  const lines: string[] = [
    `Gere um plano alimentar personalizado para o seguinte aluno. Responda SOMENTE com JSON válido, sem texto adicional.`,
    ``,
    `DADOS DO ALUNO:`,
    `Nome: ${student.name}`,
    `Objetivo: ${objetivo}`,
    `Peso atual: ${pesoStr}`,
    `Altura: ${alturaStr}`,
    `Idade: ${idade ?? 'não informada'} anos`,
    `Sexo: ${traduzirCampo('sexo', anamnesis?.sexo)}`,
    `Tempo de treino: ${traduzirCampo('tempo_treino', anamnesis?.tempo_treino)}`,
    `Frequência de treino: ${traduzirCampo('frequencia_treino', anamnesis?.frequencia_treino)}`,
    `Refeições por dia: ${refeicoes}`,
    `Alergias: ${alergias}`,
    `Suplementos: ${suplementos}`,
    `Preferência alimentar: ${traduzirCampo('preferencia_alimentar', anamnesis?.preferencia_alimentar)}`,
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
