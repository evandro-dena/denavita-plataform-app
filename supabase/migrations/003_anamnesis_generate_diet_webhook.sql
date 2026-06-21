-- =====================================================================
-- DENAVITA — FASE E3: Database Webhook em anamnesis -> Edge Function
-- Aciona a Edge Function `generate-diet` (fonte do FLUXO AUTOMÁTICO) sempre
-- que uma anamnese é criada ou atualizada (decisão 2: INSERT + UPDATE).
--
-- Usa pg_net (net.http_post): a chamada é ASSÍNCRONA — o INSERT/UPDATE do app
-- NÃO espera os ~68s da geração; o trigger só ENFILEIRA a requisição e retorna.
-- O guard gera-uma-vez (pending_review_plans) na própria função evita duplicar
-- dieta quando o UPDATE re-disparar.
--
-- SEGREDOS: a URL da função e o x-edge-secret vêm do Supabase Vault (não ficam
-- neste arquivo versionado). Cadastre-os UMA VEZ (ver runbook E3):
--   select vault.create_secret('https://<REF>.supabase.co/functions/v1/generate-diet', 'edge_generate_diet_url');
--   select vault.create_secret('<EDGE_SHARED_SECRET>', 'edge_shared_secret');
-- O valor de 'edge_shared_secret' DEVE ser idêntico ao secret EDGE_SHARED_SECRET
-- setado na função (`supabase secrets set`).
-- =====================================================================

-- pg_net cria/garante o schema `net` com http_post (no-op se já habilitado).
create extension if not exists pg_net;

create or replace function public.trigger_generate_diet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_generate_diet_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'edge_shared_secret';

  -- Sem os segredos no Vault não há como chamar a função: avisa e não quebra
  -- o INSERT/UPDATE da anamnese.
  if v_url is null or v_secret is null then
    raise warning 'generate-diet webhook: segredos do Vault ausentes (edge_generate_diet_url / edge_shared_secret); pulando disparo';
    return null;
  end if;

  -- Dispara assíncrono. timeout alto (150s = limite wall-clock Free do Edge) p/
  -- o worker do pg_net aguardar a geração e registrar a resposta em
  -- net._http_response (útil p/ debug). NÃO bloqueia a transação do app.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-edge-secret', v_secret
    ),
    body    := jsonb_build_object(
      'type',       tg_op,
      'table',      tg_table_name,
      'schema',     tg_table_schema,
      'record',     to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    ),
    timeout_milliseconds := 150000
  );

  return null;
end;
$$;

-- Só o owner/service_role precisa; a função roda como SECURITY DEFINER no trigger.
revoke all on function public.trigger_generate_diet() from public;

drop trigger if exists on_anamnesis_generate_diet on public.anamnesis;
create trigger on_anamnesis_generate_diet
  after insert or update on public.anamnesis
  for each row
  execute function public.trigger_generate_diet();
