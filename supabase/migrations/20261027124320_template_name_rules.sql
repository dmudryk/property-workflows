-- Зріз WS7, уточнення PM від 27.10 (openspec/specs/template-editor; AC-EDITOR-15, 19…24): назва шаблону належить версії
-- й унікальна, порожні назви й секції без задач відхиляє збереження, а не автозбереження.
-- План: openspec/changes/impl-ws7-clarifications/design.md (R1–R4). Таблиць, політик і грантів не додаємо: функції —
-- create or replace з тими самими сигнатурами, тож гранти й обгортки public.* лишаються (ADR 0001, ADR 0002).
-- Назви обрізаються з обох боків від пробілів, табуляцій, переносів рядка, NBSP і BOM — як trim() у JS сторінок,
-- навіть коли функцію викликають напряму (за замовчуванням btrim прибирає лише пробіл); набір символів — у кожному
-- виклику btrim нижче й в індексі templates_name_key.

-- ── R3. Унікальна назва без урахування регістру й пробілів на початку й у кінці (AC-EDITOR-23, AC-EDITOR-24) ──
-- Явні перевірки у функціях дають повідомлення; індекс захищає від одночасних створень і збережень.
create unique index templates_name_key on public.templates (lower(btrim(name, E' \t\n\r\f\u000b\u00a0\ufeff')));

-- ── R1. Нормалізація незбережених змін: необов'язкова назва шаблону; порожні назви секцій і задач лишаються ──
-- Порожня назва — незбережена зміна, яку відхиляє збереження версії (AC-EDITOR-20), тож автозбереження її не відкидає.
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
  v_id uuid;
  v_ids uuid[] := '{}';
  v_result jsonb;
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object'
     or jsonb_typeof(p_content -> 'sections') is distinct from 'array'
     or (p_content ? 'name' and jsonb_typeof(p_content -> 'name') <> 'string') then
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
      v_id := (v_task ->> 'id')::uuid;
      if v_id is null or v_id = any (v_ids) then
        raise exception 'INVALID_CONTENT' using errcode = '22023';
      end if;
      v_ids := v_ids || v_id;
      v_tasks := v_tasks || jsonb_build_array(jsonb_build_object(
        'id', v_id,
        'name', btrim(coalesce(v_task ->> 'name', ''), E' \t\n\r\f\u000b\u00a0\ufeff'),
        'required', (v_task -> 'required')::boolean
      ));
    end loop;
    v_id := (v_section ->> 'id')::uuid;
    if v_id is null or v_id = any (v_ids) then
      raise exception 'INVALID_CONTENT' using errcode = '22023';
    end if;
    v_ids := v_ids || v_id;
    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'id', v_id,
      'name', btrim(coalesce(v_section ->> 'name', ''), E' \t\n\r\f\u000b\u00a0\ufeff'),
      'tasks', v_tasks
    ));
  end loop;

  v_result := jsonb_build_object('sections', v_sections);
  if p_content ? 'name' then
    v_result := v_result || jsonb_build_object('name', btrim(p_content ->> 'name', E' \t\n\r\f\u000b\u00a0\ufeff'));
  end if;
  return v_result;
end;
$$;

-- ── R3. Створення: порожня назва — «Enter a template name» (AC-EDITOR-19), зайнята — NAME_TAKEN (AC-EDITOR-23) ──
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
  v_name text := btrim(coalesce(p_name, ''), E' \t\n\r\f\u000b\u00a0\ufeff');
begin
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'EMPTY_TEMPLATE_NAME' using errcode = '22023';
  end if;
  if exists (select 1 from public.templates as t where lower(btrim(t.name, E' \t\n\r\f\u000b\u00a0\ufeff')) = lower(v_name)) then
    raise exception 'NAME_TAKEN' using errcode = '23505';
  end if;

  insert into public.templates (id, name) values (v_id, v_name);
  -- Новий шаблон одразу має незбережені зміни: адміністратор бачить «Unpublished changes», менеджер — нічого.
  insert into public.template_drafts (template_id, content, updated_by)
  values (v_id, jsonb_build_object('name', v_name, 'sections', '[]'::jsonb), v_uid);
  return v_id;
end;
$$;

-- ── R1, R2. Збереження версії: назва з незбережених змін і перевірки по черзі (AC-EDITOR-04, 12, 15, 20, 21, 24) ──
-- Будь-яка відмова — виняток: транзакція відкочується, версії немає, незбережені зміни лишаються.
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
  v_current_name text;
  v_content jsonb;
  v_name text;
  v_next integer;
begin
  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  -- Блокуємо шаблон: два збереження одночасно не отримають однаковий номер версії.
  select t.current_version, t.name into v_current, v_current_name
  from public.templates as t where t.id = p_template_id for update;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Блокуємо й рядок незбережених змін: паралельне автозбереження дочекається кінця публікації.
  select d.content into v_content from public.template_drafts as d where d.template_id = p_template_id for update;
  -- AC-EDITOR-12: немає незбережених змін — нової версії немає, поточна лишається.
  if v_content is null then
    return v_current;
  end if;

  -- AC-EDITOR-19, AC-EDITOR-21: назва — з незбережених змін (перейменування), інакше — поточна.
  v_name := btrim(coalesce(v_content ->> 'name', v_current_name), E' \t\n\r\f\u000b\u00a0\ufeff');
  if v_name = '' then
    raise exception 'EMPTY_TEMPLATE_NAME' using errcode = '22023';
  end if;
  -- AC-EDITOR-24: назва іншого шаблону без урахування регістру й пробілів.
  if exists (
    select 1 from public.templates as t
    where t.id <> p_template_id and lower(btrim(t.name, E' \t\n\r\f\u000b\u00a0\ufeff')) = lower(v_name)
  ) then
    raise exception 'NAME_TAKEN' using errcode = '23505';
  end if;

  -- AC-EDITOR-20: у секції й задачі має бути назва (лише пробіли — порожня; нормалізація вже обрізала).
  if exists (
    select 1 from jsonb_array_elements(v_content -> 'sections') as s(section)
    where s.section ->> 'name' = ''
       or exists (select 1 from jsonb_array_elements(s.section -> 'tasks') as t(task) where t.task ->> 'name' = '')
  ) then
    raise exception 'EMPTY_NAME' using errcode = '22023';
  end if;

  -- AC-EDITOR-15: у кожній секції — хоча б одна задача.
  if exists (
    select 1 from jsonb_array_elements(v_content -> 'sections') as s(section)
    where jsonb_array_length(s.section -> 'tasks') = 0
  ) then
    raise exception 'EMPTY_SECTION' using errcode = '22023';
  end if;

  -- AC-EDITOR-04: хоча б одна обов'язкова задача.
  if not exists (
    select 1
    from jsonb_array_elements(v_content -> 'sections') as s(section)
    cross join lateral jsonb_array_elements(s.section -> 'tasks') as t(task)
    where (t.task ->> 'required')::boolean
  ) then
    raise exception 'NO_REQUIRED_TASK' using errcode = '22023';
  end if;

  v_content := v_content || jsonb_build_object('name', v_name);

  -- Номери не повторюються: версії не видаляються, наступний = максимальний + 1.
  select coalesce(max(v.number), 0) + 1 into v_next
  from public.template_versions as v
  where v.template_id = p_template_id;

  insert into public.template_versions (template_id, number, content, created_by)
  values (p_template_id, v_next, v_content, v_uid);
  -- AC-EDITOR-21, AC-EDITOR-22: назва шаблону — назва поточної версії; launch_run копіює її в запуск.
  update public.templates
  set name = v_name, current_version = v_next, current_content = v_content
  where id = p_template_id;
  delete from public.template_drafts where template_id = p_template_id;
  return v_next;
end;
$$;

-- ── R4. Версія 1 перенесених шаблонів — «збережена адміністратором, який підготував шаблон» ──
-- (припущення PM, solomchaak/property-workflows-spec#33). Готує початкові дані перший адміністратор; у свіжій базі
-- профілів ще немає — автор лишається порожнім.
update public.template_versions as v
set created_by = (
  select p.id from public.profiles as p where p.role = 'admin' order by p.created_at, p.id limit 1
)
where v.created_by is null and v.number = 1;
