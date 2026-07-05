-- =====================================================================
-- DENAVITA — Bucket de capas das especialidades (Supabase Storage)
-- Rodar UMA VEZ no SQL Editor. Bucket público + policies:
--   • leitura PÚBLICA (o app carrega a imagem pelo link)
--   • upload/update/delete SÓ p/ nutricionista/admin (aluno NÃO)
-- =====================================================================

-- ─── 1. Bucket (público) — o SQL cria; não precisa do painel ────────
insert into storage.buckets (id, name, public)
values ('specialty-covers', 'specialty-covers', true)
on conflict (id) do update set public = true;

-- ─── 2. Helper: usuário atual é nutricionista/admin? ────────────────
-- SECURITY DEFINER p/ ler profiles ignorando a RLS dela (evita falso-negativo
-- na avaliação da policy). Devolve só um booleano sobre o auth.uid() atual.
create or replace function public.is_nutritionist()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('nutricionista','admin')
  );
$$;

-- ─── 3. Policies em storage.objects (RLS já vem habilitada) ──────────

-- LEITURA: pública (qualquer um lê os objetos deste bucket).
drop policy if exists "specialty_covers_read" on storage.objects;
create policy "specialty_covers_read" on storage.objects
  for select
  using ( bucket_id = 'specialty-covers' );

-- UPLOAD: só nutricionista/admin.
drop policy if exists "specialty_covers_insert" on storage.objects;
create policy "specialty_covers_insert" on storage.objects
  for insert
  to authenticated
  with check ( bucket_id = 'specialty-covers' and public.is_nutritionist() );

-- UPDATE: só nutricionista/admin.
drop policy if exists "specialty_covers_update" on storage.objects;
create policy "specialty_covers_update" on storage.objects
  for update
  to authenticated
  using      ( bucket_id = 'specialty-covers' and public.is_nutritionist() )
  with check ( bucket_id = 'specialty-covers' and public.is_nutritionist() );

-- DELETE: só nutricionista/admin.
drop policy if exists "specialty_covers_delete" on storage.objects;
create policy "specialty_covers_delete" on storage.objects
  for delete
  to authenticated
  using ( bucket_id = 'specialty-covers' and public.is_nutritionist() );
