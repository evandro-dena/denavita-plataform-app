-- =====================================================================
-- DENAVITA — FASE F1: fluxo manual com botão "Gerar plano"
-- 1) Remove o disparo AUTOMÁTICO (trigger/Database Webhook da E3).
-- 2) Cria a tabela de status da geração: serve de TRAVA (evita 2º disparo) e
--    de FONTE do polling da UI (gerando | pronto | erro).
-- A geração em si continua na Edge Function, mas agora acionada pelo BOTÃO
-- (via rota Vercel kickoff), não mais por trigger.
-- =====================================================================

-- ─── 1. Remove o webhook automático (no-op se nunca foi aplicado) ───
drop trigger if exists on_anamnesis_generate_diet on public.anamnesis;
drop function if exists public.trigger_generate_diet();

-- ─── 2. Estado da geração por aluno ─────────────────────────────────
create table if not exists diet_generation_status (
  student_id uuid primary key references profiles(id) on delete cascade,
  status     text not null check (status in ('gerando','pronto','erro')),
  plan_id    uuid references diet_plans(id) on delete set null, -- preenchido em 'pronto'
  error      text,                                              -- mensagem em 'erro'
  updated_at timestamptz not null default now()
);

alter table diet_generation_status enable row level security;

-- Mesmo padrão de pending_review_plans/active_plans: o próprio aluno OU o
-- nutricionista dono. Escritas reais vêm da Edge Function (service role, ignora
-- RLS); esta policy habilita o polling de leitura pelo nutricionista/aluno.
drop policy if exists "dgs_all" on diet_generation_status;
create policy "dgs_all" on diet_generation_status for all
  using (is_owner_or_nutritionist(student_id))
  with check (is_owner_or_nutritionist(student_id));
