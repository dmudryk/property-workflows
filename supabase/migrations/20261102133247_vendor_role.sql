-- Зріз 3: вендор (openspec/specs/vendor-access, AC-VENDOR-01…10; план openspec/changes/impl-ws8-vendor/design.md, D1).
-- Уже без змін: вендор бачить лише запуски, де він виконавець (private.can_see_run), позначає лише свої задачі
-- (private.mark_task_done), не запускає шаблон (private.launch_run) і не бачить шаблонів (політики templates_* /
-- template_*). Тут — роль, вендор як виконавець, «лише свої задачі» в запуску й підтвердження останньої обов'язкової.

-- ── 1. Роль vendor (порядок — заголовок 20261012000000_profiles_and_roles.sql) ──
alter table public.profiles drop constraint profiles_role_check;
-- Дані: наявних ролей не змінюємо (manager / admin лишаються як є).
alter table public.profiles alter column role set default 'manager';
alter table public.profiles add constraint profiles_role_check check (role in ('manager', 'admin', 'vendor'));

-- ── 2. Хто може бути виконавцем задачі: менеджер, адміністратор або вендор (AC-VENDOR-01; AC-RUN-04) ──
-- Єдине використання — перевірка виконавців у private.launch_run.
create or replace function private.is_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as p
    where p.id = p_user_id and p.role in ('manager', 'admin', 'vendor')
  );
$$;

-- ── 3. Вибір виконавця й email біля задач: менеджери, адміністратори й вендори (AC-VENDOR-02) ──
-- Викликати може лише менеджер чи адміністратор: вендору — порожньо, email інших користувачів він не бачить
-- (AC-VENDOR-04; матриця прав).
create or replace function private.staff()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.email
  from public.profiles as p
  where p.role in ('manager', 'admin', 'vendor')
    and (select private.current_app_role()) in ('manager', 'admin')
  order by p.email;
$$;

-- ── 4. Вендор читає лише свої задачі запуску — і на сторінках, і запитом напряму (AC-VENDOR-04; AC-TASK-08) ──
drop policy run_tasks_select_visible on public.run_tasks;
create policy run_tasks_select_visible on public.run_tasks
  for select to authenticated
  using (
    (select private.can_see_run(run_id))
    and ((select private.current_app_role()) is distinct from 'vendor' or assignee_id = (select auth.uid()))
  );

-- ── 5. Чи завершить позначка цієї задачі запуск (підтвердження «This cannot be undone»; AC-VENDOR-05) ──
-- Вендор бачить лише свої задачі й сам не вирішить, чи його задача — остання обов'язкова «to do» у запуску.
-- Для задачі, якої користувач не може позначити (не виконавець, не менеджер запуску, не адміністратор), — false.
create or replace function private.completes_run(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select t.required
      and t.status = 'to_do'
      and not exists (
        select 1 from public.run_tasks as o
        where o.run_id = t.run_id and o.id <> t.id and o.required and o.status = 'to_do'
      )
    from public.run_tasks as t
    join public.runs as r on r.id = t.run_id
    where t.id = p_task_id
      and (select auth.uid()) is not null
      and (
        t.assignee_id = (select auth.uid())
        or r.manager_id = (select auth.uid())
        or (select private.current_app_role()) = 'admin'
      )
  ), false);
$$;

revoke execute on function private.completes_run(uuid) from public, anon;
grant execute on function private.completes_run(uuid) to authenticated;

-- Обгортка для Data API (схема private не відкрита).
create or replace function public.completes_run(p_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.completes_run(p_task_id);
$$;

revoke execute on function public.completes_run(uuid) from public, anon;
grant execute on function public.completes_run(uuid) to authenticated;
