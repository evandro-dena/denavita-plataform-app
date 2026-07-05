-- =====================================================================
-- DENAVITA — MÓDULOS das videoaulas
-- Nova hierarquia: Especialidade → Módulo → Vídeos.
-- Um módulo pertence a UMA especialidade; todo vídeo fica dentro de um módulo.
-- TRANSIÇÃO: video_lessons.specialty_id é MANTIDO (não remover ainda) — os
-- dois convivem enquanto os vídeos existentes migram para module_id.
-- =====================================================================

-- ─── 1. Tabela modules ──────────────────────────────────────────────
create table if not exists modules (
  id            uuid primary key default uuid_generate_v4(),
  specialty_id  uuid not null references specialties(id) on delete cascade,
  name          text not null,                 -- ex "Hormônios"
  description   text,
  sort_order    int  not null default 0,
  is_published  boolean not null default true, -- esconder sem apagar
  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_modules_specialty on modules(specialty_id, sort_order);
create index if not exists idx_modules_published on modules(is_published, sort_order);
create index if not exists idx_modules_creator   on modules(created_by);

-- ─── 2. video_lessons.module_id (nullable durante a transição) ──────
-- ON DELETE SET NULL: apagar um módulo NÃO apaga os vídeos (ficam sem módulo).
-- specialty_id continua existindo — NÃO é removido nesta migration.
alter table video_lessons
  add column if not exists module_id uuid references modules(id) on delete set null;

create index if not exists idx_video_lessons_module on video_lessons(module_id);

-- ─── 3. RLS — mesma lógica de specialties ───────────────────────────
alter table modules enable row level security;

-- Nutricionista dono: cria/edita/apaga (e vê) SÓ os módulos que criou —
-- inclusive despublicados, p/ gerenciar.
drop policy if exists "mod_owner_all" on modules;
create policy "mod_owner_all" on modules for all
  to authenticated
  using      (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Aluno (qualquer autenticado): LÊ os módulos publicados.
drop policy if exists "mod_read_published" on modules;
create policy "mod_read_published" on modules for select
  to authenticated
  using (is_published = true);
