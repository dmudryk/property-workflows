-- Зріз WS7, задача 1: редактор шаблону з версіями (openspec/specs/template-editor, AC-EDITOR-01…09; AC-DSYS-02).
-- План: openspec/changes/impl-ws7-templates/design.md (R1–R4); запис — лише функціями private (ADR 0001, ADR 0002).
-- Правила міграцій — AGENTS.md → «База даних»: RLS на кожній таблиці, revoke + явні grant, політика на кожну операцію
-- to authenticated, security definer — лише в private з set search_path = ''.

-- ── R2. Поточна версія шаблону та її зміст (бачить і менеджер — AC-EDITOR-02) ──
alter table public.templates
  add column current_version integer,
  add column current_content jsonb;

comment on column public.templates.current_version is 'Номер поточної (останньої збереженої) версії; null — шаблон ще не збережено.';
comment on column public.templates.current_content is 'Зміст поточної версії (копія template_versions.content); пише лише publish_template_version.';

-- ── R2. Версії: незмінні пронумеровані знімки змісту (AC-EDITOR-03, AC-EDITOR-05) ──
create table public.template_versions (
  template_id uuid not null references public.templates (id) on delete cascade,
  number      integer not null,
  content     jsonb not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  primary key (template_id, number),
  constraint template_versions_number_check check (number >= 1)
);

comment on table public.template_versions is 'Збережені версії шаблону; ніколи не змінюються. created_by = null — версія 1, перенесена з даних зрізу 1.';

-- ── R2. Незбережені зміни (Unpublished changes): один набір на шаблон, спільний для адміністраторів (AC-EDITOR-01) ──
-- Окрема таблиця, а не колонка в templates: RLS ховає рядки, а не колонки (менеджер бачить templates).
create table public.template_drafts (
  template_id uuid primary key references public.templates (id) on delete cascade,
  content     jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id)
);

comment on table public.template_drafts is 'Незбережені зміни шаблону (Unpublished changes); бачить лише адміністратор.';

alter table public.template_versions enable row level security;
alter table public.template_drafts enable row level security;

revoke all on table public.template_versions, public.template_drafts from anon, authenticated;
-- Лише читання — під політиками нижче; запис — лише функціями private (ADR 0001): прямий insert/update/delete —
-- permission denied (AC-EDITOR-08).
grant select on table public.template_versions, public.template_drafts to authenticated;
grant select, insert, update, delete on table public.template_versions, public.template_drafts to service_role;

-- Список версій і незбережені зміни — лише адміністратор (матриця прав; AC-EDITOR-02, AC-EDITOR-05, AC-EDITOR-07).
create policy template_versions_select_admin on public.template_versions
  for select to authenticated
  using ((select private.current_app_role()) = 'admin');

create policy template_drafts_select_admin on public.template_drafts
  for select to authenticated
  using ((select private.current_app_role()) = 'admin');

-- Шаблони: адміністратор — усі; менеджер — лише збережені як версія (AC-EDITOR-02; незбережений шаблон менеджер не бачить).
drop policy templates_select_staff on public.templates;
create policy templates_select_visible on public.templates
  for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    or ((select private.current_app_role()) = 'manager' and current_version is not null)
  );

-- ── Перенесення зрізу 1: наявні шаблони → версія 1 (Q6, solomchaak/property-workflows-spec#33) ──
-- Зміст: {"sections":[{"id","name","tasks":[{"id","name","required"}]}]}; id задач — ті самі, що в зрізі 1.
insert into public.template_versions (template_id, number, content, created_at, created_by)
select
  t.id,
  1,
  jsonb_build_object('sections', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'tasks', coalesce((
          select jsonb_agg(jsonb_build_object('id', tt.id, 'name', tt.name, 'required', tt.required) order by tt.position)
          from public.template_tasks as tt
          where tt.section_id = s.id
        ), '[]'::jsonb)
      ) order by s.position)
    from public.template_sections as s
    where s.template_id = t.id
  ), '[]'::jsonb)),
  t.created_at,
  null
from public.templates as t;

update public.templates as t
set current_version = 1, current_content = v.content
from public.template_versions as v
where v.template_id = t.id and v.number = 1;

-- ── R2, AC-EDITOR-06. Запуск пам'ятає версію шаблону; наявні запуски — версія 1 ──
alter table public.runs add column template_version integer;
update public.runs set template_version = 1;
alter table public.runs alter column template_version set not null;
alter table public.runs
  add constraint runs_template_version_fkey
  foreign key (template_id, template_version) references public.template_versions (template_id, number);

-- Зміст шаблону тепер — у версіях; старі таблиці зрізу 1 більше ніхто не читає.
drop table public.template_tasks, public.template_sections;

-- ── R1. Нормалізація змісту: лише відомі ключі й типи, обрізані непорожні назви, унікальні id ──
create or replace function private.normalize_template_content(p_content jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_sections jsonb := '[]'::jsonb;
  v_tasks jsonb;
  v_section jsonb;
  v_task jsonb;
  v_name text;
  v_id uuid;
  v_ids uuid[] := '{}';
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object'
     or jsonb_typeof(p_content -> 'sections') is distinct from 'array' then
    raise exception 'INVALID_CONTENT' using errcode = '22023';
  end if;

  for v_section in select value from jsonb_array_elements(p_content -> 'sections') loop
    if jsonb_typeof(v_section) <> 'object'
       or jsonb_typeof(coalesce(v_section -> 'tasks', '[]'::jsonb)) <> 'array' then
      raise exception 'INVALID_CONTENT' using errcode = '22023';
    end if;
    v_tasks := '[]'::jsonb;
    for v_task in select value from jsonb_array_elements(coalesce(v_section -> 'tasks', '[]'::jsonb)) loop
      if jsonb_typeof(v_task) <> 'object' or jsonb_typeof(v_task -> 'required') is distinct from 'boolean' then
        raise exception 'INVALID_CONTENT' using errcode = '22023';
      end if;
      v_name := btrim(coalesce(v_task ->> 'name', ''));
      v_id := (v_task ->> 'id')::uuid;
      if v_name = '' then
        raise exception 'EMPTY_NAME' using errcode = '22023';
      end if;
      if v_id is null or v_id = any (v_ids) then
        raise exception 'INVALID_CONTENT' using errcode = '22023';
      end if;
      v_ids := v_ids || v_id;
      v_tasks := v_tasks || jsonb_build_array(
        jsonb_build_object('id', v_id, 'name', v_name, 'required', (v_task -> 'required')::boolean)
      );
    end loop;
    v_name := btrim(coalesce(v_section ->> 'name', ''));
    v_id := (v_section ->> 'id')::uuid;
    if v_name = '' then
      raise exception 'EMPTY_NAME' using errcode = '22023';
    end if;
    if v_id is null or v_id = any (v_ids) then
      raise exception 'INVALID_CONTENT' using errcode = '22023';
    end if;
    v_ids := v_ids || v_id;
    v_sections := v_sections || jsonb_build_array(jsonb_build_object('id', v_id, 'name', v_name, 'tasks', v_tasks));
  end loop;

  return jsonb_build_object('sections', v_sections);
end;
$$;

revoke execute on function private.normalize_template_content(jsonb) from public, anon, authenticated;

-- ── R3. Функції запису: лише адміністратор; перша перевірка — роль (для anon роль = null, тому is distinct from) ──
create or replace function private.create_template(p_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid := gen_random_uuid();
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'EMPTY_NAME' using errcode = '22023';
  end if;

  insert into public.templates (id, name) values (v_id, v_name);
  -- Новий шаблон одразу має незбережені зміни: адміністратор бачить «Unpublished changes», менеджер — нічого.
  insert into public.template_drafts (template_id, content, updated_by)
  values (v_id, jsonb_build_object('sections', '[]'::jsonb), v_uid);
  return v_id;
end;
$$;

-- AC-EDITOR-01, AC-EDITOR-08: автозбереження — заміна незбережених змін нормалізованим змістом.
create or replace function private.save_template_draft(p_template_id uuid, p_content jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_content jsonb;
begin
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.templates as t where t.id = p_template_id) then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_content := private.normalize_template_content(p_content);
  insert into public.template_drafts (template_id, content, updated_at, updated_by)
  values (p_template_id, v_content, now(), v_uid)
  on conflict (template_id) do update
    set content = excluded.content, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$$;

-- AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-08: збереження — нова версія з незбережених змін.
create or replace function private.publish_template_version(p_template_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_current integer;
  v_content jsonb;
  v_next integer;
begin
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- Блокуємо шаблон: два збереження одночасно не отримають однаковий номер версії.
  select t.current_version into v_current from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select d.content into v_content from public.template_drafts as d where d.template_id = p_template_id;
  -- Немає незбережених змін — нічого не зберігаємо (solomchaak/property-workflows-spec#22).
  if v_content is null then
    return v_current;
  end if;

  -- AC-EDITOR-04: без жодної обов'язкової задачі версію не створюємо; незбережені зміни лишаються.
  if not exists (
    select 1
    from jsonb_array_elements(v_content -> 'sections') as s(section)
    cross join lateral jsonb_array_elements(s.section -> 'tasks') as t(task)
    where (t.task ->> 'required')::boolean
  ) then
    raise exception 'NO_REQUIRED_TASK' using errcode = '22023';
  end if;

  -- Номери не повторюються: версії не видаляються, наступний = максимальний + 1.
  select coalesce(max(v.number), 0) + 1 into v_next
  from public.template_versions as v
  where v.template_id = p_template_id;

  insert into public.template_versions (template_id, number, content, created_by)
  values (p_template_id, v_next, v_content, v_uid);
  update public.templates set current_version = v_next, current_content = v_content where id = p_template_id;
  delete from public.template_drafts where template_id = p_template_id;
  return v_next;
end;
$$;

revoke execute on function
  private.create_template(text),
  private.save_template_draft(uuid, jsonb),
  private.publish_template_version(uuid)
from public, anon;
grant execute on function
  private.create_template(text),
  private.save_template_draft(uuid, jsonb),
  private.publish_template_version(uuid)
to authenticated;

-- Тонкі обгортки для Data API (схема private не відкрита): security invoker, права перевіряє функція private.
create or replace function public.create_template(p_name text)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$ select private.create_template(p_name) $$;

create or replace function public.save_template_draft(p_template_id uuid, p_content jsonb)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.save_template_draft(p_template_id, p_content) $$;

create or replace function public.publish_template_version(p_template_id uuid)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$ select private.publish_template_version(p_template_id) $$;

revoke execute on function
  public.create_template(text),
  public.save_template_draft(uuid, jsonb),
  public.publish_template_version(uuid)
from public, anon;
grant execute on function
  public.create_template(text),
  public.save_template_draft(uuid, jsonb),
  public.publish_template_version(uuid)
to authenticated;

-- ── R4. Запуск з поточної версії (AC-EDITOR-06; AC-RUN-01, AC-RUN-02, AC-RUN-12 — без змін) ──
-- Сигнатура та сама, тож create or replace зберігає гранти й обгортку public.launch_run.
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
  v_case_name text := btrim(coalesce(p_case_name, ''));
  v_assignments jsonb := coalesce(p_assignments, '{}'::jsonb);
begin
  if v_uid is null or (select private.current_app_role()) not in ('manager', 'admin') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if char_length(v_case_name) = 0 then
    raise exception 'EMPTY_CASE_NAME' using errcode = '22023';
  end if;
  if char_length(v_case_name) > 100 then
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
