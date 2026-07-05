-- =====================================================================
-- DENAVITA — Foto de capa das especialidades
-- image_url guarda a URL PÚBLICA da imagem no bucket 'specialty-covers'
-- (Supabase Storage). Nullable: especialidade sem capa fica sem fundo.
-- =====================================================================

alter table specialties
  add column if not exists image_url text;
