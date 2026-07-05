export interface Profile {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: 'aluno' | 'nutricionista' | 'admin'
  nutritionist_id?: string
  goal_label?: string
  current_weight?: number
  goal_weight?: number
  phone?: string
  birth_date?: string
  created_at: string
}

export interface Student extends Profile {
  status: 'ativo' | 'inativo' | 'espera' | 'excluido'
  subscription?: Subscription
  anamnesis?: Anamnesis
  last_assessment?: Assessment
}

export interface Anamnesis {
  id: string
  user_id: string
  sexo: string
  data_nascimento?: string // 'YYYY-MM-DD' — fonte da idade (gravada pelo app)
  idade?: number // legado: o app não grava mais; idade é derivada de data_nascimento
  peso: number
  altura: number
  objetivo: string
  tempo_treino: string
  frequencia_treino: string
  horarios: { acordar: string; treino: string; refeicoes: Array<{ nome: string; horario: string }> }
  refeicoes: string[]
  come_no_trabalho: boolean
  condicao_suplemento: string
  suplementos_atuais: string[]
  suplemento_outro?: string // texto livre do "Outro?" de suplementos
  alergias: string[]
  alergia_outra?: string // texto livre do "Outra?" de alergias
  doenca_cronica: { tem: boolean; qual?: string }
  medicamento: { usa: boolean; qual?: string }
  historico_lesao: { tem: boolean; quais?: string }
  periodo_fome: string
  preferencia_alimentar: string
  alimentacao_atual: string
  created_at: string
}

export interface WeightRecord {
  id: string
  user_id: string
  weight: number
  recorded_at: string
  note?: string
}

export interface Assessment {
  id: string
  user_id: string
  type: 'bioimpedance' | 'pollock'
  date: string
  weight: number
  height: number
  bmi: number
  body_fat_percentage?: number
  muscle_mass?: number
  visceral_fat?: number
  bone_mass?: number
  measurements?: Record<string, number>
  notes?: string
}

export interface Exam {
  id: string
  user_id: string
  file_url: string
  file_name: string
  file_type: string
  status: 'pendente' | 'analisado'
  notes?: string
  uploaded_at: string
  analyzed_at?: string
}

export interface MealItem {
  id: string
  name: string
  quantity: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id: string
  name: string
  name_en?: string
  name_es?: string
  time: string
  emoji: string
  substitution?: string
  free_text?: string
  items: MealItem[]
}

export interface DietPlan {
  id: string
  user_id: string
  nutritionist_id: string
  name: string
  type: 'alimentos' | 'textos_livres'
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  meals: Meal[]
  source: 'manual' | 'ia' | 'misto'
  supplements?: string
  manipulated?: string
  shopping_list?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  name: string
  category: string
  prep_time: number
  calories: number
  protein: number
  carbs: number
  fat: number
  image_url?: string
  ingredients: string[]
  instructions: string[]
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'mensal' | 'trimestral' | 'semestral' | 'anual'
  status: 'ativo' | 'vencendo' | 'vencido' | 'cancelado'
  started_at: string
  expires_at: string
  price: number
}

export type CampaignType =
  | 'peso_feedback' | 'vencimento' | 'promocao' | 'cupom'
  | 'dica' | 'video_aula' | 'personalizada'

export type CampaignChannel = 'whatsapp' | 'app'

export type CampaignAudience =
  | 'todos' | 'melhores_resultados' | 'mais_tempo'
  | 'vencendo_7d' | 'vencendo_15d' | 'vencendo_30d' | 'personalizado'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  channels: CampaignChannel[]
  audience: CampaignAudience
  audience_count: number
  status: 'rascunho' | 'agendado' | 'enviado'
  schedule_type: 'imediato' | 'agendado' | 'recorrente'
  scheduled_at?: string
  recurrence?: 'diario' | 'semanal' | 'quinzenal' | 'mensal'
  recurrence_weekday?: number
  recurrence_time?: string
  selected_student_ids?: string[]
  whatsapp_message: string
  push_title: string
  push_body: string
  sent_count?: number
  open_rate?: number
  created_at: string
  sent_at?: string
}

export interface DashboardStats {
  total_students: number
  active_students: number
  expiring_7d: number
  expiring_15d: number
  expiring_30d: number
  pending_exams: number
  waiting_list: number
}

export interface VideoLesson {
  id: string
  title: string
  description?: string | null
  youtube_url?: string | null
  video_source: 'youtube' | 'upload'
  storage_path?: string | null
  specialty_id?: string | null
  module_id?: string | null
  sort_order: number
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  specialty_id: string
  name: string
  description?: string | null
  sort_order: number
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Specialty {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  image_url?: string | null
  sort_order: number
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}
