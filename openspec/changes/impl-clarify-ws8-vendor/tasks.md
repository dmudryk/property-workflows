## 1. Уточнення вендора в базі й на сторінках (PR «Реалізація» `task/vendor-clarifications`)

Done when: AC-VENDOR-07, AC-VENDOR-08, AC-VENDOR-11, AC-VENDOR-12, AC-VENDOR-13, AC-VENDOR-14, AC-VENDOR-15,
AC-VENDOR-16, AC-VENDOR-17, AC-VENDOR-18, AC-TASK-19 — «реалізовано» в `docs/conformance.md`; SQL-мутанти KILLED.

- [ ] 1.1 Міграція `…_vendor_refusals.sql`: `private.mark_task_done` — «Run not found» для вендора без задач у запуску,
  текст AC-TASK-03 у відмові (design.md, D1); мутанти V6, V9 на новий файл і нові мутанти.
- [ ] 1.2 Сторінки: заголовок запуску вендора, рядок списку без шаблону, «Profile» у навігації й `/profile`, «Back to
  runs» на сторінках шаблонів (design.md, D2).
- [ ] 1.3 Тести бази й рендеру з AC ID (design.md, D3); `docs/conformance.md`.

## 2. UAT на проді (PR «Реалізація» `task/uat-vendor-clarifications`)

Done when: звіт UAT на проді з PASS на кожен AC задачі 1; archive `impl-clarify-ws8-vendor`.

- [ ] 2.1 Специфікації Playwright на кожен новий AC і оновлені AC-VENDOR-07, AC-VENDOR-08; прогін на проді, звіт і
  відео.
- [ ] 2.2 archive `impl-clarify-ws8-vendor`.
