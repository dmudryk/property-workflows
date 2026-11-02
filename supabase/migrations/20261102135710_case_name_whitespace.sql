-- Назва випадку: з країв прибираємо не лише пробіли, а й табуляції та переноси рядків — назву часто вставляють з
-- таблиці чи листа (AC-RUN-03, AC-RUN-11). Решта private.launch_run — без змін.
create or replace function private.launch_run(
  p_template_id uuid,
  p_case_name text,
  p_assignments jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_uid uuid := (select auth.uid());
  v_template_name text;
  v_version integer;
  v_content jsonb;
  v_case_name text := btrim(coalesce(p_case_name, ''), E' \t\r\n');
  v_assignments jsonb := coalesce(p_assignments, '{}'::jsonb);
begin
  if v_uid is null or (select private.current_app_role()) not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if char_length(v_case_name) = 0 then
    raise exception 'EMPTY_CASE_NAME' using errcode = '22023';
  end if;
  if char_length(v_case_name) >= 100 then
    raise exception 'CASE_NAME_TOO_LONG' using errcode = '22023';
  end if;
  if jsonb_typeof(v_assignments) <> 'object' then
    raise exception 'INVALID_ASSIGNMENTS' using errcode = '22023';
  end if;

  -- Лише шаблон зі збереженою версією: з незбережених змін запуск не створюється (глосарій PM;
  -- solomchaak/property-workflows-spec#21). RLS тут не діє (security definer), тож перевірка явна.
  select t.name, t.current_version, t.current_content
    into v_template_name, v_version, v_content
  from public.templates as t
  where t.id = p_template_id;
  if v_template_name is null or v_version is null then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Кожен призначений виконавець задачі поточної версії — менеджер чи адміністратор (AC-RUN-04).
  if exists (
    select 1
    from jsonb_array_elements(v_content -> 'sections') as s(section)
    cross join lateral jsonb_array_elements(s.section -> 'tasks') as t(task)
    where nullif(v_assignments ->> (t.task ->> 'id'), '') is not null
      and not private.is_staff(nullif(v_assignments ->> (t.task ->> 'id'), '')::uuid)
  ) then
    raise exception 'INVALID_ASSIGNEE' using errcode = '22023';
  end if;

  insert into public.runs (id, template_id, template_version, template_name, case_name, status, manager_id)
  values (v_run_id, p_template_id, v_version, v_template_name, v_case_name, 'in_progress', v_uid);

  -- Секції, їхні назви й порядок, позначки required — копія поточної версії на момент запуску (AC-RUN-02, AC-RUN-12).
  insert into public.run_tasks (run_id, section_name, name, required, position, assignee_id, status)
  select
    v_run_id,
    s.section ->> 'name',
    t.task ->> 'name',
    (t.task ->> 'required')::boolean,
    s.section_no * 1000 + t.task_no,
    coalesce(nullif(v_assignments ->> (t.task ->> 'id'), '')::uuid, v_uid),
    'to_do'
  from jsonb_array_elements(v_content -> 'sections') with ordinality as s(section, section_no)
  cross join lateral jsonb_array_elements(s.section -> 'tasks') with ordinality as t(task, task_no);

  return v_run_id;
end;
$$;
