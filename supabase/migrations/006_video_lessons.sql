-- =====================================================================
-- DENAVITA — VIDEOAULAS: biblioteca única (mesmos vídeos p/ todos os alunos)
-- Fonte atual: YouTube (só o link). Estrutura já preparada p/ upload futuro
-- (video_source='upload' + storage_path), sem implementar upload agora.
-- =====================================================================

-- ─── Tabela ─────────────────────────────────────────────────────────
create table if not exists video_lessons (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  youtube_url   text,                                      -- link do YouTube (fonte atual)
  video_source  text not null default 'youtube'
    check (video_source in ('youtube','upload')),          -- 'upload' reservado p/ o futuro
  storage_path  text,                                      -- reservado p/ upload futuro (null agora)
  sort_order    int  not null default 0,                   -- ordena as aulas na biblioteca
  is_published  boolean not null default true,             -- esconder sem apagar
  created_by    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Integridade da fonte: youtube exige link; upload exige storage_path.
  constraint video_lessons_source_chk check (
    (video_source = 'youtube' and youtube_url  is not null) or
    (video_source = 'upload'  and storage_path is not null)
  )
);

-- Índice p/ a listagem da biblioteca (publicadas, ordenadas) e p/ o dono.
create index if not exists idx_video_lessons_published on video_lessons(is_published, sort_order);
create index if not exists idx_video_lessons_creator   on video_lessons(created_by);

-- ─── RLS ────────────────────────────────────────────────────────────
alter table video_lessons enable row level security;

-- Nutricionista dono: insere/edita/apaga (e enxerga) SÓ as aulas que criou.
-- Cobre também SELECT das próprias aulas mesmo despublicadas (p/ gerenciar).
drop policy if exists "vl_owner_all" on video_lessons;
create policy "vl_owner_all" on video_lessons for all
  to authenticated
  using      (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Aluno (qualquer usuário autenticado): LÊ as aulas publicadas.
-- Biblioteca única → não filtra por vínculo; só exige is_published = true.
drop policy if exists "vl_read_published" on video_lessons;
create policy "vl_read_published" on video_lessons for select
  to authenticated
  using (is_published = true);
