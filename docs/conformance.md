# Матриця відповідності (AC → код → тест → статус)

<!--
Ваша матриця: один рядок на кожен AC з openspec/specs/** — вашої специфікації, у яку ви перекладаєте вимоги PM
(їхній знімок у requirements/ приносить команда агента /requirements-sync).
Рядок «Вимоги» під цим коментарем заповнює лише /requirements-sync: адреса репо вимог PM, звідки взято вимоги (issues
або файли docs/), і дата знімка, через « · ». Руками його не змінюйте: з нього /requirements-sync знає, звідки брати
вимоги наступного разу, а скіли spec-clarify, spec-review і /conformance — куди ставити питання й яку версію вимог ви
реалізуєте. Рядків таблиці /requirements-sync не додає.
Рядки змінюєте ви:
  PR «Специфікація» — після archive зміни: рядок кожного нового AC зі статусом «відкладено (чекає реалізації)»; рядки AC,
                      прибраних зі специфікації (REMOVED), — видалити;
  PR «Реалізація»   — рядок AC задачі в тому самому PR, що й код і тест.
Перебудувати автоматично: /conformance (Claude Code, Cursor).
Перевірка в CI: npm run ac:coverage — падає, якщо
  NO-ROW     AC є в специфікації, а рядка немає (типово — PR «Специфікація» без нових рядків або рядок видалено);
  MISSING    статус «реалізовано», а непропущеного тесту, назва якого починається з цього AC ID, у файлах
             *.test.ts / *.test.tsx немає (*.spec.ts і допоміжні файли Vitest не запускає — вони не рахуються);
  ORPHAN     тест посилається на AC, якого немає в специфікації (AC прибрано або вимогу PM ще не перекладено);
  BAD-STATUS статус не «реалізовано» і не «відкладено (причина)»;
  WRONG-REF  шляху `src/…`/`tests/…`/`supabase/…` з колонок «Код»/«Тест» немає або тест із цим AC в іншому файлі;
і попереджає, не падаючи: AC з вимог PM (requirements/), якого ще немає в openspec/specs/, — «вимогу PM ще не перекладено
в специфікацію».

Приклад рядків (усередині коментаря — скрипт їх не читає):
| AC-LEAVE-02 | заявка на дві посади дає два записи main і additional | `src/app/requests/actions.ts` (createRequest) | `tests/requests.test.ts` | реалізовано |
| AC-LEAVE-04 | заблоковані дні не рахуються | — | — | відкладено (чекаю відповідь PM на Q2, <pm>/<team-slug>-spec#5) |
| AC-LEAVE-07 | менеджер бачить лише свій відділ | — | — | відкладено (рішення PM: поза зрізом 1, <pm>/<team-slug>-spec#8) |
| AC-LEAVE-10 | діапазон лише із заблокованих днів | — | — | відкладено (чекає реалізації) |
-->

Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-26

| AC | Що перевіряє | Код | Тест | Статус |
|---|---|---|---|---|
| AC-DSYS-01 | «in progress» — синій, «completed» — зелений, ті самі слова й колір у списку й на сторінці запуску, слово поруч із кольором | `src/lib/status.ts` (runStatusKind, statusView), `src/components/status-badge.tsx`, `src/app/runs/page.tsx`, `src/app/runs/[id]/page.tsx` | `src/components/design-system.test.ts` | реалізовано |
| AC-DSYS-02 | менеджер на редакторі — «Not enough rights» і «Back to templates», шаблон без змін | `src/app/templates/[id]/edit/page.tsx`, `src/components/not-enough-rights.tsx`, `supabase/migrations/20261026175944_templates_versions.sql` (template_drafts_select_admin, save_template_draft) | `tests/db/templates.test.ts` | реалізовано |
| AC-DSYS-03 | відвідувач без входу відкриває запуск — сторінка входу в AppShell, дані запуску не показано | `src/components/app-shell.tsx`, `src/app/login/page.tsx`, `src/lib/supabase/proxy.ts` (updateSession), `src/lib/auth/public-paths.ts`, `supabase/migrations/20261020123813_runs_launch.sql` (revoke from anon) | `src/lib/supabase/proxy.test.ts`, `src/components/design-system.test.ts` | реалізовано |
| AC-DSYS-04 | менеджер без запусків — «No runs yet. Launch a template to start one.» і «Launch a template», без таблиці | `src/lib/runs/list-view.ts` (runsListView), `src/components/empty-state.tsx`, `src/app/runs/page.tsx` | `src/components/design-system.test.ts` | реалізовано |
| AC-TASK-01 | виконавець позначає свою задачу виконаною — статус «done» | `src/lib/runs/rules.ts` (markTaskDone), `supabase/migrations/20261020124103_runs_complete_tasks.sql` (mark_task_done) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-02 | менеджер запуску позначає чужу задачу свого запуску — статус «done» | `src/lib/runs/rules.ts` (markTaskDone), `supabase/migrations/20261020124103_runs_complete_tasks.sql` (mark_task_done) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-07 | адміністратор позначає задачу чужого запуску — статус «done» | `src/lib/runs/rules.ts` (markTaskDone), `supabase/migrations/20261020124103_runs_complete_tasks.sql` (mark_task_done) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-03 | сторонній менеджер не може позначити задачу: лишається «to do» і повідомлення | `src/lib/runs/rules.ts` (markTaskDone), `supabase/migrations/20261020124103_runs_complete_tasks.sql` (mark_task_done) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-04 | остання обов'язкова задача «done» переводить запуск у «completed» | `src/lib/runs/rules.ts` (markTaskDone), `supabase/migrations/20261020124103_runs_complete_tasks.sql` (mark_task_done) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-05 | сторінка запуску показує прогрес «2 of 5 done» | `src/lib/runs/rules.ts` (progressLabel), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-08 | сторінка запуску показує статус кожної з 5 задач | `src/lib/runs/rules.ts` (taskStatusLabel), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-09 | список запусків менеджера показує прогрес «2 of 5 done» | `src/lib/runs/rules.ts` (progressLabel), `src/app/runs/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-06 | менеджер бачить лише свої запуски й запуски, де він виконавець | `src/lib/runs/rules.ts` (visibleRuns), `supabase/migrations/20261020123813_runs_launch.sql` (can_see_run) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-16 | скасування на підтвердженні — задача «to do», запуск «in progress» | `src/lib/runs/rules.ts` (markTaskDone, needsConfirmation), `src/app/runs/actions.ts` (markDone) | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-10 | чужий запуск за посиланням — «Run not found», без задач | `src/lib/runs/rules.ts` (MSG_RUN_NOT_FOUND), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-11 | біля кожної задачі — email виконавця, без імен і ролей | `src/lib/runs/rules.ts` (staffLabel), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-12 | задачі двома групами за секціями в порядку секцій | `src/lib/runs/rules.ts` (groupBySection), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-15 | позначка «required»/«optional» біля статусу: 3 і 2 | `src/lib/runs/rules.ts` (requiredLabel), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-18 | «Mark as done» лише на задачі менеджера C, не B | `src/lib/runs/rules.ts` (canMarkDone), `src/app/runs/[id]/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-13 | завершений запуск у списку: «completed» і «4 of 5 done» | `src/lib/runs/rules.ts` (runStatusLabel, progressLabel), `src/app/runs/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-14 | список від найновішого; випадок і шаблон у рядку | `src/lib/runs/rules.ts` (newestFirst), `src/app/runs/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-TASK-17 | виконавець бачить у списку прогрес «2 of 5 done» | `src/lib/runs/rules.ts` (progressLabel), `src/app/runs/page.tsx` | `src/lib/runs/tasks.test.ts` | реалізовано |
| AC-EDITOR-01 | зміни без збереження — незбережені зміни з 6 задачами, позначка «Unpublished changes», версія лишається 1 | `supabase/migrations/20261026175944_templates_versions.sql` (save_template_draft), `src/app/templates/[id]/edit/template-editor.tsx`, `src/app/templates/[id]/page.tsx` | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-02 | менеджер бачить версію 1 з 5 задачами без незбережених змін | `supabase/migrations/20261026175944_templates_versions.sql` (templates_select_visible, template_drafts_select_admin), `src/app/templates/[id]/page.tsx` | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-03 | збереження — версія 2 з 6 задачами поточна, незбережених змін немає | `supabase/migrations/20261026175944_templates_versions.sql` (publish_template_version), `src/app/templates/actions.ts` (publishVersion) | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-04 | шаблон без обов'язкової задачі — «A template needs at least one required task», версії немає, зміни лишаються | `supabase/migrations/20261026175944_templates_versions.sql` (publish_template_version), `src/lib/templates/content.ts` (hasRequiredTask), `src/lib/templates/errors.ts` | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-05 | список версій від новішої: «12.10.2026 14:05» за Києвом і email автора | `supabase/migrations/20261026175944_templates_versions.sql` (template_versions_select_admin), `src/app/templates/[id]/versions/page.tsx`, `src/lib/templates/format.ts` (formatKyivDateTime) | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-06 | запуск з версії 1 лишається на версії 1 з 5 задачами; «Template version 1» | `supabase/migrations/20261026175944_templates_versions.sql` (launch_run, runs.template_version), `src/app/runs/[id]/page.tsx`, `src/lib/templates/format.ts` (templateVersionLabel) | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-07 | менеджер не бачить версій — «Not enough rights» без версій | `supabase/migrations/20261026175944_templates_versions.sql` (template_versions_select_admin), `src/app/templates/[id]/versions/page.tsx`, `src/components/not-enough-rights.tsx` | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-08 | менеджер напряму не змінює шаблон і не зберігає версію — версія 1, 5 задач, без незбережених змін | `supabase/migrations/20261026175944_templates_versions.sql` (save_template_draft, publish_template_version, без грантів на запис), `src/app/templates/actions.ts` | `tests/db/templates.test.ts` | реалізовано |
| AC-EDITOR-09 | відвідувач без входу — сторінка входу, вміст шаблону не читається | `supabase/migrations/20261026175944_templates_versions.sql` (revoke from anon), `src/lib/auth/public-paths.ts`, `src/lib/auth/actor.ts` (requireActor) | `tests/db/templates.test.ts` | реалізовано |
| AC-RUN-01 | запуск шаблону створює один запуск «in progress» з усіма 5 задачами «to do» | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-02 | зміна шаблону після запуску не змінює задачі й назви в запуску | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-03 | порожня назва чи назва з пробілів — запуску немає, «Enter a case name» | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-07 | назва з 101 символу — запуску немає, «Case name must be at most 100 characters» | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-05 | адміністратор запускає шаблон і стає менеджером запуску | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-06 | менеджер запускає шаблон і стає менеджером запуску | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-04 | дві задачі призначено менеджеру B, решта три — менеджеру A | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-08 | менеджер без призначень — виконавець усіх 5 задач | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-09 | адміністратор без призначень — виконавець усіх 5 задач | `src/lib/runs/rules.ts` (planRun), `supabase/migrations/20261020123813_runs_launch.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-11 | пробіл перед назвою зі 100 символів — запуск, назва без пробілу | `src/lib/runs/rules.ts` (validateCaseName), `supabase/migrations/20261021071209_runs_clarifications.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-10 | вибір виконавця — лише email, без імен і ролей | `src/lib/runs/rules.ts` (staffLabel), `src/app/runs/new/page.tsx`, `supabase/migrations/20261021071209_runs_clarifications.sql` (list_staff) | `src/lib/runs/launch.test.ts` | реалізовано |
| AC-RUN-12 | зміна секцій шаблону не змінює секції запуску | `src/lib/runs/rules.ts` (groupBySection), `supabase/migrations/20261021071209_runs_clarifications.sql` (launch_run) | `src/lib/runs/launch.test.ts` | реалізовано |
