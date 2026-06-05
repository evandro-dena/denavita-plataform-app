import { Student, Anamnesis, Assessment, Exam, WeightRecord } from '@/types'
import { MOCK_STUDENTS, MOCK_ANAMNESIS, MOCK_ASSESSMENTS, MOCK_EXAMS, MOCK_WEIGHT_HISTORY, MOCK_NEEDS_DIET_REVIEW } from './mock-data'

export const studentService = {
  async list(nutritionistId: string): Promise<Student[]> {
    void nutritionistId
    await new Promise(r => setTimeout(r, 400))
    // Auto-expire: se a assinatura venceu, marca como inativo automaticamente
    const now = new Date()
    MOCK_STUDENTS.forEach(s => {
      if (s.subscription?.expires_at && new Date(s.subscription.expires_at) < now && s.status === 'ativo') {
        s.status = 'inativo'
        s.subscription.status = 'vencido'
      }
    })
    return MOCK_STUDENTS
  },

  async getById(id: string): Promise<Student | null> {
    // TODO: conectar Supabase
    await new Promise(r => setTimeout(r, 300))
    return MOCK_STUDENTS.find(s => s.id === id) ?? null
  },

  async create(data: Partial<Student>): Promise<Student> {
    // TODO: conectar Supabase — criar auth user + profile
    await new Promise(r => setTimeout(r, 500))
    const newStudent: Student = {
      id: String(Date.now()), role: 'aluno', status: 'espera',
      created_at: new Date().toISOString(), ...data
    } as Student
    return newStudent
  },

  async updateStatus(id: string, status: Student['status']): Promise<void> {
    await new Promise(r => setTimeout(r, 200))
    const s = MOCK_STUDENTS.find(s => s.id === id)
    if (s) s.status = status
  },

  async update(id: string, data: Partial<Student>): Promise<void> {
    await new Promise(r => setTimeout(r, 300))
    const idx = MOCK_STUDENTS.findIndex(s => s.id === id)
    if (idx >= 0) MOCK_STUDENTS[idx] = { ...MOCK_STUDENTS[idx], ...data }
  },

  async delete(id: string): Promise<void> {
    // TODO: conectar Supabase
    void id
    await new Promise(r => setTimeout(r, 200))
  },
}

export const dietReviewService = {
  // Returns students who filled the anamnesis app quiz but nutritionist hasn't verified/approved the AI diet yet
  // TODO: Supabase query — join profiles + anamnesis + diet_plans where diet_plans.verified_at IS NULL
  async getNeedingReview(nutritionistId: string): Promise<Student[]> {
    void nutritionistId
    await new Promise(r => setTimeout(r, 300))
    return MOCK_STUDENTS.filter(s => MOCK_NEEDS_DIET_REVIEW.includes(s.id) && s.status === 'ativo')
  },

  async markAsReviewed(userId: string): Promise<void> {
    // TODO: Supabase — set diet_plans.verified_at = now() for this user
    void userId
    await new Promise(r => setTimeout(r, 200))
  },
}

export const anamnesisService = {
  async getByUser(userId: string): Promise<Anamnesis | null> {
    // TODO: conectar Supabase
    await new Promise(r => setTimeout(r, 300))
    return MOCK_ANAMNESIS[userId] ?? null
  },
}

export const assessmentService = {
  async list(userId: string): Promise<Assessment[]> {
    await new Promise(r => setTimeout(r, 300))
    return MOCK_ASSESSMENTS[userId] ?? []
  },

  async add(userId: string, data: Omit<Assessment, 'id' | 'user_id' | 'bmi'>): Promise<Assessment> {
    await new Promise(r => setTimeout(r, 400))
    const bmi = data.height > 0 ? Number((data.weight / ((data.height / 100) ** 2)).toFixed(1)) : 0
    const record: Assessment = { ...data, id: String(Date.now()), user_id: userId, bmi, type: 'bioimpedance' }
    if (!MOCK_ASSESSMENTS[userId]) MOCK_ASSESSMENTS[userId] = []
    MOCK_ASSESSMENTS[userId].unshift(record)
    return record
  },

  async create(data: Omit<Assessment, 'id'>): Promise<Assessment> {
    await new Promise(r => setTimeout(r, 400))
    return { ...data, id: String(Date.now()) }
  },
}

export const examService = {
  async list(userId: string): Promise<Exam[]> {
    await new Promise(r => setTimeout(r, 300))
    return MOCK_EXAMS[userId] ?? []
  },

  async add(userId: string, data: { file_name: string; file_type: string; notes?: string }): Promise<Exam> {
    await new Promise(r => setTimeout(r, 300))
    const record: Exam = { id: String(Date.now()), user_id: userId, file_url: '#', file_name: data.file_name || 'arquivo', file_type: data.file_type, status: 'pendente', notes: data.notes, uploaded_at: new Date().toISOString() }
    if (!MOCK_EXAMS[userId]) MOCK_EXAMS[userId] = []
    MOCK_EXAMS[userId].unshift(record)
    return record
  },

  async updateStatus(examId: string, status: Exam['status'], notes?: string): Promise<void> {
    void examId; void status; void notes
    await new Promise(r => setTimeout(r, 300))
  },
}

export const weightService = {
  async getHistory(userId: string): Promise<WeightRecord[]> {
    await new Promise(r => setTimeout(r, 300))
    return MOCK_WEIGHT_HISTORY[userId] ?? []
  },

  async add(userId: string, data: { weight: number; note?: string }): Promise<WeightRecord> {
    await new Promise(r => setTimeout(r, 200))
    const record: WeightRecord = { id: String(Date.now()), user_id: userId, weight: data.weight, note: data.note, recorded_at: new Date().toISOString() }
    if (!MOCK_WEIGHT_HISTORY[userId]) MOCK_WEIGHT_HISTORY[userId] = []
    MOCK_WEIGHT_HISTORY[userId].unshift(record)
    return record
  },
}
