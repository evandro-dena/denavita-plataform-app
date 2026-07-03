-- =====================================================================
-- DENAVITA — FASE D: liberação transacional de aluno
-- Libera um aluno da lista de espera: ativa o plano pendente, limpa o
-- pendente e marca como ativo — os 3 writes numa única transação.
-- =====================================================================

create or replace function release_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  -- Plano pendente de revisão do aluno
  select plan_id into v_plan_id
  from pending_review_plans
  where student_id = p_student_id;

  if v_plan_id is null then
    raise exception 'Aluno % não possui plano pendente de revisão', p_student_id
      using errcode = 'no_data_found';
  end if;

  -- 1. Ativa o plano — é isto que torna a dieta VISÍVEL pro aluno
  insert into active_plans (student_id, plan_id)
  values (p_student_id, v_plan_id)
  on conflict (student_id) do update
    set plan_id = excluded.plan_id, updated_at = now();

  -- 2. Sai do estado pendente
  delete from pending_review_plans where student_id = p_student_id;

  -- 3. Sai da lista de espera
  update profiles set status = 'ativo' where id = p_student_id;
end;
$$;

-- A função é SECURITY DEFINER e NÃO checa ownership internamente — quem garante
-- isso é a rota POST /api/students/[id]/release (getSessionUser + dono).
-- Por isso, restringe a execução: só o service_role (usado pela rota) pode chamar.
revoke all on function release_student(uuid) from public;
revoke all on function release_student(uuid) from anon;
revoke all on function release_student(uuid) from authenticated;
grant execute on function release_student(uuid) to service_role;
