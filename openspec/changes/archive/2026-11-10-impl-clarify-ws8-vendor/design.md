# Дизайн: уточнення зрізу 3 — вендор

Специфікація — `openspec/specs/vendor-access` (змінені AC-VENDOR-07, AC-VENDOR-08; нові AC-VENDOR-11…18) і
`openspec/specs/run-tasks` (AC-TASK-19). Рішення спираються на `design.md` зміни `impl-ws8-vendor` і ADR 0001 / 0002
(запис лише через функції бази) — без змін.

## Що вже є і не змінюється

| Правило | Де | AC |
|---|---|---|
| Вендор читає лише свої задачі запуску, і запитом напряму теж | політика `run_tasks_select_visible` | AC-VENDOR-17 |
| Вендор не читає профілів інших (email), `list_staff()` йому порожній, запуск без його задач не видно | `profiles_select_own_or_admin`, `private.staff()`, `private.can_see_run` | AC-VENDOR-18 |
| Позначка не перевіряє статусу запуску: необов'язкову задачу «to do» завершеного запуску можна позначити, тригер `refresh_run_status` лишає запуск «completed» (обов'язкових «to do» немає) | `private.mark_task_done`, `private.refresh_run_status` | AC-TASK-19, AC-VENDOR-16 |
| Підтвердження — лише для останньої обов'язкової: необов'язкова задача його не просить | `private.completes_run`, `needsConfirmation` | AC-TASK-19, AC-VENDOR-16 |
| Після входу без `next` — `/` → `/runs` | `src/app/login/actions.ts`, `src/app/page.tsx` | AC-VENDOR-13 |

Для AC-VENDOR-16, AC-VENDOR-17, AC-VENDOR-18 і AC-TASK-19 код уже є — потрібні тести з їхніми ID (D3).

## D1. Міграція `…_vendor_refusals.sql` (одна)

Нове визначення `private.mark_task_done(uuid)` — та сама перевірка прав, інші відмови:

1. Вендор, який не має жодної задачі в запуску цієї задачі (або задачі немає), — `raise exception 'Run not found'
   using errcode = 'P0002'`: про запуск, якого вендор не бачить, нічого не кажемо (AC-VENDOR-15; той самий текст, що
   на сторінці, AC-VENDOR-06).
2. Хто не виконавець, не менеджер запуску й не адміністратор — `raise exception 'Only the task''s assignee, the run
   manager, or an administrator can mark a task as done' using errcode = '42501'`: повідомлення AC-TASK-03 і в
   прямій відповіді Data API (AC-VENDOR-07). Код `42501` той самий, тож дія `markDone` і далі показує повідомлення
   AC-TASK-03 (`src/app/runs/messages.ts`).
3. Решта — як у `20261020124103_runs_complete_tasks.sql`: «done» → нічого; `to_do` → `done`.

`public.mark_task_done` (обгортка) не змінюється. SQL-мутанти V6 і V9 переходять на новий файл (мутуємо останнє
визначення); нові — на гілку «Run not found» вендора і на текст відмови (AC-VENDOR-15, AC-VENDOR-07).

## D2. Сторінки

1. `/runs/[id]` для вендора: заголовок — назва випадку (`run.case_name`) замість «Your tasks»; під ним — «Your tasks:
   N of K done» (уже показує `RunTasks`); статусу запуску, назви й версії шаблону немає (AC-VENDOR-11).
2. `/runs`: для вендора рядок без назви шаблону — `RunListItem.templateName` необов'язкове, сторінка не передає його
   вендору, `RunsTable` не показує порожнього рядка (AC-VENDOR-12). Статус і «Your tasks: N of K done» — як було.
3. Навігація (`SidebarNav`): пункт «Profile» (`/profile`) для всіх ролей — матриця прав: кожна роль бачить свій
   профіль; у вендора — лише «Runs» і «Profile» (AC-VENDOR-13). Сторінка `/profile` (новий `src/app/profile/`):
   `AppShell`, `PageHeader` «Profile», email і роль того, хто увійшов, — лише власний профіль, без запиту інших.
4. Відмова вендору на сторінках шаблонів — `NotEnoughRights` з «Back to runs» (`/runs`): список шаблонів
   (AC-VENDOR-08), сторінка шаблону, список версій, редактор, новий шаблон і форма запуску (AC-VENDOR-14). Помічник
   `refusalBack(actor)` у `src/components/not-enough-rights.tsx`: вендору — «Back to runs», іншим — «Back to templates»
   (AC-DSYS-02, AC-EDITOR-07 без змін). Роль перевіряємо до читання даних — вмісту шаблону немає.

## D3. Тести

- `tests/db/vendor.test.ts` (PGlite, `asUser`): AC-VENDOR-07 — повідомлення відмови й «to do»; AC-VENDOR-15 — «Run not
  found» і «to do»; AC-VENDOR-16 — необов'язкова задача вендора в завершеному запуску: «done», запуск «completed»,
  «1 of 1»; AC-TASK-19 — те саме для менеджера-виконавця, прогрес рахує задачу; AC-VENDOR-17 — `select` задач запуску
  віддає лише задачі 3 і 4; AC-VENDOR-18 — профілі, `list_staff()` і задачі «Apartment 14, repair» — порожньо.
- Рендер сторінок (`src/app/runs/vendor-pages.test.ts`): AC-VENDOR-11, AC-VENDOR-12, AC-VENDOR-08 («Back to runs»),
  AC-VENDOR-14 (чотири сторінки), AC-VENDOR-13 (пункти навігації вендора).
- UAT на проді (`tests/e2e/vendor-*.spec.ts`) — окремим PR після деплою: нові AC і змінені AC-VENDOR-07, AC-VENDOR-08.
