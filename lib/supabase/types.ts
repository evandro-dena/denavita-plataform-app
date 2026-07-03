// Tipos do banco — gerados a partir do schema
// Execute: npx supabase gen types typescript --project-id SEU_PROJECT_ID > lib/supabase/types.ts
// Por ora, definições manuais alinhadas com o schema

export type Tables = {
  profiles: {
    Row: {
      id: string
      role: 'aluno' | 'nutricionista' | 'admin'
      name: string
      email: string
      avatar_url: string | null
      nutritionist_id: string | null
      phone: string | null
      birth_date: string | null
      status: 'ativo' | 'inativo' | 'espera' | 'excluido'
      goal_label: string | null
      current_weight: number | null
      goal_weight: number | null
      start_weight: number | null
      created_at: string
      updated_at: string
    }
  }
  anamnesis: {
    Row: {
      id: string
      user_id: string
      sexo: string | null
      data_nascimento: string | null
      idade: number | null
      peso: number | null
      altura: number | null
      objetivo: string | null
      tempo_treino: string | null
      frequencia_treino: string | null
      horarios: Record<string, unknown> | null
      refeicoes: string[] | null
      come_no_trabalho: boolean | null
      condicao_suplemento: string | null
      suplementos_atuais: string[] | null
      suplemento_outro: string | null
      alergias: string[] | null
      alergia_outra: string | null
      doenca_cronica: Record<string, unknown> | null
      medicamento: Record<string, unknown> | null
      historico_lesao: Record<string, unknown> | null
      periodo_fome: string | null
      preferencia_alimentar: string | null
      alimentacao_atual: string | null
      completed_at: string | null
      created_at: string
    }
  }
  subscriptions: {
    Row: {
      id: string
      user_id: string
      plan_type: string | null
      plan_label: string | null
      status: 'ativo' | 'vencendo' | 'vencido' | 'cancelado'
      price: number | null
      started_at: string
      expires_at: string | null
      created_at: string
    }
  }
  diet_plans: {
    Row: {
      id: string
      user_id: string
      created_by: string | null
      name: string
      type: 'alimentos' | 'textos_livres'
      source: 'ia' | 'nutricionista' | 'misto'
      is_active: boolean
      is_template: boolean
      total_calories: number | null
      total_protein: number | null
      total_carbs: number | null
      total_fat: number | null
      supplements: string | null
      manipulated: string | null
      shopping_list: string | null
      notes: string | null
      created_at: string
      updated_at: string
    }
  }
  weight_records: {
    Row: {
      id: string
      user_id: string
      weight: number
      recorded_at: string
      week_label: string | null
      created_at: string
    }
  }
  assessments: {
    Row: {
      id: string
      user_id: string
      protocol: 'bioimpedancia' | 'pollock_3' | 'pollock_7' | 'manual'
      assessed_at: string
      weight: number | null
      height: number | null
      bmi: number | null
      body_fat_pct: number | null
      muscle_mass_kg: number | null
      fat_mass_kg: number | null
      visceral_fat: number | null
      bone_mass_kg: number | null
      metabolic_rate: number | null
      body_water_pct: number | null
      perimeters: Record<string, number> | null
      created_at: string
    }
  }
  exams: {
    Row: {
      id: string
      user_id: string
      file_url: string
      file_name: string | null
      file_type: string | null
      mime_type: string | null
      status: 'pendente' | 'analisado' | 'arquivado'
      notes: string | null
      uploaded_at: string
    }
  }
  active_plans: {
    Row: { student_id: string; plan_id: string | null; updated_at: string }
  }
  pending_review_plans: {
    Row: { student_id: string; plan_id: string; created_at: string }
  }
  campaigns: {
    Row: {
      id: string
      nutritionist_id: string
      name: string
      type: string | null
      channels: string[] | null
      audience: string | null
      selected_student_ids: string[] | null
      audience_count: number | null
      status: 'rascunho' | 'agendado' | 'enviado'
      schedule_type: 'imediato' | 'agendado' | 'recorrente'
      scheduled_at: string | null
      recurrence: string | null
      recurrence_weekday: number | null
      recurrence_time: string | null
      whatsapp_message: string | null
      push_title: string | null
      push_body: string | null
      sent_count: number | null
      open_rate: number | null
      created_at: string
      sent_at: string | null
    }
  }
}
