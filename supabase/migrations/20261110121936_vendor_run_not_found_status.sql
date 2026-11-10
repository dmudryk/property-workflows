-- Уточнення зрізу 3 (WS9): HTTP-статус відмови «Run not found» у прямій відповіді Data API (AC-VENDOR-15).
-- UAT на проді 10.11 показав: з errcode P0002 PostgREST відповідає HTTP 500 (помилка сервера), хоча повідомлення
-- «Run not found» і незмінна задача — як у AC. Відмова — не збій сервера: SQLSTATE 'PT404' PostgREST перекладає рівно
-- в HTTP 404. Попереднє визначення — 20261110095932_vendor_refusals.sql; змінено лише errcode гілки «Run not found»,
-- права й решта відмов — ті самі. Гранти функції create or replace зберігає.

create or replace function private.mark_task_done(p_task_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_task record;
begin
  select t.id, t.run_id, t.status, t.assignee_id, r.manager_id
  into v_task
  from public.run_tasks as t
  join public.runs as r on r.id = t.run_id
  where t.id = p_task_id;

  if v_uid is not null
    and (select private.current_app_role()) = 'vendor'
    and not exists (
      select 1 from public.run_tasks as own
      where own.run_id = v_task.run_id and own.assignee_id = v_uid
    )
  then
    raise exception 'Run not found' using errcode = 'PT404';
  end if;

  if v_uid is null
    or v_task.id is null
    or not (
      v_task.assignee_id = v_uid
      or v_task.manager_id = v_uid
      or (select private.current_app_role()) = 'admin'
    )
  then
    raise exception 'Only the task''s assignee, the run manager, or an administrator can mark a task as done'
      using errcode = '42501';
  end if;

  if v_task.status = 'done' then
    return;
  end if;

  update public.run_tasks
  set status = 'done', done_at = now(), done_by = v_uid
  where id = p_task_id and status = 'to_do';
end;
$$;
