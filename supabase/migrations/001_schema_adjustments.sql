-- =====================================================================
-- DENAVITA — AJUSTES DE SCHEMA
-- Execute APÓS o schema base (denavita-schema.sql)
-- =====================================================================

-- ─── 1. PROFILES: colunas que a plataforma usa mas o schema não tem ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS birth_date   date,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','inativo','espera','excluido'));

-- ─── 2. SUBSCRIPTIONS: coluna price ────────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_label  text,   -- "mensal" | "trimestral" | etc.
  ADD COLUMN IF NOT EXISTS price       numeric(8,2) DEFAULT 0;

-- ─── 3. DIET_PLANS: colunas da plataforma ──────────────────────────
-- type: modo de prescrição (por alimentos ou texto livre)
ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS type          text NOT NULL DEFAULT 'alimentos'
    CHECK (type IN ('alimentos','textos_livres')),
  ADD COLUMN IF NOT EXISTS supplements   text,
  ADD COLUMN IF NOT EXISTS manipulated   text,
  ADD COLUMN IF NOT EXISTS shopping_list text,
  ADD COLUMN IF NOT EXISTS notes         text,
  -- se o plano é template da biblioteca ou está vinculado a um aluno específico
  ADD COLUMN IF NOT EXISTS is_template   boolean NOT NULL DEFAULT false;

-- ─── 4. MEALS: colunas de texto livre e multilíngue ───────────────
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS free_text  text,      -- prescrição por texto livre
  ADD COLUMN IF NOT EXISTS name_en    text,       -- "Breakfast"
  ADD COLUMN IF NOT EXISTS name_es    text;       -- "Desayuno"

-- ─── 5. CAMPAIGNS (CRM — aba Comunicação da plataforma) ───────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  type                 text,   -- 'peso_feedback'|'vencimento'|'promocao'|'cupom'|'dica'|'video_aula'|'personalizada'
  channels             text[], -- ['whatsapp','app']
  audience             text,   -- 'todos'|'melhores_resultados'|'mais_tempo'|'vencendo_7d'|...
  selected_student_ids uuid[],
  audience_count       int DEFAULT 0,
  status               text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','agendado','enviado')),
  schedule_type        text NOT NULL DEFAULT 'imediato'
    CHECK (schedule_type IN ('imediato','agendado','recorrente')),
  scheduled_at         timestamptz,
  recurrence           text,   -- 'diario'|'semanal'|'quinzenal'|'mensal'
  recurrence_weekday   int,    -- 0=Dom ... 6=Sáb
  recurrence_time      text,   -- "08:00"
  whatsapp_message     text,
  push_title           text,
  push_body            text,
  sent_count           int,
  open_rate            numeric(4,1),
  created_at           timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz
);
CREATE INDEX IF NOT EXISTS idx_campaigns_nutri ON campaigns(nutritionist_id);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp_nutri" ON campaigns FOR ALL
  USING (nutritionist_id = auth.uid())
  WITH CHECK (nutritionist_id = auth.uid());

-- ─── 6. PENDING_REVIEW_PLANS (liga aluno → plano pendente de revisão)
CREATE TABLE IF NOT EXISTS pending_review_plans (
  student_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id    uuid NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pending_review_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prp_all" ON pending_review_plans FOR ALL
  USING (is_owner_or_nutritionist(student_id))
  WITH CHECK (is_owner_or_nutritionist(student_id));

-- ─── 7. ACTIVE_PLANS (qual plano está ativo para cada aluno) ───────
CREATE TABLE IF NOT EXISTS active_plans (
  student_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id    uuid REFERENCES diet_plans(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE active_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ap_all" ON active_plans FOR ALL
  USING (is_owner_or_nutritionist(student_id))
  WITH CHECK (is_owner_or_nutritionist(student_id));
