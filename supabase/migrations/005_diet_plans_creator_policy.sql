-- =====================================================================
-- DENAVITA — FIX RLS: nutricionista enxerga as dietas que ELE criou
-- =====================================================================
-- PROBLEMA
-- A lista de prescrições (mealPlanService.listAll → .eq('created_by', nutriId))
-- vinha VAZIA para dietas de IA, mesmo com created_by correto (= id do nutri).
--
-- CAUSA
-- As policies de diet_plans (dp_select/dp_all) autorizam por
--   is_owner_or_nutritionist(user_id)   -- user_id = ALUNO
-- ou seja, pelo vínculo aluno→nutricionista, e NUNCA por created_by.
-- O USING entra em AND com o WHERE da query; created_by bate, mas a linha é
-- removida pela RLS antes disso. Se o aluno não estiver vinculado ao nutri
-- (profiles.nutritionist_id ausente/diferente), a dieta que o próprio nutri
-- criou fica invisível para ele.
--
-- CORREÇÃO (Opção A)
-- Acrescentar `created_by = auth.uid()`: o nutricionista que CRIOU o plano
-- sempre pode vê-lo/geri-lo, independente do estado do vínculo do aluno.
-- Não afrouxa a segurança — continua "dono OU nutri do aluno OU criador".
--
-- Idempotente: recria as duas policies com a condição expandida.
-- Ajuste os nomes/condição base se pg_get_functiondef/\d+ mostrarem algo diferente.
-- =====================================================================

-- ─── SELECT ─────────────────────────────────────────────────────────
drop policy if exists "dp_select" on diet_plans;
create policy "dp_select" on diet_plans for select
  using ( is_owner_or_nutritionist(user_id) OR created_by = auth.uid() );

-- ─── ALL (insert/update/delete + select) ────────────────────────────
drop policy if exists "dp_all" on diet_plans;
create policy "dp_all" on diet_plans for all
  using      ( is_owner_or_nutritionist(user_id) OR created_by = auth.uid() )
  with check ( is_owner_or_nutritionist(user_id) OR created_by = auth.uid() );
