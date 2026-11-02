## 1. Вендор у базі й на сторінках (PR «Реалізація» `task/vendor`)

Done when: AC-VENDOR-01, AC-VENDOR-02, AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06, AC-VENDOR-07,
AC-VENDOR-08, AC-VENDOR-09, AC-VENDOR-10 — «реалізовано» в `docs/conformance.md`; AC-RUN-04 і AC-TASK-08 — зелені.

- [ ] 1.1 Міграція `…_vendor_role.sql`: роль `vendor`, `is_staff`, `staff()`, політика `run_tasks_select_visible`,
  `completes_run` (design.md, D1).
- [ ] 1.2 `supabase/demo-users.json` — `vendor@example.test`; тест бази `tests/db/vendor.test.ts` на кожен AC-VENDOR.
- [ ] 1.3 TypeScript: роль `vendor`, `isVendor` / `canLaunch`, тексти вендора (design.md, D2).
- [ ] 1.4 Сторінки: `/runs`, `/runs/[id]`, шаблони й `/runs/new` — відмова, навігація (design.md, D3); unit / рендер.
- [ ] 1.5 `docs/conformance.md`; archive `impl-ws8-vendor`.
