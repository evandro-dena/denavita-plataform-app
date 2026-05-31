import { Student, DietPlan, Assessment, WeightRecord, Exam, Recipe, Subscription, DashboardStats, Anamnesis } from '@/types'

export const MOCK_STUDENTS: Student[] = [
  {
    id: '1', name: 'Marina Costa', email: 'marina@email.com', role: 'aluno',
    nutritionist_id: 'nutri-1', goal_label: 'Perder gordura', current_weight: 72, goal_weight: 65,
    phone: '(11) 99999-0001', birth_date: '1995-03-15', created_at: '2024-01-10T00:00:00Z',
    status: 'ativo', subscription: { id: 's1', user_id: '1', plan: 'mensal', status: 'vencendo', started_at: '2024-12-01T00:00:00Z', expires_at: '2025-06-07T00:00:00Z', price: 299 }
  },
  {
    id: '2', name: 'Rafael Souza', email: 'rafael@email.com', role: 'aluno',
    nutritionist_id: 'nutri-1', goal_label: 'Ganhar massa', current_weight: 78, goal_weight: 85,
    phone: '(11) 99999-0002', birth_date: '1992-07-22', created_at: '2024-02-05T00:00:00Z',
    status: 'ativo', subscription: { id: 's2', user_id: '2', plan: 'trimestral', status: 'ativo', started_at: '2025-03-01T00:00:00Z', expires_at: '2025-08-15T00:00:00Z', price: 799 }
  },
  {
    id: '3', name: 'Juliana Ferreira', email: 'juliana@email.com', role: 'aluno',
    nutritionist_id: 'nutri-1', goal_label: 'Saúde geral', current_weight: 65, goal_weight: 60,
    phone: '(11) 99999-0003', birth_date: '1998-11-08', created_at: '2024-03-20T00:00:00Z',
    status: 'ativo', subscription: { id: 's3', user_id: '3', plan: 'semestral', status: 'ativo', started_at: '2025-01-01T00:00:00Z', expires_at: '2025-09-30T00:00:00Z', price: 1399 }
  },
  {
    id: '4', name: 'Carlos Mendes', email: 'carlos@email.com', role: 'aluno',
    nutritionist_id: 'nutri-1', goal_label: 'Performance', current_weight: 85, goal_weight: 83,
    phone: '(11) 99999-0004', birth_date: '1990-05-30', created_at: '2024-04-12T00:00:00Z',
    status: 'espera', subscription: undefined
  },
  {
    id: '5', name: 'Ana Paula Lima', email: 'ana@email.com', role: 'aluno',
    nutritionist_id: 'nutri-1', goal_label: 'Manter peso', current_weight: 58, goal_weight: 58,
    phone: '(11) 99999-0005', birth_date: '1993-09-14', created_at: '2024-05-01T00:00:00Z',
    status: 'inativo', subscription: { id: 's5', user_id: '5', plan: 'mensal', status: 'vencido', started_at: '2024-11-01T00:00:00Z', expires_at: '2024-12-01T00:00:00Z', price: 299 }
  },
]

export const MOCK_ANAMNESIS: Record<string, Anamnesis> = {
  '1': {
    id: 'a1', user_id: '1', sexo: 'feminino', idade: 29, peso: 72, altura: 165,
    objetivo: 'perder_gordura', tempo_treino: '1_3a', frequencia_treino: '4x',
    horarios: { acordar: '07:00', treino: '18:00', refeicoes: [{ nome: 'Café da manhã', horario: '08:00' }, { nome: 'Almoço', horario: '12:30' }, { nome: 'Jantar', horario: '20:00' }] },
    refeicoes: ['cafe_manha', 'almoco', 'lanche_tarde', 'jantar'],
    come_no_trabalho: true, condicao_suplemento: 'sim_limitado',
    suplementos_atuais: ['whey', 'creatina'],
    alergias: ['lactose'],
    doenca_cronica: { tem: false },
    medicamento: { usa: false },
    historico_lesao: { tem: false },
    periodo_fome: 'noite', preferencia_alimentar: 'salgados',
    alimentacao_atual: 'Gosto de frango, arroz e salada. Café da manhã como pão com ovos.',
    created_at: '2024-01-10T10:00:00Z'
  }
}

export const MOCK_WEIGHT_HISTORY: Record<string, WeightRecord[]> = {
  '1': [
    { id: 'w1', user_id: '1', weight: 78, recorded_at: '2024-01-10T00:00:00Z' },
    { id: 'w2', user_id: '1', weight: 76.5, recorded_at: '2024-02-10T00:00:00Z' },
    { id: 'w3', user_id: '1', weight: 75, recorded_at: '2024-03-10T00:00:00Z' },
    { id: 'w4', user_id: '1', weight: 74.2, recorded_at: '2024-04-10T00:00:00Z' },
    { id: 'w5', user_id: '1', weight: 73.1, recorded_at: '2024-05-10T00:00:00Z' },
    { id: 'w6', user_id: '1', weight: 72, recorded_at: '2024-06-10T00:00:00Z' },
  ]
}

export const MOCK_ASSESSMENTS: Record<string, Assessment[]> = {
  '1': [
    { id: 'as1', user_id: '1', type: 'bioimpedance', date: '2024-06-01', weight: 72, height: 165, bmi: 26.4, body_fat_percentage: 28, muscle_mass: 48, visceral_fat: 8, bone_mass: 2.8 }
  ]
}

export const MOCK_EXAMS: Record<string, Exam[]> = {
  '1': [
    { id: 'e1', user_id: '1', file_url: '#', file_name: 'hemograma_jan2025.pdf', file_type: 'pdf', status: 'pendente', uploaded_at: '2025-01-15T00:00:00Z' },
    { id: 'e2', user_id: '1', file_url: '#', file_name: 'glicemia_fev2025.jpg', file_type: 'image', status: 'analisado', notes: 'Glicemia em jejum levemente elevada. Recomendo redução de carboidratos simples.', uploaded_at: '2025-02-10T00:00:00Z', analyzed_at: '2025-02-12T00:00:00Z' }
  ]
}

export const MOCK_DIET_PLAN: DietPlan = {
  id: 'dp1', user_id: '1', nutritionist_id: 'nutri-1',
  total_calories: 1800, total_protein: 140, total_carbs: 180, total_fat: 55,
  source: 'manual',
  meals: [
    {
      id: 'm1', name: 'Café da manhã', name_en: 'Breakfast', name_es: 'Desayuno',
      time: '08:00', emoji: '☕', substitution: 'Pode substituir o pão por tapioca',
      items: [
        { id: 'i1', name: 'Pão integral', quantity: '2 fatias', calories: 140, protein: 6, carbs: 26, fat: 2 },
        { id: 'i2', name: 'Ovos mexidos', quantity: '3 unidades', calories: 210, protein: 18, carbs: 2, fat: 15 },
        { id: 'i3', name: 'Café preto', quantity: '200ml', calories: 5, protein: 0, carbs: 1, fat: 0 },
      ]
    },
    {
      id: 'm2', name: 'Almoço', name_en: 'Lunch', name_es: 'Almuerzo',
      time: '12:30', emoji: '🍽️', substitution: 'Frango pode ser substituído por peixe',
      items: [
        { id: 'i4', name: 'Frango grelhado', quantity: '150g', calories: 230, protein: 45, carbs: 0, fat: 5 },
        { id: 'i5', name: 'Arroz integral', quantity: '4 colheres', calories: 200, protein: 4, carbs: 42, fat: 1 },
        { id: 'i6', name: 'Salada verde', quantity: 'À vontade', calories: 30, protein: 2, carbs: 5, fat: 0 },
      ]
    },
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-03-01T00:00:00Z'
}

export const MOCK_RECIPES: Recipe[] = [
  { id: 'r1', name: 'Bowl de frango com quinoa', category: 'Almoço', prep_time: 25, calories: 420, protein: 38, carbs: 45, fat: 8, is_active: true, ingredients: ['150g frango', '80g quinoa', 'Legumes'], instructions: ['Cozinhar quinoa', 'Grelhar frango', 'Montar bowl'], created_at: '2025-01-01T00:00:00Z' },
  { id: 'r2', name: 'Omelete proteico', category: 'Café da manhã', prep_time: 10, calories: 280, protein: 24, carbs: 4, fat: 18, is_active: true, ingredients: ['3 ovos', '30g queijo cottage', 'Ervas'], instructions: ['Bater ovos', 'Fritar', 'Rechear'], created_at: '2025-01-02T00:00:00Z' },
]

export const MOCK_DASHBOARD: DashboardStats = {
  total_students: 5, active_students: 3, expiring_7d: 1,
  expiring_15d: 1, expiring_30d: 2, pending_exams: 1, waiting_list: 1
}
