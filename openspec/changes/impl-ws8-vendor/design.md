# Дизайн: вендор (зріз 3)

Специфікація — `openspec/specs/vendor-access` (AC-VENDOR-01…10) і змінені вимоги `workflow-runs` / `run-tasks`.
Рішення спираються на ADR 0001 / 0002 (запис лише через функції бази) і ADR 0003 (тема) — без змін.

## Що вже є і не змінюється

| Правило | Де | AC |
|---|---|---|
| Вендор бачить запуск, лише якщо він виконавець хоча б однієї задачі (менеджером запуску вендор не буває) | `private.can_see_run` — гілка «виконавець» | AC-VENDOR-03, AC-VENDOR-06, AC-VENDOR-10 |
| Вендор позначає лише задачі, де він виконавець | `private.mark_task_done` (виконавець / менеджер запуску / адміністратор) | AC-VENDOR-05, AC-VENDOR-07 |
| Вендор не запускає шаблон | `private.launch_run`: роль не `manager` / `admin` → `NOT_ALLOWED` | AC-VENDOR-09 |
| Вендор не бачить шаблонів, секцій, задач, версій і незбережених змін | політики `templates_select_visible`, `template_sections/tasks_select_staff`, `template_versions/drafts_select_admin` | AC-VENDOR-08 |
| Вендор бачить лише власний профіль | `profiles_select_own_or_admin` | матриця прав |

## D1. Міграція `…_vendor_role.sql` (одна)

1. Роль `vendor` у `profiles.role` — порядок з `20261012000000_profiles_and_roles.sql`: зняти `profiles_role_check` →
   оновити дані (наявних ролей не змінюємо) → `default 'manager'` колонки `role` (без змін, заново явно) → новий
   `profiles_role_check check (role in ('manager', 'admin', 'vendor'))`.
2. `private.is_staff(uuid)` — «може бути виконавцем»: `role in ('manager', 'admin', 'vendor')`; єдине місце
   використання — перевірка виконавців у `private.launch_run` (AC-VENDOR-01, змінена вимога AC-RUN-04).
3. `private.staff()` (і `public.list_staff()`) — вибір виконавця й email біля задач: користувачі з роллю `manager`,
   `admin` або `vendor`; викликати може лише `manager` / `admin` — вендору функція повертає порожньо (AC-VENDOR-02;
   AC-VENDOR-04 «без email інших користувачів»).
4. Політика `run_tasks_select_visible` → `can_see_run(run_id) and (current_app_role() <> 'vendor' or assignee_id =
   auth.uid())`: вендор читає лише свої задачі запуску — і на сторінці, і запитом напряму; прогрес усього запуску з
   даних вендору не обчислити (AC-VENDOR-04, змінена вимога AC-TASK-08; «Your tasks: N of K done» — AC-VENDOR-03).
5. `private.completes_run(p_task_id uuid) returns boolean` (security definer) + `public.completes_run` (security
   invoker): чи стане запуск «completed» після позначки цієї задачі (обов'язкова, «to do», інших обов'язкових «to do» у
   запуску немає). Для задачі, якої користувач не може позначити, — `false`. Потрібна вендору, бо він бачить лише свої
   задачі й не може сам вирішити, чи це остання обов'язкова (припущення PM: підтвердження «This cannot be undone» і для
   вендора; AC-VENDOR-05 — задача не остання, підтвердження немає).

`runs` вендор читає повністю (`template_version`, `manager_id` — без email): сторінка цих полів вендору не показує.
Розділити `runs` по колонках для однієї ролі — окрема зміна, якщо PM попросить (матриця прав: «See which template
version a run follows — vendor: —»).

## D2. TypeScript

- `Role` (`src/lib/runs/rules.ts`) — `"manager" | "admin" | "vendor"`; `requireActor` приймає `vendor`.
- `isVendor(actor)` у `src/lib/auth/roles.ts`; `canLaunch(actor)` — `manager` / `admin` (матриця прав).
- `src/lib/runs/list-view.ts`: тексти вендора — `MSG_NO_TASKS_YET = "No tasks assigned to you yet."`,
  `yourTasksLabel(tasks)` → «Your tasks: N of K done» (AC-VENDOR-03, AC-VENDOR-05, AC-VENDOR-10).

## D3. Сторінки

| Сторінка | Вендор бачить | AC |
|---|---|---|
| `/runs` | рядок: випадок, шаблон, статус запуску, «Your tasks: N of K done»; без кнопки «Launch a template»; порожньо — «No tasks assigned to you yet.» без посилання й таблиці | AC-VENDOR-03, AC-VENDOR-10 |
| `/runs/[id]` | «Back to runs», «Your tasks: N of K done», свої задачі за секціями: назва, «required» / «optional», статус, «Mark as done»; без шаблону, версії, менеджера запуску, email і прогресу «N of M done»; чужий запуск — «Run not found» | AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06 |
| `/templates`, `/templates/[id]`, `/templates/[id]/versions`, `/templates/[id]/edit`, `/templates/new` | «Not enough rights» і «Back to templates» у тій самій розкладці, без даних | AC-VENDOR-08 |
| `/runs/new` | «Not enough rights» (вендор не запускає шаблонів — матриця прав) | AC-VENDOR-09 (сторінкою) |
| `AppShell` | навігація без «Templates» (DESIGN.md: дію, якої роль не має, не показуємо; відкрите Q2), роль «vendor» у картці | — |

Підтвердження останньої обов'язкової задачі: для вендора рішення дає `completes_run` (D1.5) — на сторінці
(`?confirm=`), у дії `markDone` і для оптимістичної позначки.

## D4. Дані й тести

- `supabase/demo-users.json` — `vendor@example.test` (роль `vendor`; індекс у кінці списку — id наявних тестових
  користувачів PGlite не зсуваються); на проді — `npm run users:demo` (розробник).
- Тест бази `tests/db/vendor.test.ts` (PGlite, `asUser` вендора, без моків `rpc`): AC-VENDOR-01, 02, 03, 04, 05, 06,
  07, 08, 09, 10 — правило в SQL доводить база.
- Unit / рендер сторінок (`src/…/*.test.ts`): тексти й стани вендора (AC-VENDOR-03, 04, 08, 10).
- E2E на проді (UAT) — після розгортання, окремо.
