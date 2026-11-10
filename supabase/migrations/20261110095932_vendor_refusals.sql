-- Уточнення зрізу 3 (WS9) після відповідей PM: відмови на пряму позначку чужої задачі.
-- Специфікація: openspec/specs/vendor-access (AC-VENDOR-07, AC-VENDOR-15); план:
-- openspec/changes/impl-clarify-ws8-vendor/design.md (D1); рішення PM — solomchaak/property-workflows-spec#48.
-- Нове визначення private.mark_task_done (попереднє — 20261020124103_runs_complete_tasks.sql): права ті самі
-- (виконавець задачі, менеджер її запуску або адміністратор), змінено лише відмови:
--   - вендор, який не має жодної задачі в запуску цієї задачі (або задачі немає), — «Run not found», як на сторінці
--     запуску (AC-VENDOR-15, AC-VENDOR-06): про запуск, якого він не бачить, нічого не кажемо;
--   - решта відмов — текст AC-TASK-03 замість коду NOT_ALLOWED, і в прямій відповіді Data API (AC-VENDOR-07).
--     Код помилки той самий (42501), тож дія markDone показує те саме повідомлення, що й раніше.
-- Позначка не перевіряє статусу запуску: необов'язкову задачу завершеного запуску можна позначити, тригер
-- refresh_run_status лишає запуск «completed» (AC-TASK-19, AC-VENDOR-16). Гранти функції create or replace зберігає.

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
    raise exception 'Run not found' using errcode = 'P0002';
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
