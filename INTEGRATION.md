# Guia de Integração — DenaVita Plataforma + App + Supabase + Gemini

## Passo 1 — Criar projeto Supabase

1. Acesse https://supabase.com e crie um projeto
2. Em **SQL Editor**, execute nessa ordem:
   - `denavita-schema.sql` (schema base)
   - `supabase/migrations/001_schema_adjustments.sql` (ajustes)
3. Copie as chaves do projeto em **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (só no servidor)

## Passo 2 — Variáveis de ambiente

Crie `.env.local` na raiz da plataforma:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
```

No app mobile, crie `.env` na raiz do app:
```
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Passo 3 — Instalar dependências

**Plataforma (Next.js):**
```bash
npm install @supabase/supabase-js @supabase/ssr @google/generative-ai
```

**App (Expo):**
```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

## Passo 4 — Conectar a Plataforma ao Supabase

Cada serviço mock tem um equivalente real. Substitua os arquivos:

### `lib/api/students.ts` — substituir mocks por Supabase
```typescript
import { supabase } from '@/lib/supabase/client'

export const studentService = {
  async list(nutritionistId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('nutritionist_id', nutritionistId)
      .neq('status', 'excluido')
    return data ?? []
  },

  async getById(id: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, subscriptions(*)')
      .eq('id', id)
      .single()
    return data
  },

  async create(data) {
    // 1. Criar usuário no Auth
    const { data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password ?? Math.random().toString(36),
    })
    // 2. Inserir perfil
    const { data: profile } = await supabase
      .from('profiles')
      .insert({ ...data, id: authData.user?.id, role: 'aluno', status: 'ativo' })
      .select().single()
    return profile
  },

  async updateStatus(id, status) {
    await supabase.from('profiles').update({ status }).eq('id', id)
  },

  async update(id, data) {
    await supabase.from('profiles').update(data).eq('id', id)
  },
}
```

### `lib/api/diet.ts` — substituir mocks por Supabase
```typescript
export const mealPlanService = {
  async listAll(nutritionistId: string) {
    const { data } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('created_by', nutritionistId)
      .order('created_at', { ascending: false })
    return data ?? []
  },

  async getMealPlan(studentId: string) {
    const { data: active } = await supabase
      .from('active_plans')
      .select('plan_id')
      .eq('student_id', studentId)
      .single()
    if (!active?.plan_id) return null
    const { data } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('id', active.plan_id)
      .single()
    return data
  },

  async activateForStudent(planId, studentId) {
    await supabase.from('active_plans').upsert({ student_id: studentId, plan_id: planId })
  },

  async upsertMealPlan(plan) {
    const { meals, ...planData } = plan
    // Upsert plano
    const { data: savedPlan } = await supabase
      .from('diet_plans')
      .upsert({ ...planData, updated_at: new Date().toISOString() })
      .select().single()
    // Upsert refeições
    if (meals?.length) {
      for (const meal of meals) {
        const { items, ...mealData } = meal
        const { data: savedMeal } = await supabase
          .from('meals').upsert({ ...mealData, plan_id: savedPlan.id }).select().single()
        if (items?.length) {
          await supabase.from('meal_items')
            .upsert(items.map(i => ({ ...i, meal_id: savedMeal.id })))
        }
      }
    }
    return savedPlan
  },
}
```

## Passo 5 — Conectar Gemini (geração de dietas)

Edite `app/api/ai/generate-diet/route.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  const { student, anamnesis, lastAssessment } = await req.json()
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
    Você é uma nutricionista especializada. Crie um plano alimentar personalizado em JSON.
    
    Dados do paciente:
    - Nome: ${student.name}
    - Objetivo: ${student.goal_label}
    - Peso atual: ${student.current_weight}kg | Meta: ${student.goal_weight}kg
    ${anamnesis ? `- Alergias: ${anamnesis.alergias?.join(', ')}
    - Frequência treino: ${anamnesis.frequencia_treino}
    - Preferência: ${anamnesis.preferencia_alimentar}` : ''}
    
    Retorne APENAS JSON válido no formato:
    {
      "meals": [
        {
          "id": "m1", "name": "Café da Manhã", "name_en": "Breakfast", "name_es": "Desayuno",
          "time": "07:00", "emoji": "☕", "substitution": "...",
          "items": [{ "id": "i1", "name": "...", "quantity": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }]
        }
      ],
      "total_calories": 0, "total_protein": 0, "total_carbs": 0, "total_fat": 0
    }
  `

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''))
  return Response.json(json)
}
```

## Passo 6 — Conectar o App ao Supabase

No app, edite `services/api.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)

export const authService = {
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { token: data.session?.access_token, user: data.user }
  },
  async logout() {
    await supabase.auth.signOut()
  },
}

export const mealPlanService = {
  async getMealPlan(userId: string) {
    // 1. Busca o plano ativo
    const { data: active } = await supabase
      .from('active_plans').select('plan_id').eq('student_id', userId).single()
    if (!active?.plan_id) return null
    // 2. Busca o plano com refeições
    const { data } = await supabase
      .from('diet_plans')
      .select('*, meals(*, meal_items(*))')
      .eq('id', active.plan_id).single()
    return data
  },

  async updateWeight({ userId, weight }) {
    await supabase.from('weight_records').insert({ user_id: userId, weight })
    await supabase.from('profiles').update({ current_weight: weight }).eq('id', userId)
  },
}
```

### Salvar anamnese (ao finalizar o quiz no app):
```typescript
// app/onboarding/completion.tsx — após handleExplore()
await supabase.from('anamnesis').upsert({
  user_id: currentUser.id,
  sexo: answers.sexo,
  idade: answers.idade,
  peso: answers.peso,
  altura: answers.altura,
  objetivo: answers.objetivo,
  tempo_treino: answers.tempoTreino,
  frequencia_treino: answers.frequenciaTreino,
  horarios: answers.horarios,
  refeicoes: answers.refeicoes,
  // ... demais campos
  completed_at: new Date().toISOString(),
})

// Marcar aluno como "espera" aguardando revisão da dieta
await supabase.from('profiles').update({ status: 'espera' }).eq('id', currentUser.id)

// (Opcional) Disparar geração automática de dieta pela IA
const { data: dietPlan } = await fetch('/api/ai/generate-diet', {
  method: 'POST', body: JSON.stringify({ student, anamnesis: answers })
}).then(r => r.json())
await supabase.from('diet_plans').insert({ ...dietPlan, user_id: currentUser.id, source: 'ia' })
await supabase.from('pending_review_plans').upsert({ student_id: currentUser.id, plan_id: dietPlan.id })
```

## Passo 7 — Upload de exames (app → Supabase Storage)

```typescript
// No app (QuizFileUpload.tsx ou ExamesPanel)
const { data: upload } = await supabase.storage
  .from('exams')
  .upload(`${userId}/${Date.now()}_${file.name}`, fileBlob)

await supabase.from('exams').insert({
  user_id: userId,
  file_url: supabase.storage.from('exams').getPublicUrl(upload.path).data.publicUrl,
  file_name: file.name,
  file_type: file.type,
})
```

## Fluxo Completo Confirmado

```
App (aluno)                          Plataforma (nutricionista)
    │                                        │
    ├── Cadastro → auth.signUp()             │
    ├── Anamnese → anamnesis.insert()        │
    ├── IA gera dieta → diet_plans.insert()  │
    ├── Status muda para 'espera'            │
    │                                        │
    │            Supabase                    │
    │         ┌──────────┐                   │
    └─────────► profiles  ◄──────────────────┤ Lista alunos
               anamnesis  ◄──────────────────┤ Lê anamnese
               diet_plans ◄──────────────────┤ Cria/edita planos
               active_plans ◄────────────────┤ Ativa plano
               weight_records ◄──────────────┤ Lê histórico
    ┌──────────► diet_plans                  │
    ├── App lê plano ativo                   ├── Aprova e libera aluno
    ├── App registra peso                    ├── Envia notificação
    └── App envia exames                     └── Gerencia campanhas
```

## Resumo das tabelas novas/alteradas

| Tabela | Mudança |
|---|---|
| `profiles` | + `phone`, `birth_date`, `status` |
| `subscriptions` | + `plan_label`, `price` |
| `diet_plans` | + `type`, `supplements`, `manipulated`, `shopping_list`, `notes`, `is_template` |
| `meals` | + `free_text`, `name_en`, `name_es` |
| `active_plans` | NOVA — qual plano está ativo por aluno |
| `pending_review_plans` | NOVA — planos da IA aguardando revisão |
| `campaigns` | NOVA — CRM de comunicação |
