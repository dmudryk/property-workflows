## 1. Редактор шаблону з версіями (PR «Реалізація» `task/template-versions`)

- [x] 1.1 Тести бази на PGlite: `@electric-sql/pglite@0.5.8` (devDependency), `tests/db/supabase-pglite.ts` з демо
      курсу, адаптований під наш проєкт (+ `asAnon`)
- [x] 1.2 Міграція `…_templates_versions.sql`: `templates.current_version/current_content`, `template_versions`,
      `template_drafts`, `runs.template_version` з RLS, `revoke`, явними `grant` і політикою `select` на кожну таблицю;
      `private.normalize_template_content`, `create_template`, `save_template_draft`, `publish_template_version` +
      обгортки `public.*`; нова `private.launch_run` з поточної версії; перенесення у версію 1 і `drop` старих таблиць
      шаблонів (R1–R4); `src/lib/supabase/database.types.ts`
- [x] 1.3 `src/lib/templates/content.ts` (операції редактора, «є обов'язкова задача»), `src/lib/templates/format.ts`
      (DD.MM.YYYY HH:MM за Києвом) з тестами
- [x] 1.4 `src/lib/auth/actor.ts` (`requireActor` з `getClaims()` і роллю з `profiles`), `NotEnoughRights`, «Templates»
      у навігації `AppShell`
- [x] 1.5 Сторінки `/templates`, `/templates/new`, `/templates/[id]`, `/templates/[id]/edit` (редактор з
      автозбереженням), `/templates/[id]/versions`; дії `createTemplate`, `saveDraft`, `publishVersion`; `/runs/new` —
      поточна версія; `/runs/[id]` — «Template version N» (U1–U3)
- [x] 1.6 Тести бази `tests/db/templates.test.ts` на AC-EDITOR-01…09 і AC-DSYS-02 (відмова й незмінні дані)
- [x] 1.7 Мутаційна перевірка: таблиця «AC → що прибрали → який тест упав» для кожного відмовного AC; червоні прогони
      CI для AC-EDITOR-08 і AC-EDITOR-07, потім revert
- [x] 1.8 ADR `docs/decisions/0002-…` про модель версій і незбережених змін; рядки `docs/conformance.md`

Done when: AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-05, AC-EDITOR-06, AC-EDITOR-07,
AC-EDITOR-08, AC-EDITOR-09, AC-DSYS-02

## 2. Стани дизайн-системи (PR «Реалізація» `task/design-states`)

- [ ] 2.1 `/runs`: порожній стан «No runs yet. Launch a template to start one.» + «Launch a template», без таблиці;
      вибір стану — чиста функція (U3)
- [ ] 2.2 Тести: статуси «in progress»/«completed» — ті самі слова й токени кольору на списку й сторінці запуску;
      сторінка входу в `AppShell` без даних; відвідувач без входу не читає запуски (тест бази) і потрапляє на `/login`
- [ ] 2.3 Архітектурне правило «запис лише через функції бази» (`scripts/check-writes-via-rpc.mjs`, третій job у
      `.github/workflows/architecture.yml`) і доказ, що воно ловить порушення (червоний прогін, потім revert)
- [ ] 2.4 Скріни за ролями (`docs/img/ws7-role-*`), рядки `docs/conformance.md`; archive `impl-ws7-templates`

Done when: AC-DSYS-01, AC-DSYS-03, AC-DSYS-04
