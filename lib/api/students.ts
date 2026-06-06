import { Student, Anamnesis, Assessment, Exam, WeightRecord } from '@/types'
import { supabase } from '@/lib/supabase/client'

// ─── Mappers ──────────────────────────────────────────────────────

function mapProfile(row: Record<string, unknown>): Student {
  const sub = row.subscriptions as Record<string, unknown>[] | null
  const firstSub = Array.isArray(sub) ? sub[0] : null
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: 'aluno',
    avatar_url: row.avatar_url as string | undefined,
    nutritionist_id: row.nutritionist_id as string | undefined,
    goal_label: row.goal_label as string | undefined,
    current_weight: row.current_weight as number | undefined,
    goal_weight: row.goal_weight as number | undefined,
    phone: row.phone as string | undefined,
    birth_date: row.birth_date as string | undefined,
    status: (row.status as Student['status']) ?? 'ativo',
    created_at: row.created_at as string,
    subscription: firstSub ? {
      id: firstSub.id as string,
      user_id: firstSub.user_id as string,
      plan: (firstSub.plan_label ?? firstSub.plan_type) as 'mensal' | 'trimestral' | 'semestral' | 'anual',
      status: firstSub.status as 'ativo' | 'vencendo' | 'vencido' | 'cancelado',
      started_at: firstSub.started_at as string,
      expires_at: firstSub.expires_at as string,
      price: (firstSub.price as number) ?? 0,
    } : undefined,
  }
}

// ─── Student Service ──────────────────────────────────────────────

export const studentService = {
  async list(nutritionistId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('nutritionist_id', nutritionistId)
      .eq('role', 'aluno')
      .neq('status', 'excluido')
      .order('created_at', { ascending: false })

    if (error) { console.error('studentService.list', error); return [] }

    const now = new Date()
    return (data ?? []).map(row => {
      const student = mapProfile(row as Record<string, unknown>)
      // Auto-expire: se a assinatura venceu, atualiza localmente
      if (student.subscription?.expires_at && new Date(student.subscription.expires_at) < now && student.status === 'ativo') {
        student.status = 'inativo'
        student.subscription.status = 'vencido'
        // Atualiza no banco em background
        supabase.from('profiles').update({ status: 'inativo' }).eq('id', student.id).then(() => {})
        supabase.from('subscriptions').update({ status: 'vencido' }).eq('user_id', student.id).then(() => {})
      }
      return student
    })
  },

  async getById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return mapProfile(data as Record<string, unknown>)
  },

  async create(data: Partial<Student>): Promise<Student> {
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        birth_date: data.birth_date,
        goal_label: data.goal_label,
        current_weight: data.current_weight,
        goal_weight: data.goal_weight,
        nutritionist_id: data.nutritionist_id,
        role: 'aluno',
        status: 'ativo',
        // id é gerado automaticamente pelo banco (uuid_generate_v4())
      })
      .select('*, subscriptions(*)')
      .single()

    if (error || !created) throw new Error(error?.message ?? 'Erro ao criar aluno')
    return mapProfile(created as Record<string, unknown>)
  },

  async updateStatus(id: string, status: Student['status']): Promise<void> {
    await supabase.from('profiles').update({ status }).eq('id', id)
  },

  async update(id: string, data: Partial<Student>): Promise<void> {
    const { subscription, ...profileData } = data
    if (Object.keys(profileData).length > 0) {
      await supabase.from('profiles').update(profileData).eq('id', id)
    }
    if (subscription) {
      await supabase.from('subscriptions').upsert({
        user_id: id,
        plan_label: subscription.plan,
        plan_type: subscription.plan,
        status: subscription.status,
        started_at: subscription.started_at,
        expires_at: subscription.expires_at,
        price: subscription.price,
      })
    }
  },

  async delete(id: string): Promise<void> {
    await supabase.from('profiles').update({ status: 'excluido' }).eq('id', id)
  },
}

// ─── Diet Review Service ──────────────────────────────────────────

export const dietReviewService = {
  async getNeedingReview(nutritionistId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('pending_review_plans')
      .select('student_id, profiles!student_id(*, subscriptions(*))')
      .eq('profiles.nutritionist_id', nutritionistId)

    if (error || !data) return []
    return (data as Record<string, unknown>[])
      .map(r => r.profiles as Record<string, unknown>)
      .filter(Boolean)
      .map(mapProfile)
  },

  async markAsReviewed(userId: string): Promise<void> {
    await supabase.from('pending_review_plans').delete().eq('student_id', userId)
    await supabase.from('profiles').update({ status: 'ativo' }).eq('id', userId)
  },

  async getPendingPlanMap(): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('pending_review_plans')
      .select('student_id, plan_id')

    if (error || !data) return {}
    return Object.fromEntries(
      (data as { student_id: string; plan_id: string }[]).map(r => [r.student_id, r.plan_id])
    )
  },
}

// ─── Anamnesis Service ────────────────────────────────────────────

export const anamnesisService = {
  async getByUser(userId: string): Promise<Anamnesis | null> {
    const { data, error } = await supabase
      .from('anamnesis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data as unknown as Anamnesis
  },
}

// ─── Assessment Service ───────────────────────────────────────────

export const assessmentService = {
  async list(userId: string): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId)
      .order('assessed_at', { ascending: false })

    if (error || !data) return []
    return (data as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      user_id: r.user_id as string,
      type: 'bioimpedance' as const,
      date: r.assessed_at as string,
      weight: (r.weight as number) ?? 0,
      height: (r.height as number) ?? 0,
      bmi: (r.bmi as number) ?? 0,
      body_fat_percentage: r.body_fat_pct as number | undefined,
      muscle_mass: r.muscle_mass_kg as number | undefined,
      visceral_fat: r.visceral_fat as number | undefined,
      bone_mass: r.bone_mass_kg as number | undefined,
      measurements: r.perimeters as Record<string, number> | undefined,
    }))
  },

  async add(userId: string, data: Omit<Assessment, 'id' | 'user_id' | 'bmi'>): Promise<Assessment> {
    const bmi = data.height > 0 ? Number((data.weight / ((data.height / 100) ** 2)).toFixed(1)) : 0
    const { data: created, error } = await supabase
      .from('assessments')
      .insert({
        user_id: userId,
        protocol: 'bioimpedancia',
        assessed_at: data.date || new Date().toISOString().split('T')[0],
        weight: data.weight,
        height: data.height,
        bmi,
        body_fat_pct: data.body_fat_percentage,
        muscle_mass_kg: data.muscle_mass,
        visceral_fat: data.visceral_fat,
        bone_mass_kg: data.bone_mass,
        perimeters: data.measurements,
      })
      .select()
      .single()

    if (error || !created) throw new Error(error?.message ?? 'Erro ao salvar avaliação')
    return { ...data, id: (created as Record<string, unknown>).id as string, user_id: userId, bmi }
  },

  async create(data: Omit<Assessment, 'id'>): Promise<Assessment> {
    return this.add(data.user_id, data)
  },
}

// ─── Exam Service ─────────────────────────────────────────────────

export const examService = {
  async list(userId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })

    if (error || !data) return []
    return data as unknown as Exam[]
  },

  async add(userId: string, fileData: { file_name: string; file_type: string; notes?: string }): Promise<Exam> {
    const { data: created, error } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        file_url: '#',
        file_name: fileData.file_name,
        file_type: fileData.file_type,
        status: 'pendente',
        notes: fileData.notes,
      })
      .select()
      .single()

    if (error || !created) throw new Error(error?.message ?? 'Erro ao salvar exame')
    return created as unknown as Exam
  },

  async updateStatus(examId: string, status: Exam['status'], notes?: string): Promise<void> {
    await supabase.from('exams').update({ status, notes }).eq('id', examId)
  },
}

// ─── Weight Service ───────────────────────────────────────────────

export const weightService = {
  async getHistory(userId: string): Promise<WeightRecord[]> {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(20)

    if (error || !data) return []
    return (data as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      user_id: r.user_id as string,
      weight: r.weight as number,
      recorded_at: r.recorded_at as string,
      note: r.week_label as string | undefined,
    }))
  },

  async add(userId: string, data: { weight: number; note?: string }): Promise<WeightRecord> {
    const { data: created, error } = await supabase
      .from('weight_records')
      .insert({
        user_id: userId,
        weight: data.weight,
        week_label: data.note,
      })
      .select()
      .single()

    if (error || !created) throw new Error(error?.message ?? 'Erro ao salvar peso')
    const row = created as Record<string, unknown>
    // Atualiza peso atual no perfil
    await supabase.from('profiles').update({ current_weight: data.weight }).eq('id', userId)
    return {
      id: row.id as string,
      user_id: userId,
      weight: data.weight,
      recorded_at: row.recorded_at as string,
      note: data.note,
    }
  },
}
