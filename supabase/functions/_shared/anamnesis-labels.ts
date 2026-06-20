// Porte (Deno) de constants/anamnesisLabels.ts — só o necessário pro buildPrompt.
// Arquivo puro, sem dependências. Mantém os mesmos códigos→labels da plataforma.

export const SEXO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
}

export const OBJETIVO_LABELS: Record<string, string> = {
  perder_gordura: 'Perder gordura',
  ganhar_massa: 'Ganhar massa muscular',
  manter_peso: 'Manter peso',
  performance: 'Melhorar performance',
  saude: 'Saúde e qualidade de vida',
}

export const TEMPO_TREINO_LABELS: Record<string, string> = {
  nunca: 'Nunca treinei',
  menos_6m: 'Menos de 6 meses',
  '6m_1a': '6 meses a 1 ano',
  '1_3a': '1 a 3 anos',
  mais_3a: 'Mais de 3 anos',
}

export const FREQUENCIA_TREINO_LABELS: Record<string, string> = {
  '2x': '2x por semana',
  '3x': '3x por semana',
  '4x': '4x por semana',
  '5x': '5x por semana',
  '6x': '6x por semana',
}

export const PREFERENCIA_ALIMENTAR_LABELS: Record<string, string> = {
  doces: 'Doces',
  salgados: 'Salgados',
  ambos: 'Ambos',
}

export const REFEICOES_LABELS: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  pre_treino: 'Pré-treino',
  pos_treino: 'Pós-treino',
  jantar: 'Jantar',
  ceia: 'Ceia',
}

export const SUPLEMENTOS_ATUAIS_LABELS: Record<string, string> = {
  whey: 'Whey Protein',
  creatina: 'Creatina',
  pre_treino: 'Pré-treino',
  bcaa: 'BCAA',
  multi: 'Multivitamínico',
  omega3: 'Ômega 3',
  glutamina: 'Glutamina',
  colageno: 'Colágeno',
  nenhum: 'Nenhum',
}

export const ALERGIAS_LABELS: Record<string, string> = {
  lactose: 'Lactose',
  gluten: 'Glúten',
  ovo: 'Ovo',
  amendoim: 'Amendoim',
  frutos_mar: 'Frutos do mar',
  soja: 'Soja',
  nenhuma: 'Nenhuma',
}

export const ANAMNESIS_LABELS: Record<string, Record<string, string>> = {
  sexo: SEXO_LABELS,
  objetivo: OBJETIVO_LABELS,
  tempo_treino: TEMPO_TREINO_LABELS,
  frequencia_treino: FREQUENCIA_TREINO_LABELS,
  preferencia_alimentar: PREFERENCIA_ALIMENTAR_LABELS,
  refeicoes: REFEICOES_LABELS,
  suplementos_atuais: SUPLEMENTOS_ATUAIS_LABELS,
  alergias: ALERGIAS_LABELS,
}

const PLACEHOLDER = '—'

/** Idade (anos completos) a partir de data_nascimento ('YYYY-MM-DD'). */
export function calcularIdade(dataNascimento?: string | null): number | null {
  if (!dataNascimento) return null
  const nasc = new Date(dataNascimento)
  if (isNaN(nasc.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

/** Traduz o valor de um campo (código único ou array) para exibição. */
export function traduzirCampo(coluna: string, valor: unknown): string {
  const mapa = ANAMNESIS_LABELS[coluna]

  if (Array.isArray(valor)) {
    if (valor.length === 0) return PLACEHOLDER
    return valor.map((v) => (mapa ? mapa[String(v)] ?? String(v) : String(v))).join(', ')
  }

  if (valor == null || valor === '') return PLACEHOLDER

  if (mapa) return mapa[String(valor)] ?? String(valor)
  return String(valor)
}
