-- Зріз 4 (WS10): значення з документа, які людина підтвердила в запуску (openspec/specs/document-parsing,
-- AC-DOCAI-09, AC-DOCAI-11; impl-ws10-docai/design.md, D3, D4). AI сюди не пише: функцію save_run_document викликає
-- лише Server Action «Save values» після дії людини. Запис — лише функцією private (ADR 0001).

-- ── Хто керує запуском: адміністратор або менеджер запуску ──────────────────────────────────────────────────
-- security definer читає runs в обхід RLS (ADR 0005 закрив таблицю runs вендору), тож політики не зациклюються.
-- Та сама межа, що в матриці прав PM для змін у запуску («all tasks of their own runs» / «all tasks in all runs»).
create or replace function private.can_manage_run(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.runs as r
    where r.id = p_run_id
      and (
        (select private.current_app_role()) = 'admin'
        or (r.manager_id = (select auth.uid()) and (select private.current_app_role()) = 'manager')
      )
  );
$$;

revoke execute on function private.can_manage_run(uuid) from public, anon;
grant execute on function private.can_manage_run(uuid) to authenticated;

-- ── Таблиця ──────────────────────────────────────────────────────────────────────────────────────────────
create table public.run_documents (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  kind text not null,
  phone text,
  description text,
  category text,
  urgency text,
  -- Позиції кошторису: [{"description": text, "quantity": number > 0, "unit_price": number >= 0}].
  line_items jsonb not null default '[]'::jsonb,
  stated_total numeric(12, 2),
  notes text[] not null default '{}',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint run_documents_kind_check check (kind in ('request', 'estimate')),
  -- Переліки — з правил golden cases PM (solomchaak/property-workflows-spec#40).
  constraint run_documents_category_check check (
    category is null
    or category in ('plumbing', 'electrical', 'heating and cooling', 'appliance', 'structure and doors', 'other')
  ),
  constraint run_documents_urgency_check check (urgency is null or urgency in ('urgent', 'not urgent')),
  constraint run_documents_phone_length check (phone is null or char_length(phone) between 1 and 40),
  constraint run_documents_description_length check (description is null or char_length(description) between 1 and 500),
  constraint run_documents_line_items_shape check (
    jsonb_typeof(line_items) = 'array' and jsonb_array_length(line_items) <= 50
  ),
  constraint run_documents_stated_total_check check (stated_total is null or stated_total >= 0),
  constraint run_documents_notes_count check (cardinality(notes) <= 6)
);

create index run_documents_run_id_idx on public.run_documents (run_id, created_at);

-- ── Права: читання — менеджеру запуску й адміністратору; запису напряму немає (ADR 0001) ─────────────────────
alter table public.run_documents enable row level security;
revoke all on table public.run_documents from anon, authenticated;
grant select on table public.run_documents to authenticated;
grant select, insert, update, delete on table public.run_documents to service_role;

create policy run_documents_select_manager_admin
  on public.run_documents
  for select
  to authenticated
  using ((select private.can_manage_run(run_id)));

-- ── Запис: лише після дії людини, лише менеджер запуску чи адміністратор (AC-DOCAI-09, AC-DOCAI-11) ──────────
create or replace function private.save_run_document(
  p_run_id uuid,
  p_kind text,
  p_phone text,
  p_description text,
  p_category text,
  p_urgency text,
  p_line_items jsonb,
  p_stated_total numeric,
  p_notes text[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item jsonb;
  v_id uuid;
begin
  -- Виконавець, вендор, сторонній менеджер чи неіснуючий запуск — однакова відмова, нічого не записано.
  if v_uid is null or not (select private.can_manage_run(p_run_id)) then
    raise exception 'Not enough rights' using errcode = '42501';
  end if;

  if p_line_items is null or jsonb_typeof(p_line_items) <> 'array' then
    raise exception 'Line items must be a list' using errcode = '22023';
  end if;

  -- coalesce: jsonb_typeof(null) = null, і без нього пропущене поле пройшло б перевірку.
  for v_item in select value from jsonb_array_elements(p_line_items) loop
    if coalesce(jsonb_typeof(v_item -> 'description'), '') <> 'string'
      or char_length(btrim(v_item ->> 'description')) not between 1 and 200
      or coalesce(jsonb_typeof(v_item -> 'quantity'), '') <> 'number'
      or (v_item ->> 'quantity')::numeric <= 0
      or coalesce(jsonb_typeof(v_item -> 'unit_price'), '') <> 'number'
      or (v_item ->> 'unit_price')::numeric < 0
    then
      raise exception 'Each line item needs a description, a quantity above 0 and a unit price of 0 or more'
        using errcode = '22023';
    end if;
  end loop;

  insert into public.run_documents (
    run_id, kind, phone, description, category, urgency, line_items, stated_total, notes, created_by
  )
  values (
    p_run_id,
    p_kind,
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_description), ''),
    p_category,
    p_urgency,
    p_line_items,
    p_stated_total,
    coalesce(p_notes, '{}'),
    v_uid
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function private.save_run_document(uuid, text, text, text, text, text, jsonb, numeric, text[])
  from public, anon;
grant execute on function private.save_run_document(uuid, text, text, text, text, text, jsonb, numeric, text[])
  to authenticated;

-- Обгортка для Data API (схема private не відкрита).
create or replace function public.save_run_document(
  p_run_id uuid,
  p_kind text,
  p_phone text,
  p_description text,
  p_category text,
  p_urgency text,
  p_line_items jsonb,
  p_stated_total numeric,
  p_notes text[]
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.save_run_document(
    p_run_id, p_kind, p_phone, p_description, p_category, p_urgency, p_line_items, p_stated_total, p_notes
  );
$$;

revoke execute on function public.save_run_document(uuid, text, text, text, text, text, jsonb, numeric, text[])
  from public, anon;
grant execute on function public.save_run_document(uuid, text, text, text, text, text, jsonb, numeric, text[])
  to authenticated;
