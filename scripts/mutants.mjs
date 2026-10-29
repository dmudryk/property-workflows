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
const TEMPLATES = "supabase/migrations/20261026175944_templates_versions.sql";
const TEMPLATES_DB = "tests/db/templates.test.ts";

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
