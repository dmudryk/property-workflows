// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — демо-репо курсу, scripts/mutants.mjs (тег ws8-02-tests); там 11 SQL- і 2 TS-мутанти.
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
//
// Гарнес PGlite у репо свій (tests/db/supabase-pglite.ts), тож P1/P2 і profiles-db.test.ts з materials/ не беремо.
// Мутанти — на правила в SQL за AC-DSYS-02 (менеджер відкриває редактор: шаблон лишається на версії 1 без
// незбережених змін). AC-DSYS-04 і AC-DSYS-08 правил у SQL не мають (TS і сторінка — Stryker і e2e).
// Зріз 3 (WS9, openspec/specs/vendor-access): V1–V10 — кожне правило вендора, що живе в SQL; мутуємо ОСТАННЄ
// визначення функції чи політики (launch_run — 20261026175944_templates_versions.sql, can_see_run — міграція WS6 без
// пізніших змін, mark_task_done — 20261110121936_vendor_run_not_found_status.sql). Доводить їх лише тест бази
// tests/db/vendor.test.ts (V14 — і tests/db/run-tasks.test.ts).
const PROFILES = "supabase/migrations/20261012000000_profiles_and_roles.sql";
const RUNS = "supabase/migrations/20261020123813_runs_launch.sql";
const TEMPLATES = "supabase/migrations/20261026175944_templates_versions.sql";
const VENDOR = "supabase/migrations/20261102133247_vendor_role.sql";
// Останнє визначення private.mark_task_done — уточнення зрізу 3 (WS9, AC-VENDOR-07, AC-VENDOR-15): V6, V9, V12…V14.
const REFUSALS = "supabase/migrations/20261110121936_vendor_run_not_found_status.sql";
const TEMPLATES_DB = "tests/db/templates.test.ts";
const VENDOR_DB = "tests/db/vendor.test.ts";
const RUN_TASKS_DB = "tests/db/run-tasks.test.ts";

export const mutants = [
  {
    id: "D1", kind: "sql", ac: "AC-DSYS-02", file: TEMPLATES, tests: [TEMPLATES_DB],
    what: "save_template_draft: прибрано перевірку ролі — менеджер записує незбережені зміни",
    find: "  v_content jsonb;\nbegin\n  if v_uid is null or (select private.current_app_role()) is distinct from 'admin' then",
    replace: "  v_content jsonb;\nbegin\n  if v_uid is null then",
  },
  {
    id: "D2", kind: "sql", ac: "AC-DSYS-02", file: TEMPLATES, tests: [TEMPLATES_DB],
    what: "template_drafts: політика select послаблена до true — менеджер бачить незбережені зміни",
    find: "create policy template_drafts_select_admin on public.template_drafts\n  for select to authenticated\n  using ((select private.current_app_role()) = 'admin');",
    replace: "create policy template_drafts_select_admin on public.template_drafts\n  for select to authenticated\n  using (true);",
  },
  {
    id: "V1", kind: "sql", ac: "AC-VENDOR-01", file: VENDOR, tests: [VENDOR_DB],
    what: "is_staff: вендора прибрано з тих, хто може бути виконавцем — запуск з вендором на задачах 3 і 4 відхилено",
    find: "where p.id = p_user_id and p.role in ('manager', 'admin', 'vendor')",
    replace: "where p.id = p_user_id and p.role in ('manager', 'admin')",
  },
  {
    id: "V2", kind: "sql", ac: "AC-VENDOR-02", file: VENDOR, tests: [VENDOR_DB],
    what: "staff(): вендорів прибрано з вибору виконавця — менеджер A не бачить email V",
    find: "  where p.role in ('manager', 'admin', 'vendor')\n    and (select private.current_app_role()) in ('manager', 'admin')",
    replace: "  where p.role in ('manager', 'admin')\n    and (select private.current_app_role()) in ('manager', 'admin')",
  },
  {
    id: "V3", kind: "sql", ac: "AC-VENDOR-04", file: VENDOR, tests: [VENDOR_DB],
    what: "staff(): прибрано перевірку того, хто викликає, — вендор отримує email інших користувачів",
    find: "\n    and (select private.current_app_role()) in ('manager', 'admin')\n  order by p.email;",
    replace: "\n  order by p.email;",
  },
  {
    id: "V4", kind: "sql", ac: "AC-VENDOR-04, AC-VENDOR-03", file: VENDOR, tests: [VENDOR_DB],
    what: "run_tasks_select_visible: прибрано умову «вендор — лише свої задачі» — вендор бачить усі 5 задач запуску",
    find: "    (select private.can_see_run(run_id))\n    and ((select private.current_app_role()) is distinct from 'vendor' or assignee_id = (select auth.uid()))\n",
    replace: "    (select private.can_see_run(run_id))\n",
  },
  {
    id: "V5", kind: "sql", ac: "AC-VENDOR-06, AC-VENDOR-10", file: RUNS, tests: [VENDOR_DB],
    what: "can_see_run: прибрано умову «виконавець — саме цей користувач» — вендор бачить чужий запуск «Apartment 14, repair»",
    find: "where t.run_id = r.id and t.assignee_id = (select auth.uid())",
    replace: "where t.run_id = r.id",
  },
  {
    id: "V6", kind: "sql", ac: "AC-VENDOR-07", file: REFUSALS, tests: [VENDOR_DB],
    what: "mark_task_done: прибрано перевірку прав — вендор напряму позначає задачу 1 менеджера A",
    find: "    or not (\n      v_task.assignee_id = v_uid\n      or v_task.manager_id = v_uid\n      or (select private.current_app_role()) = 'admin'\n    )\n",
    replace: "",
  },
  {
    id: "V7", kind: "sql", ac: "AC-VENDOR-08", file: TEMPLATES, tests: [VENDOR_DB],
    what: "templates_select_visible: вендору дозволено те саме, що менеджеру, — вендор бачить збережені шаблони",
    find: "or ((select private.current_app_role()) = 'manager' and current_version is not null)",
    replace: "or ((select private.current_app_role()) in ('manager', 'vendor') and current_version is not null)",
  },
  {
    id: "V8", kind: "sql", ac: "AC-VENDOR-09", file: TEMPLATES, tests: [VENDOR_DB],
    what: "launch_run: прибрано перевірку ролі — вендор напряму запускає «Tenant move-in»",
    find: "  v_assignments jsonb := coalesce(p_assignments, '{}'::jsonb);\nbegin\n  if v_uid is null or (select private.current_app_role()) not in ('manager', 'admin') then",
    replace: "  v_assignments jsonb := coalesce(p_assignments, '{}'::jsonb);\nbegin\n  if v_uid is null then",
  },
  {
    id: "V9", kind: "sql", ac: "AC-VENDOR-05", file: REFUSALS, tests: [VENDOR_DB],
    what: "mark_task_done: виконавець не може позначити свою задачу — лише менеджер запуску чи адміністратор",
    find: "      v_task.assignee_id = v_uid\n      or v_task.manager_id = v_uid",
    replace: "      v_task.manager_id = v_uid",
  },
  {
    id: "V10", kind: "sql", ac: "AC-VENDOR-04", file: PROFILES, tests: [VENDOR_DB],
    what: "profiles_select_own_or_admin: вендор читає профілі (email) усіх користувачів",
    find: "    id = (select auth.uid())\n    or (select private.current_app_role()) = 'admin'\n  );",
    replace: "    id = (select auth.uid())\n    or (select private.current_app_role()) in ('admin', 'vendor')\n  );",
  },
  {
    id: "V11", kind: "sql", ac: "AC-VENDOR-07", file: VENDOR, tests: [VENDOR_DB],
    what: "completes_run: прибрано перевірку «виконавець, менеджер запуску чи адміністратор» — вендор дізнається стан чужої обов'язкової задачі",
    find: "      and (\n        t.assignee_id = (select auth.uid())\n        or r.manager_id = (select auth.uid())\n        or (select private.current_app_role()) = 'admin'\n      )\n",
    replace: "",
  },
  {
    id: "V12", kind: "sql", ac: "AC-VENDOR-15", file: REFUSALS, tests: [VENDOR_DB],
    what: "mark_task_done: прибрано «Run not found» для вендора без задач у запуску — відповідь каже, що запуск і задача існують",
    find: "    raise exception 'Run not found' using errcode = 'PT404';\n",
    replace: "    null;\n",
  },
  {
    id: "V13", kind: "sql", ac: "AC-VENDOR-07", file: REFUSALS, tests: [VENDOR_DB],
    what: "mark_task_done: відмова з кодом NOT_ALLOWED замість повідомлення AC-TASK-03 у прямій відповіді",
    find: "    raise exception 'Only the task''s assignee, the run manager, or an administrator can mark a task as done'\n",
    replace: "    raise exception 'NOT_ALLOWED'\n",
  },
  {
    id: "V14", kind: "sql", ac: "AC-TASK-19, AC-VENDOR-16", file: REFUSALS, tests: [VENDOR_DB, RUN_TASKS_DB],
    what: "mark_task_done: позначка лише в запуску «in progress» — необов'язкову задачу завершеного запуску не позначити",
    find: "  where id = p_task_id and status = 'to_do';\n",
    replace: "  where id = p_task_id and status = 'to_do'\n    and exists (select 1 from public.runs where id = v_task.run_id and status = 'in_progress');\n",
  },
];

// Приклади з демо (інша схема — у вашому репо цих файлів немає, тож не розкоментовуйте як є):
//
// SQL, межа з AC — діапазон напіввідкритий, останній день заявки не рахується:
//   { id: "L2", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
//     what: "перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець)",
//     find: "pg_catalog.daterange(p_start_date, p_end_date, '[]')",
//     replace: "pg_catalog.daterange(p_start_date, p_end_date, '[)')" },
//
// SQL, політика послаблена до true (а не видалена: без політики RLS забороняє все, і тест відмови лишився б зеленим):
//   { id: "L5", kind: "sql", ac: "передумова AC-LEAVE-04/10", file: LEAVE, tests: [LEAVE_DB],
//     what: "blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору",
//     find: "on public.blocked_days for insert to authenticated\n  with check ((select private.current_app_role()) = 'admin');",
//     replace: "on public.blocked_days for insert to authenticated\n  with check (true);" },
//
// Еквівалентний мутант — лише з reason, що посилається на рядок, який робить його зайвим:
//   { id: "L6", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
//     what: "політика рішень: прибрано role = 'manager'", expect: "survive",
//     reason: "еквівалентний: з 20261018000000_manager_helpers_require_role.sql private.is_division_manager() сама " +
//       "перевіряє current_app_role() = 'manager'", find: "…", replace: "…" },
//
// TS, точковий мутант на межі з AC (повний перебір TS — npm run mutation:ts, Stryker):
//   { id: "T1", kind: "ts", ac: "AC-LEAVE-11", file: "src/lib/leave/calendar.ts", tests: ["tests/leave/calendar.test.ts"],
//     what: "rangesOverlap: <= → <", find: "b.startDate <= a.endDate", replace: "b.startDate < a.endDate" },
