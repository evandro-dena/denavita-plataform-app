# PROMPT — Plataforma Web DenaVita (Painel do Nutricionista)

> Cole este prompt no Claude Code, Cursor ou Lovable. Ele descreve a plataforma
> web que conecta ao MESMO banco de dados do app mobile DenaVita (React Native +
> Expo). O app já existe; esta plataforma é o painel administrativo que o
> nutricionista usa para gerenciar alunos, montar dietas (com ou sem IA),
> analisar exames e controlar assinaturas.

---

## 1. CONTEXTO DO PROJETO

Estou construindo o **DenaVita**, um ecossistema de nutrição com duas pontas:

- **App mobile (já desenvolvido)** — React Native + Expo + TypeScript. O ALUNO usa para: ver seu plano alimentar, registrar peso, ver avaliações físicas, enviar exames de sangue, preencher anamnese (onboarding), escanear alimentos e ver receitas.
- **Plataforma web (ESTE projeto)** — o NUTRICIONISTA usa para gerenciar alunos, criar/editar prescrições de dieta (manualmente ou com IA), analisar exames enviados, registrar avaliações físicas e controlar planos que estão vencendo.

Ambos consomem o **mesmo Supabase** (PostgreSQL + Auth + Storage). O schema completo está na seção 6.

---

## 2. STACK DA PLATAFORMA

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) para Auth, banco e Storage
- **TanStack Query** para data fetching/cache
- **Recharts** para gráficos (evolução de peso, composição corporal)
- **React Hook Form + Zod** para formulários e validação

Use variáveis de ambiente para as credenciais do Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Crie um arquivo `.env.local.example`.

**IMPORTANTE — desenvolva primeiro com dados MOCKADOS.** Ainda não tenho acesso ao Supabase. Estruture toda a camada de dados em `lib/api/` com funções que hoje retornam mocks e amanhã trocam para chamadas Supabase reais — exatamente como o app faz em `services/api.ts`. Cada função deve ter um `// TODO: conectar Supabase` no lugar da query real.

---

## 3. IDENTIDADE VISUAL (espelhar o app)

Dark mode com accent verde-limão. Use EXATAMENTE estes tokens:

```
background:    #111111
surface:       #1A1A1A
surfaceLight:  #222222
border:        #2A2A2A
accent:        #C8FF00   (verde-limão DenaVita — botões, destaques, ativo)
text:          #FFFFFF
textSecondary: #888888
textMuted:     #555555
warning:       #F59E0B
danger:        #EF4444
```

Tipografia: **Poppins** (títulos, 600/700) + **Inter** (corpo, 400/500).
Border radius: cards 20px, inputs 12px, pills 100px.
Estética: cantos arredondados, superfícies escuras empilhadas, accent usado com parcimônia (toggles "Ativo", botões primários, métricas em destaque).

> Referência de layout: o admin atual (appsupercoach) tem sidebar vertical à esquerda com ícones (Dashboard, Programas, Alunos, Nutrição, Biblioteca, Arquivos), lista de alunos com toggle Ativo/status, e painel lateral direito de formulário/prescrição. Quero algo no mesmo espírito, mas com a identidade DenaVita (verde-limão, não laranja).

---

## 4. ESTRUTURA DE PÁGINAS

```
/login                       → autenticação do nutricionista (Supabase Auth)
/dashboard                   → visão geral: nº de alunos ativos, planos vencendo (7/15/30 dias), exames pendentes
/alunos                      → lista de alunos (tabela): avatar, nome, objetivo, status (toggle Ativo), expiração
/alunos/novo                 → formulário de cadastro de aluno (nome, email, objetivo, senha)
/alunos/[id]                 → ficha do aluno com abas:
     ├─ Cadastro             → dados básicos editáveis
     ├─ Anamnese             → respostas do onboarding (read-only, vindas do app)
     ├─ Avaliação            → registrar avaliação física (bioimpedância OU dobras Pollock)
     ├─ Exames               → ver/baixar exames de sangue enviados; marcar como analisado + nota
     ├─ Prescrição (Dieta)   → editor de plano alimentar (ver seção 5)
     ├─ Evolução             → gráfico de peso (Recharts) + histórico de avaliações
     └─ Assinatura           → status do plano, data de expiração, renovar
/prescricoes                 → lista global de todas as prescrições (KCal, Prot, Carb, Gord, última atualização)
/receitas                    → CRUD da biblioteca de receitas (conteúdo global do app)
/configuracoes               → perfil do nutricionista
```

A lista de alunos (`/alunos`) deve ter: busca, abas (Aceitos / Lista de Espera / Excluídos), toggle de status, e ações por linha (editar, prescrição, avaliação, exames, apagar).

---

## 5. EDITOR DE PRESCRIÇÃO (a tela mais importante)

Esta é a feature central. O nutricionista monta o plano que o aluno verá no app. O formato deve bater 1:1 com o tipo `DietPlan` do app:

Um **DietPlan** tem: `totalCalories`, `totalProtein`, `totalCarbs`, `totalFat` e uma lista de **meals**.
Cada **Meal** tem: `name` (PT), `name_en`, `name_es`, `time`, `emoji`, `substitution` e uma lista de **items**.
Cada **MealItem** tem: `name`, `quantity`, `calories`, `protein`, `carbs`, `fat`.

Requisitos do editor:
- Botão "+ Nova Refeição" que adiciona uma refeição (com hora, nome em PT/EN/ES, emoji).
- Dentro da refeição, adicionar/remover itens (alimento, quantidade, kcal, P/C/G).
- **Soma automática** dos macros por refeição e total do plano (recalcula em tempo real conforme edita).
- Campo de **substituição** por refeição (texto livre).
- Dois modos de prescrição: **"Por alimentos"** (com cálculo de macros) e **"Por textos livres"** (texto puro, valores inseridos manualmente) — igual ao admin atual.
- Botão **"Gerar PDF"** do plano.
- **Geração por IA** (ver seção 5.1).

### 5.1 Geração de dieta com IA

Adicione um botão **"Gerar com IA"** no editor de prescrição. Ao clicar:
1. Reúne os dados do aluno: anamnese (objetivo, alergias, preferências, refeições/dia, horários), última avaliação física e exames já analisados.
2. Monta um prompt e chama a **Anthropic API** (Claude) para gerar um plano alimentar estruturado em JSON no formato exato do `DietPlan`.
3. Preenche o editor com o resultado — **o nutricionista REVISA e ajusta antes de salvar/enviar** (IA assistida, nunca autônoma).
4. O campo `source` do plano grava `'ia'` ou `'misto'` se foi editado depois.

Use `model: "claude-sonnet-4-20250514"`. Instrua a API a responder SOMENTE com JSON válido (sem markdown, sem preâmbulo) no schema: `{ totalCalories, totalProtein, totalCarbs, totalFat, meals: [{ name, name_en, name_es, time, emoji, substitution, items: [{ name, quantity, calories, protein, carbs, fat }] }] }`. Faça parse seguro com try/catch.

---

## 6. SCHEMA DO BANCO (Supabase / PostgreSQL)

Já tenho o schema pronto (arquivo `denavita-schema.sql`). As tabelas principais são:

- **profiles** — estende `auth.users`; tem `role` (aluno/nutricionista/admin), `nutritionist_id` (vínculo aluno→nutri), metas de peso e `goal_label`.
- **anamnesis** — respostas do onboarding do app (objetivo, alergias, suplementos, doenças, etc).
- **weight_records** — histórico de peso (gráfico de evolução).
- **assessments** — avaliação física: bioimpedância OU dobras Pollock, IMC, perímetros (jsonb).
- **exams** — exames de sangue (arquivo no Storage, status pendente/analisado, nota do nutri).
- **diet_plans** → **meals** → **meal_items** — a prescrição em 3 níveis (espelha `DietPlan`/`Meal`/`MealItem`).
- **recipes** + **recipe_favorites** — biblioteca de receitas.
- **subscriptions** — controle de plano/expiração (status ativo/vencendo/vencido).
- **feedback**, **food_scans** — features auxiliares do app.

Há **RLS** ativo: aluno vê só os próprios dados; nutricionista vê os dados dos alunos vinculados (`nutritionist_id`). Respeite isso nas queries — sempre filtre por `nutritionist_id = auth.uid()` na listagem de alunos.

**Atenção ao mapeamento de nomes:** o banco usa `snake_case` (`current_weight`, `total_calories`) e o app usa `camelCase` (`currentWeight`, `totalCalories`). Crie uma camada de mapeamento em `lib/mappers.ts` para converter nos dois sentidos, garantindo que o JSON entregue à API bata com os tipos do app mobile.

---

## 7. CONTRATO DE API (compatível com o app)

A plataforma deve produzir/consumir dados no mesmo formato que o app espera em `services/api.ts`. Endpoints lógicos (implemente como funções em `lib/api/`, hoje mock, amanhã Supabase):

```
authService.login / logout
mealPlanService.getMealPlan(userId)         → DietPlan
mealPlanService.upsertMealPlan(plan)         → cria/edita prescrição (NOVO, usado pela plataforma)
mealPlanService.getWeightHistory(userId)     → WeightRecord[]
studentService.list(nutritionistId)          → lista de alunos (NOVO)
studentService.getById(id)                   → ficha completa (NOVO)
studentService.create(data)                  → cadastra aluno (NOVO)
anamnesisService.getByUser(userId)           → AnamnesisData
assessmentService.list(userId) / create(...)  → avaliações físicas (NOVO)
examService.list(userId) / updateStatus(...)  → exames + análise (NOVO)
recipeService.list / create / update / delete → biblioteca de receitas
subscriptionService.list(nutritionistId)      → planos vencendo (NOVO)
aiService.generateDietPlan(studentData)       → chama Claude API, retorna DietPlan (NOVO)
```

---

## 8. ORDEM DE CONSTRUÇÃO

Construa nesta sequência:

1. **Setup**: projeto Next.js + Tailwind + shadcn + tokens de cor + fontes (Poppins/Inter) + layout base (sidebar + topbar).
2. **Camada de dados mockada** em `lib/api/` + `lib/mappers.ts` + tipos TypeScript espelhando os do app.
3. **Login** (tela visual, auth mockado por enquanto).
4. **Lista de alunos** (`/alunos`) com tabela, busca, toggle de status.
5. **Ficha do aluno** (`/alunos/[id]`) com as abas — começando por Cadastro, Anamnese e Evolução.
6. **Editor de prescrição** (a peça central da seção 5) com soma de macros em tempo real.
7. **Avaliação física** e **Exames**.
8. **Dashboard** com cards (alunos ativos, vencendo, exames pendentes).
9. **Geração por IA** (seção 5.1).
10. **Receitas** e **Assinaturas**.

Quando o acesso ao Supabase chegar, eu só troco as funções de `lib/api/` (de mock para query real) — a UI não muda.

Comece pelo passo 1 e me mostre a estrutura de pastas antes de avançar.
