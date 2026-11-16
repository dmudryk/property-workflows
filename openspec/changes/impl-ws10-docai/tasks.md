## 1. Набір AI, ADR, офлайн golden (PR «Реалізація» `task/ai-kit`, разом із задачею 2)

Done when: AC-DOCAI-01, AC-DOCAI-02, AC-DOCAI-03, AC-DOCAI-04, AC-DOCAI-05, AC-DOCAI-06, AC-DOCAI-07, AC-DOCAI-08,
AC-DOCAI-10 — офлайн-тести зелені в CI; `tests/ai-key.test.ts` зелений.

- [x] 1.1 ADR 0006 і залежності з точними версіями; скрипти `eval`, `ai:models`, `ai:quota`; `OPENROUTER_API_KEY=` у
  `.env.example` (design.md, D6).
- [x] 1.2 Схема, промпт, обгортка, правила коду й збої (design.md, D6–D10).
- [x] 1.3 Кейси PM у `cases.json`, офлайн golden, збої, ін'єкція, межа ключа (design.md, D12).

## 2. Збереження й блок на сторінці запуску (PR «Реалізація» `task/ai-kit`, разом із задачею 1)

Done when: AC-DOCAI-09, AC-DOCAI-11 — тести бази й дій зелені; блок на сторінці показує стани AC-DOCAI-01…08 і
AC-DOCAI-10; `db-deploy` зелений.

- [x] 2.1 Міграція `run_documents` і `save_run_document` (design.md, D3, D4); тести PGlite.
- [x] 2.2 Server Actions (design.md, D5); тести дій.
- [x] 2.3 Блок «Parse a document» і «Saved documents» (design.md, D1, D2); `docs/conformance.md`.

## 3. Живий eval (PR «Реалізація» `task/ai-kit`, разом із задачами 1 і 2)

Done when: AC-DOCAI-01, AC-DOCAI-02, AC-DOCAI-03, AC-DOCAI-04, AC-DOCAI-05, AC-DOCAI-06, AC-DOCAI-07, AC-DOCAI-08 —
живий прогін golden cases GC-01…GC-10 у звіті `evals/reports/<дата>.md` з моделлю на кожен кейс і pass rate;
`recorded.json` без заглушок; кожен FAIL пояснено.

- [x] 3.1 `RECORD=1 npm run eval` (вручну) і звіт.

## 4. Прод і UAT (PR «Реалізація» `task/docai-uat`)

Done when: UAT на проді — AC-DOCAI-09 і AC-DOCAI-07; `docs/conformance.md` з чесними статусами; archive
`impl-ws10-docai`.

- [ ] 4.1 Специфікації Playwright, прогін на проді, звіт `docs/qa/uat/2026-11-16/`.
- [ ] 4.2 archive `impl-ws10-docai`.
