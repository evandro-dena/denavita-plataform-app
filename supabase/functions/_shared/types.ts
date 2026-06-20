// Tipos mínimos (subset) usados pelo porte. Espelham @/types da plataforma,
// só com os campos que o prompt/persistência realmente leem.

export interface Student {
  id: string
  name: string
  goal_label?: string | null
  current_weight?: number | null
}

export interface Anamnesis {
  data_nascimento?: string | null
  objetivo?: string | null
  peso?: number | null
  altura?: number | null
  sexo?: string | null
  tempo_treino?: string | null
  frequencia_treino?: string | null
  refeicoes?: string[] | null
  alergias?: string[] | null
  alergia_outra?: string | null
  suplementos_atuais?: string[] | null
  suplemento_outro?: string | null
  preferencia_alimentar?: string | null
  alimentacao_atual?: string | null
}

export interface Assessment {
  body_fat_percentage?: number | null
  muscle_mass?: number | null
  bmi?: number | null
}
