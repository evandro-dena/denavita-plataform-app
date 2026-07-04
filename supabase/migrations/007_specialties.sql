-- =====================================================================
-- DENAVITA — ESPECIALIDADES das videoaulas
-- Cada especialidade é um "card" (ex: Nutrição, Psicologia) criado pela
-- própria plataforma (não é lista fixa no código). Uma aula pertence a UMA
-- especialidade (video_lessons.specialty_id).
-- =====================================================================

-- ─── 1. Tabela specialties ──────────────────────────────────────────
create table if not exists specialties (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,                 -- ex "Nutrição"
  icon          text,                          -- nome de um ícone (opcional)
  color         text,                          -- cor do card (opcional)
  sort_order    int  not null default 0,
  is_published  boolean not null default true, -- esconder sem apagar
  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_specialties_published on specialties(is_published, sort_order);
create index if not exists idx_specialties_creator   on specialties(created_by);

-- ─── 2. video_lessons.specialty_id (nullable p/ não quebrar as existentes)
alter table video_lessons
  add column if not exists specialty_id uuid references specialties(id) on delete set null;

create index if not exists idx_video_lessons_specialty on video_lessons(specialty_id);

-- ─── 3. RLS — mesma lógica de video_lessons ─────────────────────────
alter table specialties enable row level security;

-- Nutricionista dono: cria/edita/apaga (e vê) SÓ as que criou — inclusive
-- despublicadas, p/ gerenciar.
drop policy if exists "sp_owner_all" on specialties;
create policy "sp_owner_all" on specialties for all
  to authenticated
  using      (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Aluno (qualquer autenticado): LÊ as especialidades publicadas.
drop policy if exists "sp_read_published" on specialties;
create policy "sp_read_published" on specialties for select
  to authenticated
  using (is_published = true);
